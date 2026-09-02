import type { SupabaseClient } from '@supabase/supabase-js';

import type { Citation } from '@/lib/schemas/proposal';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type CitationCheck = { ok: true } | { ok: false; missing: Citation[] };

interface Grouped {
  entries: string[];
  work_items: string[];
  documents: string[];
}

/** Pure: citation list → the ids to look for in each table, de-duplicated. */
export function groupCitations(citations: Citation[]): Grouped {
  const grouped: Grouped = { entries: [], work_items: [], documents: [] };
  const seen = new Set<string>();

  for (const citation of citations) {
    const key = `${citation.type}:${citation.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (citation.type === 'entry') grouped.entries.push(citation.id);
    else if (citation.type === 'work_item') grouped.work_items.push(citation.id);
    else grouped.documents.push(citation.id);
  }

  return grouped;
}

const TABLE_FOR = {
  entry: 'entries',
  work_item: 'work_items',
  document: 'documents',
} as const;

/**
 * Every cited id must exist and belong to this project.
 *
 * Called before a proposal is stored, so a model that invents an id gets an
 * error and a chance to correct itself rather than producing a suggestion
 * whose provenance looks solid and is not. The project filter is what stops a
 * citation reaching across projects; RLS already prevents reading the row, so
 * a cross-project id simply fails to resolve.
 */
export async function resolveCitations(
  supabase: Client,
  projectId: string,
  citations: Citation[]
): Promise<CitationCheck> {
  if (citations.length === 0) return { ok: true };

  const grouped = groupCitations(citations);
  const found = new Set<string>();

  const lookups: Array<[keyof Grouped, 'entries' | 'work_items' | 'documents']> = [
    ['entries', 'entries'],
    ['work_items', 'work_items'],
    ['documents', 'documents'],
  ];

  for (const [bucket, table] of lookups) {
    const ids = grouped[bucket];
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('project_id', projectId)
      .in('id', ids);

    if (error) throw error;
    for (const row of data ?? []) found.add(`${table}:${(row as { id: string }).id}`);
  }

  const missing = citations.filter(
    (citation) => !found.has(`${TABLE_FOR[citation.type]}:${citation.id}`)
  );

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
