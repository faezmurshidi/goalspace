// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { appHref, normalizeAppUrl } from '@/lib/app-url';

describe('normalizeAppUrl', () => {
  it('leaves an absolute URL alone', () => {
    expect(normalizeAppUrl('https://app.goalspace.com')).toBe('https://app.goalspace.com');
  });

  // The production bug: Vercel's own VERCEL_URL is scheme-less, so a value
  // copied from it lands here without a protocol. Interpolated raw, it made
  // `${APP_URL}/login` a *relative* path, and every auth link on the
  // marketing site resolved to /en/goalspace-43ru.vercel.app/login.
  it('adds https to a scheme-less host', () => {
    expect(normalizeAppUrl('goalspace-43ru.vercel.app')).toBe('https://goalspace-43ru.vercel.app');
  });

  it('adds http, not https, to a scheme-less localhost so dev still works', () => {
    expect(normalizeAppUrl('localhost:3001')).toBe('http://localhost:3001');
    expect(normalizeAppUrl('127.0.0.1:3001')).toBe('http://127.0.0.1:3001');
  });

  it('strips a trailing slash so joins do not double up', () => {
    expect(normalizeAppUrl('https://app.goalspace.com/')).toBe('https://app.goalspace.com');
    expect(normalizeAppUrl('goalspace-43ru.vercel.app/')).toBe('https://goalspace-43ru.vercel.app');
  });

  it('falls back to local dev when unset or blank', () => {
    expect(normalizeAppUrl(undefined)).toBe('http://localhost:3001');
    expect(normalizeAppUrl('')).toBe('http://localhost:3001');
    expect(normalizeAppUrl('   ')).toBe('http://localhost:3001');
  });
});

describe('appHref', () => {
  it('produces an absolute URL for an app path', () => {
    expect(appHref('/login')).toMatch(/^https?:\/\/[^/]+\/login$/);
  });

  it('produces a bare origin for the root', () => {
    expect(appHref('/')).toMatch(/^https?:\/\/[^/]+$/);
  });
});

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.turbo') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe('cross-app links', () => {
  // The bug shipped in four CTAs at once because each component read the env
  // var itself. One reader, one normalization, one place to get it wrong.
  it('are built through lib/app-url, never from the raw env var', () => {
    const root = new URL('../../', import.meta.url).pathname;
    const offenders = [join(root, 'components'), join(root, 'app')]
      .flatMap((dir) => sourceFiles(dir))
      .filter((file) => readFileSync(file, 'utf8').includes('NEXT_PUBLIC_APP_URL'))
      .map((file) => file.slice(root.length));

    expect(offenders).toEqual([]);
  });
});
