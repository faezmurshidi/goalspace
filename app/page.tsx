import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Supported locales
const supportedLocales = ['en', 'ms', 'zh'];
const defaultLocale = 'en';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  // Get the user's preferred locale from cookies or default to English
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('i18next');
  
  // Use cookie value if it exists and is supported, otherwise default
  let locale = defaultLocale;
  if (localeCookie?.value && supportedLocales.includes(localeCookie.value)) {
    locale = localeCookie.value;
  }
  
  // Redirect to the localized version of the homepage
  redirect(`/${locale}`);
}
