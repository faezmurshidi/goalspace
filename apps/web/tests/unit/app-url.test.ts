// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { appHref, normalizeAppUrl, resolveAppUrl } from '@/lib/app-url';

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

describe('resolveAppUrl', () => {
  it('returns the configured URL when one is set', () => {
    expect(
      resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'https://app.example.com', NODE_ENV: 'production' })
    ).toBe('https://app.example.com');
  });

  // The regression this guards. A production build with no APP_URL used to
  // silently fall back to http://localhost:3001, shipping a marketing page
  // whose Sign In, Sign Up, and every CTA pointed at the visitor's own machine.
  it('throws on a production build when the variable is unset', () => {
    expect(() => resolveAppUrl({ NODE_ENV: 'production' })).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it('throws on a production build when the variable is empty or blank', () => {
    expect(() => resolveAppUrl({ NEXT_PUBLIC_APP_URL: '', NODE_ENV: 'production' })).toThrow(
      /NEXT_PUBLIC_APP_URL/
    );
    expect(() => resolveAppUrl({ NEXT_PUBLIC_APP_URL: '   ', NODE_ENV: 'production' })).toThrow(
      /NEXT_PUBLIC_APP_URL/
    );
  });

  it('names the variable and how to set it, so the build log is actionable', () => {
    let message = '';
    try {
      resolveAppUrl({ NODE_ENV: 'production' });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('NEXT_PUBLIC_APP_URL');
    expect(message).toMatch(/environment variable/i);
  });

  // Dev must keep working with no configuration at all, otherwise every
  // contributor has to set a variable before `next dev` will run.
  it('falls back to the local app port outside production', () => {
    expect(resolveAppUrl({ NODE_ENV: 'development' })).toBe('http://localhost:3001');
    expect(resolveAppUrl({})).toBe('http://localhost:3001');
  });

  it('still honours an explicit URL outside production', () => {
    expect(
      resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:4000', NODE_ENV: 'development' })
    ).toBe('http://localhost:4000');
  });

  // The reconciliation between the two halves of this module: a scheme-less
  // host is the normal shape of a value copied out of the Vercel dashboard,
  // so the guard must repair it rather than reject it.
  it('accepts a scheme-less host and repairs it, rather than failing the build', () => {
    expect(
      resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'goalspace-43ru.vercel.app', NODE_ENV: 'production' })
    ).toBe('https://goalspace-43ru.vercel.app');
  });

  it('applies the same trailing-slash and whitespace cleanup as a render does', () => {
    expect(
      resolveAppUrl({
        NEXT_PUBLIC_APP_URL: '  https://app.example.com/  ',
        NODE_ENV: 'production',
      })
    ).toBe('https://app.example.com');
  });

  // A typo is as invisible as a missing value, so it fails in every
  // environment rather than only in production.
  it('rejects a value that cannot be made into a URL', () => {
    expect(() =>
      resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'not a url', NODE_ENV: 'development' })
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it('rejects a scheme that is not http or https', () => {
    expect(() =>
      resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'ftp://app.example.com', NODE_ENV: 'production' })
    ).toThrow(/http or https/);
  });
});

describe('next.config.js', () => {
  // The guard only guards while nothing upstream of it supplies a default.
  // Re-adding NEXT_PUBLIC_APP_URL to the `env` block would substitute a value
  // before lib/app-url.ts ever sees the variable, and resolveAppUrl would
  // dutifully validate the localhost fallback it was handed.
  it('does not substitute a default for NEXT_PUBLIC_APP_URL', () => {
    const config = readFileSync(new URL('../../next.config.js', import.meta.url), 'utf8');
    const envBlock = config.slice(config.indexOf('env: {'), config.indexOf('async headers()'));

    expect(envBlock).not.toContain('NEXT_PUBLIC_APP_URL');
  });
});
