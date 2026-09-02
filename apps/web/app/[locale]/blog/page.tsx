'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';

import { Plate } from '@/components/manual/plate';
import { formatFullDate } from '@/lib/duration';
import { AS_OF } from '@/content/record';
import { getBlogPosts } from './mock-data';

// Inner component that uses useParams
function BlogPageContent() {
  const { t, currentLocale } = useAppTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const posts = getBlogPosts();

  return (
    <div className="bg-paper">
      <main>
        <Plate
          number={t('blog.plate')}
          label={t('common.plateLabel', { number: t('blog.plate') })}
          title={t('blog.title')}
          meta={t('blog.meta', { date: AS_OF })}
        >
          <p className="text-body max-w-[68ch]">{t('blog.subtitle')}</p>

          <ul className="border-rule mt-12 border-t">
            {posts.map((post) => (
              <li
                key={post.id}
                className="border-rule flex flex-col gap-3 border-b py-8 md:flex-row md:items-baseline md:justify-between md:gap-8"
              >
                <div className="md:max-w-[68ch]">
                  <p className="label text-ink-soft mb-2">
                    {t('blog.postMeta', {
                      date: formatFullDate(post.publishedAt, currentLocale),
                      minutes: post.readingTime,
                    })}
                  </p>
                  <Link href={`/${locale}/blog/${post.slug}`} className="text-title text-ink block">
                    {post.title}
                  </Link>
                  <p className="text-body text-ink-soft mt-2">{post.description}</p>
                </div>
                <Link href={`/${locale}/blog/${post.slug}`} className="label text-oxide shrink-0">
                  {t('blog.readMore')}
                </Link>
              </li>
            ))}
          </ul>
        </Plate>
      </main>
    </div>
  );
}

// Wrapper component with Suspense
export default function BlogPage() {
  // We don't use setRequestLocale in client components as it's for server components only
  return (
    <Suspense fallback={<div className="bg-paper flex min-h-screen items-center justify-center" />}>
      <BlogPageContent />
    </Suspense>
  );
}
