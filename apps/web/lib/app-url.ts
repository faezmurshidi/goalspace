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
 * Read as a literal so Next.js can inline it into the client bundle at build
 * time; destructuring `process.env` here would defeat that substitution.
 */
export const APP_URL = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);

/** Absolute URL for a path in the workspace app. `appHref('/')` is the origin. */
export function appHref(path: string): string {
  if (!path || path === '/') return APP_URL;
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
