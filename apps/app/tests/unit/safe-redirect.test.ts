import { describe, expect, it } from 'vitest';

import { safeInternalPath } from '@/lib/safe-redirect';

const ORIGIN = 'https://app.goalspace.com';

describe('safeInternalPath', () => {
  it('keeps a plain internal path', () => {
    expect(safeInternalPath('/projects/bandsaw-mill', ORIGIN)).toBe('/projects/bandsaw-mill');
  });

  it('keeps the query string and fragment', () => {
    expect(safeInternalPath('/projects/x/log?kind=decision#top', ORIGIN)).toBe(
      '/projects/x/log?kind=decision#top'
    );
  });

  it('falls back to root for empty input', () => {
    expect(safeInternalPath(null, ORIGIN)).toBe('/');
    expect(safeInternalPath(undefined, ORIGIN)).toBe('/');
    expect(safeInternalPath('', ORIGIN)).toBe('/');
  });

  it('rejects an absolute URL to another origin', () => {
    expect(safeInternalPath('https://evil.com/steal', ORIGIN)).toBe('/');
  });

  it('rejects a protocol-relative URL', () => {
    // Browsers treat //host as protocol-relative, so this leaves the origin.
    expect(safeInternalPath('//evil.com', ORIGIN)).toBe('/');
  });

  it('rejects a backslash-prefixed protocol-relative URL', () => {
    // The URL parser normalises backslashes to forward slashes.
    expect(safeInternalPath('/\\evil.com', ORIGIN)).toBe('/');
    expect(safeInternalPath('\\\\evil.com', ORIGIN)).toBe('/');
  });

  it('rejects a protocol-relative URL hidden behind a control character', () => {
    // The gap in a prefix-only check: this starts with "/" and not with "//",
    // so a startsWith test passes it, but browsers strip the newline while
    // parsing and the result resolves with evil.com as the host.
    expect(safeInternalPath('/\n//evil.com', ORIGIN)).toBe('/');
    expect(safeInternalPath('/\t//evil.com', ORIGIN)).toBe('/');
    expect(safeInternalPath('/\r//evil.com', ORIGIN)).toBe('/');
  });

  it('rejects a scheme that is not http', () => {
    expect(safeInternalPath('javascript:alert(1)', ORIGIN)).toBe('/');
    expect(safeInternalPath('data:text/html,<script>', ORIGIN)).toBe('/');
  });

  it('rejects an absolute URL even when it points at the same origin', () => {
    // Nothing needs to pass a fully-qualified URL, and accepting one widens
    // the surface for no benefit.
    expect(safeInternalPath(`${ORIGIN}/projects/x`, ORIGIN)).toBe('/projects/x');
  });

  it('rejects a path that does not start with a slash', () => {
    expect(safeInternalPath('projects/x', ORIGIN)).toBe('/');
  });

  it('falls back to root when the origin itself is unusable', () => {
    expect(safeInternalPath('/projects/x', 'not-a-url')).toBe('/');
  });
});
