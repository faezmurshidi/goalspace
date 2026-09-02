import { NextResponse, type NextRequest } from 'next/server';
import { NEXT_LOCALE_COOKIE } from '@goalspace/i18n/cookie-locale';
// Imported from the package's `./locales` and `./cookie-locale` subpaths
// (not its main barrel): the main barrel also re-exports `I18nProvider` and
// `useAppTranslations`, which pull in `next/navigation`'s client-only
// `useParams`/`useRouter`/`usePathname` hooks. Those aren't available in the
// Edge Middleware runtime, so importing the full barrel here breaks the
// middleware bundle. Neither `./locales.ts` nor `./cookie-locale.ts` (which
// only imports from `./locales`) has such dependencies, so both are safe
// for this context. The brief's Step 9 shows a barrel import for
// `NEXT_LOCALE_COOKIE`; that was adjusted here for the same reason Task 3
// avoided the barrel in this file.
import { defaultLocale, locales } from '@goalspace/i18n/locales';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(NEXT_LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale as never)) return cookieLocale;

  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().substring(0, 2))
      .find((lang) => locales.includes(lang as never));
    if (preferred) return preferred;
  }

  return defaultLocale;
}

function withLocaleCookie(response: NextResponse, locale: string): NextResponse {
  response.cookies.set(NEXT_LOCALE_COOKIE, locale, { maxAge: COOKIE_MAX_AGE, path: '/' });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split('/').filter(Boolean)[0] ?? '';

  if (locales.includes(firstSegment as never)) {
    return withLocaleCookie(NextResponse.next(), firstSegment);
  }

  const locale = getLocale(request);
  const target = new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url);
  return withLocaleCookie(NextResponse.redirect(target), locale);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
