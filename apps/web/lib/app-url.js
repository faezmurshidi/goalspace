'use strict';

/**
 * Resolves the URL of the companion app (`apps/app`) that this landing site
 * links to for Sign In, Sign Up, and every call to action.
 *
 * CommonJS on purpose: `next.config.js` is CJS and requires this at
 * config-load time. That is the one place worth enforcing, because the `env`
 * block there performs a *static replacement* — by the time a component runs,
 * `process.env.NEXT_PUBLIC_APP_URL` has already been substituted with whatever
 * string this function returned during the build. A component-level fallback
 * can therefore never fire, which is precisely how a production deploy shipped
 * links pointing at http://localhost:3001: the variable was unset in Vercel,
 * next.config.js quietly substituted the dev default, and nothing complained
 * until a visitor clicked Sign In and was sent to their own machine.
 *
 * So: fail the build instead. A missing app URL is a deployment
 * misconfiguration, and the cheapest place to learn about it is the build log.
 */

const LOCAL_APP_URL = 'http://localhost:3001';

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
function resolveAppUrl(env = process.env) {
  const raw = typeof env.NEXT_PUBLIC_APP_URL === 'string' ? env.NEXT_PUBLIC_APP_URL.trim() : '';

  if (!raw) {
    // `next build` sets NODE_ENV=production, so this covers Vercel production
    // and preview builds alike. `next dev` does not, which keeps a fresh
    // checkout runnable with no configuration.
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_APP_URL is not set. This environment variable must point at the ' +
          'deployed app (for example https://goalspace-43ru.vercel.app) for any production ' +
          'build, because every Sign In, Sign Up, and call-to-action link on the landing ' +
          'page is built from it.\n' +
          '  - Vercel: add it under Settings -> Environment Variables, then redeploy.\n' +
          '  - Local production build: set it in apps/web/.env.local.\n' +
          `Only a development build may omit it, in which case it defaults to ${LOCAL_APP_URL}.`
      );
    }
    return LOCAL_APP_URL;
  }

  // A malformed value fails exactly as invisibly as a missing one — the links
  // are built by string concatenation, so anything that is not an absolute URL
  // produces a broken href that nothing notices until it is clicked.
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_APP_URL is not a valid absolute URL (received ${JSON.stringify(raw)}). ` +
        'This environment variable needs a full origin including the scheme, ' +
        'for example https://goalspace-43ru.vercel.app'
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `NEXT_PUBLIC_APP_URL must use http or https (received ${JSON.stringify(parsed.protocol)}). ` +
        'This environment variable is used to build links to the app.'
    );
  }

  return raw;
}

module.exports = { resolveAppUrl, LOCAL_APP_URL };
