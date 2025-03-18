// File: i18n.ts - Proper configuration for Next.js 14
import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming locale is valid
  if (!['en', 'ms'].includes(locale)) {
    throw new Error('Invalid locale');
  }
  
  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});

// -------------------------------------------

// File: app/[locale]/layout.jsx - Server component layout
import {NextIntlClientProvider} from 'next-intl/client';
import {getTranslations, getLocale} from 'next-intl/server';
 
export async function generateMetadata({params: {locale}}) {
  const t = await getTranslations({locale, namespace: 'Metadata'});
  return {title: t('title')};
}
 
export default async function LocaleLayout({children, params: {locale}}) {
  // Get messages for client components
  const messages = (await import(`../../messages/${locale}.json`)).default;
  
  return (
    <html lang={locale}>
      <body>
        {/* Provide messages to client components */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// -------------------------------------------

// File: app/[locale]/blog/page.jsx - Server component page
import {Suspense} from 'react';
import {getTranslations} from 'next-intl/server';
import BlogList from './components/BlogList';
import ClientSideBlogFilter from './components/ClientSideBlogFilter';

// This is a server component
export default async function BlogPage({params: {locale}}) {
  // Get translations directly in the server component
  const t = await getTranslations('Blog');
  
  // Fetch blog posts (server-side)
  const posts = await fetchBlogPosts();
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      
      {/* Client component wrapped in Suspense */}
      <Suspense fallback={<div>Loading filters...</div>}>
        <ClientSideBlogFilter 
          filterLabel={t('filters.label')}
          filterOptions={t('filters.options')} 
        />
      </Suspense>
      
      {/* Pass server data to a client component */}
      <BlogList 
        posts={posts} 
        readMoreLabel={t('readMore')}
      />
    </div>
  );
}

// -------------------------------------------

// File: app/[locale]/blog/components/ClientSideBlogFilter.jsx - Client component
'use client';

import {useSearchParams} from 'next/navigation';
 
// This is a client component that receives translated strings as props
export default function ClientSideBlogFilter({filterLabel, filterOptions}) {
  // useSearchParams is properly used in a client component that's wrapped in Suspense
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';
  
  return (
    <div>
      <label>{filterLabel}</label>
      <select>
        {Object.entries(filterOptions).map(([value, label]) => (
          <option 
            key={value} 
            value={value}
            selected={currentCategory === value}
          >
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

// -------------------------------------------

// File: app/[locale]/blog/components/BlogList.jsx - Client component
'use client';

import {useFormatter} from 'next-intl/client';

// This is a client component that receives data and translations as props
export default function BlogList({posts, readMoreLabel}) {
  const format = useFormatter();
  
  return (
    <div className="blog-list">
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <time dateTime={post.date}>
            {format.dateTime(new Date(post.date), {
              year: 'numeric', 
              month: 'long', 
              day: 'numeric'
            })}
          </time>
          <p>{post.excerpt}</p>
          <a href={`/blog/${post.slug}`}>{readMoreLabel}</a>
        </article>
      ))}
    </div>
  );
} 