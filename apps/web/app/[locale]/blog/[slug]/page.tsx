'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';

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
    <div className="bg-paper">
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
          <Link href={`/${locale}/blog`} className="label text-ink-soft mb-10 inline-block">
            {t('blog.backToBlog')}
          </Link>

          <p className="text-body text-ink-soft max-w-[68ch]">{post.description}</p>
          <p className="label border-rule text-ink-soft mt-4 border-t pt-4">
            {t('blog.byLine', { name: post.author.name, role: post.author.role })}
          </p>

          <div
            className={`mt-10 ${contentClass}`}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {relatedPosts.length > 0 ? (
            <div className="border-rule mt-16 border-t pt-10">
              <h3 className="label text-oxide mb-4">{t('blog.relatedLabel')}</h3>
              <ul className="border-rule border-t">
                {relatedPosts.map((relatedPost) => (
                  <li key={relatedPost.id} className="border-rule border-b py-6">
                    <Link
                      href={`/${locale}/blog/${relatedPost.slug}`}
                      className="text-title text-ink block"
                    >
                      {relatedPost.title}
                    </Link>
                    <p className="text-body text-ink-soft mt-2 max-w-[68ch]">
                      {relatedPost.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Plate>
      </main>
    </div>
  );
}

// Wrapper component with Suspense
export default function ArticlePage() {
  return (
    <Suspense fallback={<div className="bg-paper flex min-h-screen items-center justify-center" />}>
      <ArticlePageContent />
    </Suspense>
  );
}
