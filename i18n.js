import { getRequestConfig } from 'next-intl/server';

// This is the configuration needed for Next-intl middleware
export default getRequestConfig(async ({ locale: requestLocale }) => {
  // Use the correct API approach
  const locale = requestLocale;
  
  // Load messages for the current locale
  const messages = (await import(`./locales/${locale}.json`)).default;
  
  return {
    locale, // This is important for next-intl to work properly
    messages,
    // You can add additional configuration options here if needed
    // For example:
    // timeZone: 'Europe/London',
    // now: new Date(),
  };
}); 