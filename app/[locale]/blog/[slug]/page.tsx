'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import { Button } from '@goalspace/ui';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Clock, Share2 } from 'lucide-react';

import { FooterSection } from '@/components/sections/footer-section';
import { SiteHeader } from '@/components/site-header';
import { getPostBySlug, getRelatedPosts } from '../mock-data';

// Inner component that uses useParams
function ArticlePageContent() {
  const { t } = useAppTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const slug = params.slug as string;

  const post = getPostBySlug(slug);
  const relatedPosts = getRelatedPosts(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto mt-16 max-w-4xl px-4 py-16">
        <Link
          href={`/${locale}/blog`}
          className="mb-8 flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to all articles
        </Link>

        <article>
          {/* Article Header */}
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                  {tag}
                </span>
              ))}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readingTime} min read
              </span>
            </div>

            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">{post.title}</h1>
            <p className="mb-6 text-xl text-muted-foreground">{post.description}</p>

            <div className="flex items-center justify-between border-y py-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full w-full"
                    style={{
                      backgroundImage: `url(${post.author.avatar})`,
                      backgroundSize: 'cover',
                    }}
                  />
                </div>
                <div>
                  <p className="font-medium">{post.author.name}</p>
                  <p className="text-sm text-muted-foreground">{post.author.role}</p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
          </div>

          {/* Article Cover Image */}
          <div className="mb-10 aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url(${post.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>

          {/* Article Content */}
          <div
            className="prose mb-16 max-w-none dark:prose-invert lg:prose-lg"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Article Footer */}
          <div className="border-t pt-10">
            <h3 className="mb-6 text-xl font-bold">Related Articles</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/${locale}/blog/${relatedPost.slug}`}
                  className="group rounded-lg border p-4 transition-colors hover:border-foreground/50"
                >
                  <div className="mb-4 aspect-video overflow-hidden rounded bg-muted">
                    <div
                      className="h-full w-full transform transition-transform duration-300 group-hover:scale-105"
                      style={{
                        backgroundImage: `url(${relatedPost.coverImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  </div>
                  <h4 className="mb-2 font-medium transition-colors group-hover:text-primary">
                    {relatedPost.title}
                  </h4>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {relatedPost.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </div>
  );
}

// Wrapper component with Suspense
export default function ArticlePage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}
    >
      <ArticlePageContent />
    </Suspense>
  );
}
