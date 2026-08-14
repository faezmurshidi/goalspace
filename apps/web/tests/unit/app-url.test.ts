import { describe, expect, it } from 'vitest';
// Required rather than imported: `next.config.js` is CommonJS and consumes this
// same module at config-load time, which is the only point where the value is
// actually inlined into the bundle. Testing what next.config.js really calls
// beats testing a parallel TypeScript copy of the same logic.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveAppUrl } = require('../../lib/app-url.js');

describe('resolveAppUrl', () => {
  it('returns the configured URL when one is set', () => {
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'https://app.example.com', NODE_ENV: 'production' })).toBe(
      'https://app.example.com'
    );
  });

  // The regression this guards. A production build with no APP_URL used to
  // silently fall back to http://localhost:3001, shipping a landing page whose
  // Sign In, Sign Up, and every CTA pointed at the visitor's own machine.
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
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'http://localhost:4000', NODE_ENV: 'development' })).toBe(
      'http://localhost:4000'
    );
  });

  // A malformed value fails the same way an unset one does: links built from it
  // are broken, and the failure is invisible until someone clicks.
  it('rejects a value that is not a valid absolute URL', () => {
    expect(() => resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'app.example.com', NODE_ENV: 'production' })).toThrow(
      /NEXT_PUBLIC_APP_URL/
    );
  });

  it('trims surrounding whitespace from an otherwise valid value', () => {
    expect(
      resolveAppUrl({ NEXT_PUBLIC_APP_URL: '  https://app.example.com  ', NODE_ENV: 'production' })
    ).toBe('https://app.example.com');
  });
});
