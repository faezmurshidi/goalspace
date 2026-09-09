/**
 * Where the workspace application lives, as seen from the marketing site.
 *
 * `NEXT_PUBLIC_APP_URL` is configuration, and configuration arrives dirty. The
 * specific way it arrives dirty on Vercel is without a protocol: `VERCEL_URL`
 * and the deployment URLs shown in the dashboard are both bare hosts, so a
 * value copied from either reads `goalspace-43ru.vercel.app`. Interpolated
 * straight into an href that is a *relative path*, and every "Sign in" on the
 * marketing site quietly resolves to /en/goalspace-43ru.vercel.app/login.
 *
 * So the value is normalized once, here, and components ask for a href rather
 * than reading the variable. A test asserts they keep doing that.
 */

const FALLBACK = 'http://localhost:3001';

/** `scheme://` — not merely a colon, or `localhost:3001` would parse as one. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Loopback gets http: there is no certificate for localhost in development. */
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i;

export function normalizeAppUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return FALLBACK;

  const withScheme = HAS_SCHEME.test(value)
    ? value
    : `${LOOPBACK.test(value) ? 'http' : 'https'}://${value}`;

  // Trailing slash removed so `${APP_URL}/login` cannot become `//login`,
  // which browsers read as a protocol-relative URL to the host "login".
  return withScheme.replace(/\/+$/, '');
}

/**
 * The same value, but resolved strictly — this is the one the app actually
 * uses, and the difference is that it may refuse.
 *
 * `NEXT_PUBLIC_*` variables are inlined into the bundle at build time, so an
 * unset value becomes a *baked-in* fallback rather than something a render can
 * notice and complain about. That is how production once shipped links
 * pointing at http://localhost:3001: the variable was unset in Vercel, a
 * default was substituted, and nothing complained until a visitor clicked
 * Sign In and was sent to their own machine.
 *
 * So a missing value fails the build instead. This module is evaluated while
 * the marketing pages are statically generated, which makes the throw a build
 * error — a deployment misconfiguration, reported in the build log where it is
 * cheapest to learn about. `next build` sets NODE_ENV=production, covering
 * Vercel production and preview builds alike; `next dev` does not, which keeps
 * a fresh checkout runnable with no configuration at all.
 *
 * Once a build succeeds the value is a literal in the bundle, so the same call
 * on the client re-derives what the build already validated and cannot throw.
 */
type AppUrlEnv = { NEXT_PUBLIC_APP_URL?: string; NODE_ENV?: string };

/**
 * Takes its environment as an argument rather than reading `process.env`, so
 * that callers are forced into the literal member-expression form Next.js can
 * inline — and so the failure modes are testable without mutating the process.
 */
export function resolveAppUrl(env: AppUrlEnv): string {
  const raw = env.NEXT_PUBLIC_APP_URL?.trim() ?? '';

  if (!raw) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_APP_URL is not set. This environment variable must point at the ' +
          'deployed app (for example https://goalspace-43ru.vercel.app) for any production ' +
          'build, because every Sign In, Sign Up, and call-to-action link on the marketing ' +
          'site is built from it.\n' +
          '  - Vercel: add it under Settings -> Environment Variables, then redeploy.\n' +
          '  - Local production build: set it in apps/web/.env.local.\n' +
          `Only a development build may omit it, in which case it defaults to ${FALLBACK}.`
      );
    }
    return FALLBACK;
  }

  // A bare host is not malformed — it is the single most common way this value
  // arrives, and `normalizeAppUrl` exists to repair exactly that. Validate the
  // repaired value, so `goalspace-43ru.vercel.app` passes and `not a url` does
  // not. A typo fails the same way a missing value does: links built from it
  // are broken, and the failure is invisible until someone clicks. That is
  // worth stopping a dev server for too, so this half does not check NODE_ENV.
  const normalized = normalizeAppUrl(raw);

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_APP_URL is not a usable URL (received ${JSON.stringify(raw)}). ` +
        'It needs a host, optionally with a scheme — for example ' +
        'goalspace-43ru.vercel.app or https://goalspace-43ru.vercel.app'
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `NEXT_PUBLIC_APP_URL must use http or https (received ${JSON.stringify(parsed.protocol)}). ` +
        'It is used to build links to the app.'
    );
  }

  return normalized;
}

/**
 * Each variable is read as a literal `process.env.X` member expression, which
 * is the only form Next.js substitutes at build time — handing `process.env`
 * itself to `resolveAppUrl` would leave nothing to inline and the value would
 * come back undefined in the browser.
 */
export const APP_URL = resolveAppUrl({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
});

/** Absolute URL for a path in the workspace app. `appHref('/')` is the origin. */
export function appHref(path: string): string {
  if (!path || path === '/') return APP_URL;
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
