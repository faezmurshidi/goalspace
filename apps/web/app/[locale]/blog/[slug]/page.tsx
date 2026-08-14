'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';

import { Colophon } from '@/components/manual/colophon';
import { SiteHeader } from '@/components/site-header';
import { Plate } from '@/components/manual/plate';
import { formatFullDate } from '@/lib/duration';
import { getPostBySlug, getRelatedPosts } from '../mock-data';

/**
 * Rich post content arrives as prose HTML (headings, paragraphs, lists)
 * from the mock content store, not as our own JSX, so its inner elements
 * are styled with scoped child selectors rather than the plate scale's own
 * component classes. The measure and base size still come from the
 * `text-body` scale so the article reads like the rest of the manual.
 */
const contentClass =
  'max-w-[68ch] text-body ' +
  '[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-headline [&_h2]:wdth-wide ' +
  '[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-title ' +
  '[&_p]:mt-4 [&_p:first-child]:mt-0 ' +
  '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 ' +
  '[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 ' +
  '[&_li]:mt-2 ' +
  '[&_a]:text-oxide [&_a]:underline [&_a]:underline-offset-2';

// Inner component that uses useParams
function ArticlePageContent() {
  const { t, currentLocale } = useAppTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const slug = params.slug as string;

  const post = getPostBySlug(slug);
  const relatedPosts = getRelatedPosts(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        <Plate
          number={t('blog.postPlate')}
          label={t('common.plateLabel', { number: t('blog.postPlate') })}
          title={post.title}
          meta={t('blog.postMeta', {
            date: formatFullDate(post.publishedAt, currentLocale),
            minutes: post.readingTime,
          })}
        >
          <Link href={`/${locale}/blog`} className="label mb-10 inline-block text-ink-soft">
            {t('blog.backToBlog')}
          </Link>

          <p className="max-w-[68ch] text-body text-ink-soft">{post.description}</p>
          <p className="label mt-4 border-t border-rule pt-4 text-ink-soft">
            {t('blog.byLine', { name: post.author.name, role: post.author.role })}
          </p>

          <div
            className={`mt-10 ${contentClass}`}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {relatedPosts.length > 0 ? (
            <div className="mt-16 border-t border-rule pt-10">
              <h3 className="label mb-4 text-oxide">{t('blog.relatedLabel')}</h3>
              <ul className="border-t border-rule">
                {relatedPosts.map((relatedPost) => (
                  <li key={relatedPost.id} className="border-b border-rule py-6">
                    <Link
                      href={`/${locale}/blog/${relatedPost.slug}`}
                      className="text-title block text-ink"
                    >
                      {relatedPost.title}
                    </Link>
                    <p className="mt-2 max-w-[68ch] text-body text-ink-soft">
                      {relatedPost.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Plate>
      </main>
      <Colophon />
    </div>
  );
}

// Wrapper component with Suspense
export default function ArticlePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-paper" />}>
      <ArticlePageContent />
    </Suspense>
  );
}
