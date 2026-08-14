'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';

import { Colophon } from '@/components/manual/colophon';
import { SiteHeader } from '@/components/site-header';
import { Plate } from '@/components/manual/plate';
import { AS_OF } from '@/content/record';
import { formatFullDate } from '@/lib/duration';
import { getBlogPosts } from './mock-data';

// Inner component that uses useParams
function BlogPageContent() {
  const { t, currentLocale } = useAppTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const posts = getBlogPosts();

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        <Plate
          number={t('blog.plate')}
          label={t('common.plateLabel', { number: t('blog.plate') })}
          title={t('blog.title')}
          meta={t('blog.meta', { date: AS_OF })}
        >
          <p className="max-w-[68ch] text-body">{t('blog.subtitle')}</p>

          <ul className="mt-12 border-t border-rule">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-3 border-b border-rule py-8 md:flex-row md:items-baseline md:justify-between md:gap-8"
              >
                <div className="md:max-w-[68ch]">
                  <p className="label mb-2 text-ink-soft">
                    {t('blog.postMeta', {
                      date: formatFullDate(post.publishedAt, currentLocale),
                      minutes: post.readingTime,
                    })}
                  </p>
                  <Link href={`/${locale}/blog/${post.slug}`} className="text-title block text-ink">
                    {post.title}
                  </Link>
                  <p className="mt-2 text-body text-ink-soft">{post.description}</p>
                </div>
                <Link
                  href={`/${locale}/blog/${post.slug}`}
                  className="label shrink-0 text-oxide"
                >
                  {t('blog.readMore')}
                </Link>
              </li>
            ))}
          </ul>
        </Plate>
      </main>
      <Colophon />
    </div>
  );
}

// Wrapper component with Suspense
export default function BlogPage() {
  // We don't use setRequestLocale in client components as it's for server components only
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-paper" />}>
      <BlogPageContent />
    </Suspense>
  );
}
