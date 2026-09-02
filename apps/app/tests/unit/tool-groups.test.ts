import { describe, expect, it } from 'vitest';

import { toolGroups } from '@/lib/agents/tool-groups';
import { REGISTRY_NAMES } from '@/lib/agents/tools/registry';

describe('toolGroups', () => {
  it('returns the three groups in a fixed order', () => {
    expect(toolGroups().map((g) => g.key)).toEqual(['reads', 'proposes', 'external']);
  });

  it('files every registered tool into exactly one group', () => {
    const filed = toolGroups().flatMap((g) => g.tools.map((t) => t.name));
    expect([...filed].sort()).toEqual([...REGISTRY_NAMES].sort());
    expect(new Set(filed).size).toBe(filed.length);
  });

  it('separates reads from proposals by the registry flag, not by name', () => {
    const groups = Object.fromEntries(toolGroups().map((g) => [g.key, g.tools.map((t) => t.name)]));
    expect(groups.reads).toContain('search_repo');
    expect(groups.reads).toContain('read_document');
    expect(groups.proposes).toContain('propose_entry');
    expect(groups.proposes).toContain('propose_document_edit');
    expect(groups.reads).not.toContain('propose_entry');
  });

  it('keeps the external group present but empty until a tool leaves the system', () => {
    // web_search and generate_audio will land here. The group renders as an
    // explicit "none yet" rather than disappearing, so the boundary is visible
    // before anything crosses it.
    const external = toolGroups().find((g) => g.key === 'external');
    expect(external).toBeDefined();
    expect(external!.tools).toEqual([]);
  });

  it('preserves registry order within a group', () => {
    const reads = toolGroups()
      .find((g) => g.key === 'reads')!
      .tools.map((t) => t.name);
    const expected = REGISTRY_NAMES.filter((n) => reads.includes(n));
    expect(reads).toEqual(expected);
  });

  it('gives every group a translation key and only the writing group a note', () => {
    const groups = toolGroups();
    expect(groups.every((g) => g.labelKey.startsWith('app.agents.tools.'))).toBe(true);
    expect(groups.find((g) => g.key === 'proposes')!.noteKey).toBe('app.agents.tools.proposesNote');
    expect(groups.find((g) => g.key === 'reads')!.noteKey).toBeUndefined();
  });
});
