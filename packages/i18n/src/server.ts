import { defaultLocale, type Locale } from './locales';
import en from './locales/en.json';
import ms from './locales/ms.json';
import zh from './locales/zh.json';

/**
 * A translator for React Server Components.
 *
 * `useAppTranslations` is a hook, so it only works inside client components.
 * Pushing every date and label into a client component to get translated text
 * would either flash untranslated markup on first paint or force the whole
 * workspace across the client boundary. This resolves the same JSON bundles
 * synchronously on the server instead.
 *
 * Deliberately not i18next itself: the singleton carries mutable global
 * language state, and on a server one request's `changeLanguage` would leak
 * into another's render.
 */
const bundles: Record<Locale, unknown> = { en, ms, zh };

export type ServerTFunction = (key: string, vars?: Record<string, unknown>) => string;

function lookup(bundle: unknown, key: string): string | undefined {
  let cursor: unknown = bundle;

  for (const segment of key.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  // A key pointing at a namespace rather than a leaf would otherwise render as
  // "[object Object]" in the page, which is worse than showing the key.
  return typeof cursor === 'string' ? cursor : undefined;
}

/**
 * Resolves a key to its plural-suffixed form when `vars.count` is a number,
 * mirroring i18next's own plural key convention (`key_one`, `key_other`, …)
 * without pulling in i18next's runtime.
 *
 * `Intl.PluralRules` is locale-aware: English has `one`/`other`, Chinese has
 * only `other` for every count. The `_one` entries in zh.json are therefore
 * never selected — that is correct, not a bug, and is why they must stay in
 * the bundle for locale parity rather than being pruned.
 */
function resolveKey(
  bundle: unknown,
  key: string,
  locale: Locale,
  vars?: Record<string, unknown>
): string | undefined {
  const count = vars?.count;

  if (typeof count === 'number') {
    const category = new Intl.PluralRules(locale).select(count);
    return (
      lookup(bundle, `${key}_${category}`) ?? lookup(bundle, `${key}_other`) ?? lookup(bundle, key)
    );
  }

  return lookup(bundle, key);
}

function interpolate(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template;

  // Global replace: i18next lets one string use a placeholder twice, and a
  // single replacement would leave raw braces visible in the interface.
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const value = vars[name];
    // An absent variable keeps its placeholder rather than printing
    // "undefined", so the bug is legible to whoever sees it.
    return value === undefined || value === null ? whole : String(value);
  });
}

export function getFixedT(locale: Locale = defaultLocale): ServerTFunction {
  const primary = bundles[locale] ?? bundles[defaultLocale];
  const fallback = bundles[defaultLocale];

  return (key, vars) => {
    // Translations land at different times per locale. Falling back to English
    // shows usable text instead of a raw key sitting in the middle of the UI.
    //
    // The plural category is always selected for the requested locale, even
    // when the lookup itself falls back to the English bundle: a missing `ms`
    // translation should still pick the `ms` plural category so a future `ms`
    // string lands in the right slot, not silently switch grammar to English.
    const template =
      resolveKey(primary, key, locale, vars) ?? resolveKey(fallback, key, locale, vars) ?? key;
    return interpolate(template, vars);
  };
}
