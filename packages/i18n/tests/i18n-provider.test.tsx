import { renderToString } from 'react-dom/server';
import { useTranslation } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `I18nProvider` reads the route's locale segment through `useParams`, and
// `useAppTranslations` (not under test here, but pulled in via the barrel)
// reaches for the router. Neither exists outside a Next request, so stub the
// module and drive `useParams` per-test.
const params = vi.hoisted(() => ({ current: {} as Record<string, string> }));

vi.mock('next/navigation', () => ({
  useParams: () => params.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

const { default: I18nProvider } = await import('../src/i18n-provider');
const { default: i18n } = await import('../src/i18n');

/**
 * `navigation.login` is translated differently in all three locales, so a
 * single assertion proves both that content rendered *and* that it rendered
 * in the right language.
 */
const LOGIN = { en: 'Log In', ms: 'Log Masuk', zh: '登录' } as const;

function Probe() {
  const { t } = useTranslation();
  return <span>{t('navigation.login')}</span>;
}

beforeEach(() => {
  params.current = {};
});

describe('I18nProvider server rendering', () => {
  // The regression this whole file exists for: `I18nProvider` used to hold an
  // `isReady` flag that started `false` and only flipped inside a `useEffect`,
  // returning `null` until it did. Effects never run during a server render,
  // so every page in both apps — each one wrapped in this provider — served
  // an empty <body>. No crawler, social-preview scraper, or JS-disabled
  // visitor ever saw a word of content.
  it('renders its children into the server HTML', () => {
    const html = renderToString(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>
    );

    expect(html).not.toBe('');
    expect(html).toContain(LOGIN.en);
  });

  it.each(['en', 'ms', 'zh'] as const)(
    'renders %s copy when the locale arrives as a prop',
    (locale) => {
      const html = renderToString(
        <I18nProvider locale={locale}>
          <Probe />
        </I18nProvider>
      );

      expect(html).toContain(LOGIN[locale]);
    }
  );

  it.each(['en', 'ms', 'zh'] as const)(
    'renders %s copy when the locale comes from the route params',
    (locale) => {
      params.current = { locale };

      const html = renderToString(
        <I18nProvider>
          <Probe />
        </I18nProvider>
      );

      expect(html).toContain(LOGIN[locale]);
    }
  );

  it('prefers an explicit locale prop over the route params', () => {
    params.current = { locale: 'zh' };

    const html = renderToString(
      <I18nProvider locale="ms">
        <Probe />
      </I18nProvider>
    );

    expect(html).toContain(LOGIN.ms);
    expect(html).not.toContain(LOGIN.zh);
  });

  it('falls back to the default locale when no locale is available', () => {
    const html = renderToString(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(html).toContain(LOGIN.en);
  });

  // The `i18n` singleton is module-level state shared by every in-flight
  // request on the server. Rendering a non-default locale must not call
  // `changeLanguage` on it — that would leak one request's locale into
  // whatever other requests are mid-render, so a visitor asking for /en could
  // be served Malay. The provider clones instead; this asserts it stays that
  // way.
  it('does not mutate the shared singleton when rendering a non-default locale', () => {
    const before = i18n.language;

    renderToString(
      <I18nProvider locale="zh">
        <Probe />
      </I18nProvider>
    );

    expect(i18n.language).toBe(before);
  });

  it('keeps concurrent renders of different locales isolated from each other', () => {
    const ms = renderToString(
      <I18nProvider locale="ms">
        <Probe />
      </I18nProvider>
    );
    const zh = renderToString(
      <I18nProvider locale="zh">
        <Probe />
      </I18nProvider>
    );
    const en = renderToString(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>
    );

    expect(ms).toContain(LOGIN.ms);
    expect(zh).toContain(LOGIN.zh);
    expect(en).toContain(LOGIN.en);
  });
});
