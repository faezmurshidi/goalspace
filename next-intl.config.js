module.exports = {
  // These are the locales you're application supports
  locales: ['en', 'ms', 'zh'],
  
  // This is the default locale you want to be used when visiting
  // a non-locale prefixed path e.g. `/hello`
  defaultLocale: 'en',
  
  // This is a list of locale domains and the default locale they
  // should handle (these are only required when you're using a domain strategy)
  // domains: [
  //   {
  //     domain: 'example.com',
  //     defaultLocale: 'en',
  //   },
  //   {
  //     domain: 'example.fr',
  //     defaultLocale: 'fr',
  //   },
  //   {
  //     domain: 'example.es',
  //     defaultLocale: 'es',
  //     // an optional http field can also be used to test
  //     // locale domains locally with http instead of https
  //     http: true,
  //   },
  // ],
  
  // Optional: Prevent cookies from being sent with every API request.
  // By default, Next.js includes cookies on every server-side request.
  // For APIs calls or static pages, this often isn't necessary and can be omitted.
  // localeDetection: false,
} 