import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Import config settings
const localeConfig = require('../next-intl.config.js');

export const dynamic = 'force-dynamic';

export default function RootPage() {
  // Get the user's preferred locale from cookies or default to the configured default
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  const locale = localeCookie?.value || localeConfig.defaultLocale;
  
  // Redirect to the localized version of the homepage
  redirect(`/${locale}`);
}
