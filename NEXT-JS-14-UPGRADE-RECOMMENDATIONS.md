# Next.js 14 Upgrade Recommendations

## Overview

This document provides actionable recommendations for migrating the application to Next.js 14 while properly addressing internationalization with next-intl. The goal is to resolve the issues with `setRequestLocale` in client components and ensure proper usage of `useSearchParams` with Suspense boundaries.

## Architecture Changes

### 1. Update next-intl Implementation

The current architecture uses `setRequestLocale` directly, which is not supported in client components. We need to refactor to use the recommended approach:

1. **Replace the current i18n setup** with the new `getRequestConfig` approach:

```typescript
// i18n.ts
import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => {
  // Validate the incoming locale
  if (!['en', 'ms'].includes(locale)) {
    throw new Error('Invalid locale');
  }
  
  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

2. **Update the root layout** to use `NextIntlClientProvider` correctly:

```tsx
// app/[locale]/layout.tsx
import {NextIntlClientProvider} from 'next-intl/client';
import {getTranslations} from 'next-intl/server';

export default async function LocaleLayout({children, params: {locale}}) {
  // Get messages for client components
  const messages = (await import(`../../messages/${locale}.json`)).default;
  
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 2. Restructure Components

1. **Client/Server Component Division**:
   - Convert pages that don't need client interactivity to server components
   - Create clear boundaries between server and client components
   - Pass translations and data from server to client components

2. **Server Components for Internationalization**:
   - Use `getTranslations` in server components
   - Pass translated strings to client components as props
   - Use `useFormatter` instead of `useTranslations` in client components when possible

3. **Proper Suspense Usage**:
   - Wrap all client components that use `useSearchParams` in Suspense boundaries
   - Create a consistent component structure with fallback UI

## Implementation Plan

### Phase 1: Core Infrastructure Updates

1. Update dependencies to latest versions:
   ```bash
   npm install next@14.2.23 next-intl@3.26.5 --save
   ```

2. Replace i18n implementation:
   - Create new i18n.ts file using getRequestConfig
   - Update middleware.ts if needed
   - Update [locale] folder structure

### Phase 2: Component Refactoring

1. Start with critical pages (home, pricing, auth)
2. For each page:
   - Determine if it can be a server component
   - If server component, use `getTranslations`
   - If client component needed, create appropriate server/client boundaries
   - Pass translations from server to client components

3. Structure pattern:
   ```
   // Server component (page.tsx)
   - Get translations with getTranslations
   - Pass translated strings to client components
   - Wrap client components in Suspense

   // Client components
   - Accept translated strings as props
   - Use useFormatter for date/number formatting
   - Properly wrap useSearchParams in Suspense
   ```

### Phase 3: Testing & Optimization

1. Test static generation:
   ```bash
   next build
   ```

2. Fix any remaining issues with localization or Suspense
3. Optimize bundle size and remove any unused imports

## Example Component Refactoring

### Before:
```tsx
'use client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

export default function BlogPage() {
  const t = useTranslations('Blog');
  const searchParams = useSearchParams();
  
  return (
    <div>
      <h1>{t('title')}</h1>
      {/* Content... */}
    </div>
  );
}
```

### After:
```tsx
// Server component
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import BlogContent from './components/BlogContent';

export default async function BlogPage({ params: { locale } }) {
  const t = await getTranslations('Blog');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <BlogContent 
          description={t('description')} 
          readMoreLabel={t('readMore')}
        />
      </Suspense>
    </div>
  );
}

// Client component (in separate file)
'use client';
import { useSearchParams } from 'next/navigation';

export default function BlogContent({ description, readMoreLabel }) {
  const searchParams = useSearchParams();
  
  return (
    <div>
      <p>{description}</p>
      {/* Rest of client-side implementation */}
    </div>
  );
}
```

## Handling Multiple Locales

For components that need to display content in multiple locales, use the new `multiLocaleTranslation` approach or pass the needed translations explicitly:

```tsx
import {getTranslations} from 'next-intl/server';

export default async function MultiLocaleComponent() {
  // Get translations for both locales
  const enTranslations = await getTranslations({locale: 'en', namespace: 'Common'});
  const msTranslations = await getTranslations({locale: 'ms', namespace: 'Common'});
  
  // Pass to client component
  return (
    <LocaleSwitcher 
      translations={{
        en: {label: enTranslations('switchLocale')},
        ms: {label: msTranslations('switchLocale')}
      }}
    />
  );
}
```

## Conclusion

By implementing these changes, we'll properly align with Next.js 14 best practices for internationalization and client/server component boundaries, which will resolve the current build issues and ensure optimal performance. This approach follows the official next-intl recommendations and should provide a sustainable solution going forward. 