import { describe, expect, it } from 'vitest';

import { REGISTRY, REPO_READ, isAllowed, resolveTools } from '@/lib/agents/tools/registry';

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
  it('ships no write tools in phase 2a', () => {
    for (const def of Object.values(REGISTRY)) expect(def.writes).toBe(false);
  });

  it('never accepts a project_id from the model', () => {
    for (const def of Object.values(REGISTRY)) {
      const shape = (def.inputSchema as { shape?: Record<string, unknown> }).shape ?? {};
      expect(Object.keys(shape)).not.toContain('project_id');
    }
  });
});
