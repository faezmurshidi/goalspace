import { describe, expect, it } from 'vitest';

import { isAllowed, REGISTRY, REPO_READ, resolveTools } from '@/lib/agents/tools/registry';

describe('resolveTools', () => {
  it('returns only the intersection of registry and allowlist', () => {
    const names = resolveTools(['search_repo', 'read_document']).map((t) => t.name);
    expect(names.sort()).toEqual(['read_document', 'search_repo']);
  });

  it('silently drops an allowlist entry that is not a real tool', () => {
    expect(resolveTools(['search_repo', 'not_a_tool']).map((t) => t.name)).toEqual(['search_repo']);
  });

  it('returns nothing for an empty allowlist', () => {
    expect(resolveTools([])).toEqual([]);
  });

  it('never returns a tool merely because it exists in the registry', () => {
    expect(resolveTools(['search_repo']).map((t) => t.name)).not.toContain('list_entries');
  });
});

describe('isAllowed', () => {
  it('is false for a tool outside the allowlist', () => {
    expect(isAllowed(['search_repo'], 'read_document')).toBe(false);
  });

  it('is false for a tool that is not in the registry at all', () => {
    expect(isAllowed(['web_search'], 'web_search')).toBe(false);
  });

  it('is true only for a registry tool that is also allowlisted', () => {
    expect(isAllowed(['search_repo'], 'search_repo')).toBe(true);
  });
});

describe('REPO_READ', () => {
  it('contains no write tools', () => {
    for (const name of REPO_READ) expect(REGISTRY[name].writes).toBe(false);
  });

  it('contains nothing that leaves the system', () => {
    for (const name of REPO_READ) expect(REGISTRY[name].external).toBe(false);
  });
});

describe('REGISTRY', () => {
  it('ships no tool that mutates the record directly', () => {
    // This replaces phase 2a's "no write tools at all", which the propose_*
    // tools made obsolete. The invariant that survives is the one that
    // mattered: a `writes` tool emits a proposal, so there is still no path
    // from a model to a row in entries, work_items, or documents.
    for (const def of Object.values(REGISTRY)) {
      // 'records' writes to the log directly and is deliberately not named
      // propose_*, because it does not propose. The check is on the category
      // rather than on truthiness, which record_entry would silently fail.
      if (def.writes === 'proposes') expect(def.name.startsWith('propose_')).toBe(true);
      if (def.writes === 'records') expect(def.name.startsWith('propose_')).toBe(false);
    }
  });

  it('never accepts a project_id from the model', () => {
    for (const def of Object.values(REGISTRY)) {
      const shape = (def.inputSchema as { shape?: Record<string, unknown> }).shape ?? {};
      expect(Object.keys(shape)).not.toContain('project_id');
    }
  });
});

describe('read_entry', () => {
  it('is a read, not a write, and stays inside the system', () => {
    // REPO_READ and WRITE_TOOLS are disjoint by construction, which is what
    // lets the Critic be described as writing nothing and have that be
    // checkable. A read tool filed wrongly would quietly widen it.
    expect(REGISTRY.read_entry.writes).toBe(false);
    expect(REGISTRY.read_entry.external).toBe(false);
  });

  it('belongs to the repo-read group', () => {
    // An id is worth having only if something takes one. Entries were already
    // readable in bulk through list_entries, which returns full bodies — what
    // was missing was any operation that accepts an id, so an agent handed one
    // by a citation or a proposal had nowhere to spend it.
    expect(REPO_READ).toContain('read_entry');
  });

  it('takes a uuid and nothing else', () => {
    const schema = REGISTRY.read_entry.inputSchema;
    expect(schema.safeParse({ id: '11111111-1111-4111-8111-111111111111' }).success).toBe(true);
    expect(schema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });
});
