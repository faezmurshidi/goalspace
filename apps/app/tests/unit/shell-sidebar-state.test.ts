import { describe, expect, it } from 'vitest';

import {
  SIDEBAR_COOKIE,
  parseSidebarState,
  serializeSidebarState,
} from '@/lib/shell/sidebar-state';

describe('parseSidebarState', () => {
  it('defaults to open when no cookie has been set', () => {
    // First visit shows the nav. A shell that starts collapsed hides every
    // destination from someone who has not learned the rail yet.
    expect(parseSidebarState(undefined)).toBe(true);
  });

  it('reads both states back', () => {
    expect(parseSidebarState('true')).toBe(true);
    expect(parseSidebarState('false')).toBe(false);
  });

  it('falls back to open on anything it does not recognise', () => {
    // The cookie is client-writable. Garbage must not produce a collapsed
    // shell the user cannot explain.
    expect(parseSidebarState('')).toBe(true);
    expect(parseSidebarState('yes')).toBe(true);
  });

  it('round-trips through serialize', () => {
    // The server reads what the client wrote. A mismatch here means the first
    // paint disagrees with the stored state and the sidebar visibly jumps.
    expect(parseSidebarState(serializeSidebarState(false))).toBe(false);
    expect(parseSidebarState(serializeSidebarState(true))).toBe(true);
  });
});

describe('SIDEBAR_COOKIE', () => {
  it('is namespaced to the product', () => {
    // Shared with apps/web on the same apex domain in production.
    expect(SIDEBAR_COOKIE.startsWith('goalspace.')).toBe(true);
  });
});
