import { describe, expect, it } from 'vitest';

import { destinationsFor, isActive, projectSlugFrom } from '@/lib/shell/destinations';

describe('projectSlugFrom', () => {
  it('reads the slug out of a project path', () => {
    expect(projectSlugFrom('/projects/ev-bike')).toBe('ev-bike');
    expect(projectSlugFrom('/projects/ev-bike/log')).toBe('ev-bike');
  });

  it('does not treat /projects/new as a slug', () => {
    // A recorded bug in the previous shell: matching the segment alone made
    // "new" look like a project and rendered nav pointing at
    // /projects/new/work and /projects/new/log, neither of which exists.
    expect(projectSlugFrom('/projects/new')).toBeNull();
  });

  it('returns null off the project tree', () => {
    expect(projectSlugFrom('/')).toBeNull();
    expect(projectSlugFrom('/settings')).toBeNull();
  });

  it('decodes an escaped slug', () => {
    // Slugs are Unicode-aware, so a zh title produces percent-encoded path
    // segments that must survive the round trip.
    expect(projectSlugFrom('/projects/%E6%9C%BA%E5%99%A8%E4%BA%BA')).toBe('机器人');
  });
});

describe('destinationsFor', () => {
  it('ships exactly the sections that exist', () => {
    // Nothing is advertised that cannot be opened.
    const keys = destinationsFor('ev-bike', { inbox: 0 }).map((d) => d.key);
    expect(keys).toEqual(['resume', 'work', 'log', 'inbox', 'documents', 'agents', 'settings']);
  });

  it('keeps Documents after Inbox, and gives it no count', () => {
    // Documents has no pending state to report. A count here would be a number
    // with nothing to mean.
    const documents = destinationsFor('ev-bike', { inbox: 3 }).find((d) => d.key === 'documents');
    expect(documents!.count).toBeUndefined();
    expect(documents!.href).toBe('/projects/ev-bike/documents');
    expect(documents!.exact).toBe(false);
  });

  it('points every destination at the given project', () => {
    for (const d of destinationsFor('ev-bike', { inbox: 0 })) {
      expect(d.href.startsWith('/projects/ev-bike')).toBe(true);
    }
  });

  it('omits the count entirely when it is zero', () => {
    // A badge reading "0" is noise. An empty inbox is the normal state.
    const inbox = destinationsFor('ev-bike', { inbox: 0 }).find((d) => d.key === 'inbox');
    expect(inbox!.count).toBeUndefined();
  });

  it('carries the count when there is one', () => {
    const inbox = destinationsFor('ev-bike', { inbox: 3 }).find((d) => d.key === 'inbox');
    expect(inbox!.count).toBe(3);
  });
});

describe('isActive', () => {
  const dests = destinationsFor('ev-bike', { inbox: 0 });
  const resume = dests.find((d) => d.key === 'resume')!;
  const log = dests.find((d) => d.key === 'log')!;

  it('matches Resume only exactly', () => {
    // Resume is the project root. A prefix match would light it up on every
    // page in the project.
    expect(isActive('/projects/ev-bike', resume)).toBe(true);
    expect(isActive('/projects/ev-bike/log', resume)).toBe(false);
  });

  it('matches a section on its subtree', () => {
    expect(isActive('/projects/ev-bike/log', log)).toBe(true);
    expect(isActive('/projects/ev-bike/log?kind=decision', log)).toBe(true);
  });

  it('does not match a sibling whose name shares a prefix', () => {
    // /work must not light up for a future /workspaces route.
    const work = dests.find((d) => d.key === 'work')!;
    expect(isActive('/projects/ev-bike/workspaces', work)).toBe(false);
  });

  describe('with the trailing slash next.config.js actually produces', () => {
    // apps/app/next.config.js sets `trailingSlash: true`, so usePathname()
    // returns paths like `/projects/ev-bike/`, not `/projects/ev-bike`. These
    // are the shapes the app actually produces at runtime — the tests above,
    // which all use paths without a trailing slash, missed the regression
    // where Resume's exact match never lit up.
    it('matches Resume at the trailing-slash root path', () => {
      expect(isActive('/projects/ev-bike/', resume)).toBe(true);
    });

    it('still does not match Resume off the root', () => {
      expect(isActive('/projects/ev-bike/log/', resume)).toBe(false);
    });

    it('matches a section on its trailing-slash subtree', () => {
      expect(isActive('/projects/ev-bike/log/', log)).toBe(true);
    });

    it('still does not match a sibling whose name shares a prefix', () => {
      const work = dests.find((d) => d.key === 'work')!;
      expect(isActive('/projects/ev-bike/workspaces/', work)).toBe(false);
    });
  });
});

describe('the agents destination', () => {
  it('sits after documents in the sidebar', () => {
    const keys = destinationsFor('robot', { inbox: 0 }).map((d) => d.key);
    expect(keys).toEqual(['resume', 'work', 'log', 'inbox', 'documents', 'agents', 'settings']);
  });

  it('is active on the agent editor, not only on the list', () => {
    // isActive takes (pathname, destination) in that order, and pathname
    // arrives from usePathname() with a trailing slash because next.config.js
    // sets trailingSlash: true. Both are why this is asserted rather than
    // assumed — the same pairing broke Resume's active state in slice A.
    const agents = destinationsFor('robot', { inbox: 0 }).find((d) => d.key === 'agents')!;
    expect(isActive('/projects/robot/agents/', agents)).toBe(true);
    expect(isActive('/projects/robot/agents/abc-123/', agents)).toBe(true);
  });

  it('is not active on a run trace, which is reached from an agent but is not one', () => {
    const agents = destinationsFor('robot', { inbox: 0 }).find((d) => d.key === 'agents')!;
    expect(isActive('/projects/robot/runs/abc-123/', agents)).toBe(false);
  });
});

describe('the settings destination', () => {
  it('comes last, after the sections', () => {
    const keys = destinationsFor('robot', { inbox: 0 }).map((d) => d.key);
    expect(keys).toEqual(['resume', 'work', 'log', 'inbox', 'documents', 'agents', 'settings']);
  });

  it('is marked trailing, so the sidebar can rule it off from the sections', () => {
    // The spec's sidebar sketch puts a rule above Settings: it is project
    // scope, not a section of the record. The flag carries that rather than
    // the sidebar hardcoding a key name.
    const all = destinationsFor('robot', { inbox: 0 });
    expect(all.filter((d) => d.trailing).map((d) => d.key)).toEqual(['settings']);
  });

  it('is active on the settings route', () => {
    const settings = destinationsFor('robot', { inbox: 0 }).find((d) => d.key === 'settings')!;
    expect(isActive('/projects/robot/settings/', settings)).toBe(true);
    expect(isActive('/projects/robot/documents/', settings)).toBe(false);
  });
});
