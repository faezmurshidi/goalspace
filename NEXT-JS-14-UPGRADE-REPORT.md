# Next.js 14 Upgrade Issues and Solutions

## Summary

During the upgrade to Next.js 14, we encountered several issues related to the usage of internationalization (next-intl) and client components. The core problems are:

1. `setRequestLocale` is not supported in Client Components
2. `useSearchParams()` needs to be wrapped in a Suspense boundary for static rendering

## Detailed Issues

### Issue 1: `setRequestLocale` not supported in client components

The error appears in many pages that are marked with `'use client'` and use the `next-intl` library for internationalization. The current implementation uses `setRequestLocale` at the layout level, but it conflicts with client components.

```
Error: `setRequestLocale` is not supported in Client Components.
```

### Issue 2: useSearchParams needs Suspense boundary

Even though we've added Suspense boundaries to all client components, we still get errors about useSearchParams:

```
useSearchParams() should be wrapped in a suspense boundary at page "/[locale]/blog". Read more: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
```

## Attempted Solutions

1. Changed client components to use proper Suspense boundaries (implemented)
2. Converted the 404 page to a server component (implemented)
3. Ensured useSearchParams is properly wrapped in Suspense boundaries

## Required Solutions

Based on our research, there are two main approaches to fix these issues:

### Approach 1: Convert Client Components to Server Components where possible

Pages that don't need client-side interaction can be converted to server components, eliminating the need for client-side internationalization and useSearchParams.

### Approach 2: Restructure internationalization approach

According to next-intl documentation, `setRequestLocale` is a stopgap solution intended to be removed in the future. The proper approach is to:

1. Use `getRequestConfig` in i18n.ts instead of calling `setRequestLocale` directly
2. Avoid using `useTranslations` in client components directly
3. Pass translated messages from server components to client components as props
4. Create proper client/server component boundaries with correct data flow

## Recommended Solution

1. Update the i18n configuration to use the latest next-intl patterns
2. Refactor components to separate server and client concerns
3. Use the client component approach described in the next-intl docs: https://next-intl.dev/docs/environments/server-client-components
4. Wrap all useSearchParams usage in proper Suspense boundaries with more direct component structure

## Next Steps

1. Create a proper internationalization setup following the next-intl documentation for Next.js 14
2. Systematically refactor pages to follow the proper patterns
3. Test static generation to ensure it works correctly

## References

- [next-intl Server & Client Components documentation](https://next-intl.dev/docs/environments/server-client-components)
- [Next.js missing-suspense-with-csr-bailout documentation](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)
- [GitHub Issue on setRequestLocale](https://github.com/amannn/next-intl/issues/663) 