'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

import { FooterSection } from '@/components/sections/footer-section';
import { SiteHeader } from '@/components/site-header';
import { useAppTranslations } from '@/lib/hooks/use-translations';
import { getBlogPosts } from './mock-data';

// Inner component that uses useParams
function BlogPageContent() {
  const { t } = useAppTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const posts = getBlogPosts();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto mt-16 max-w-7xl px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            {t('blog.title') || 'Latest Articles'}
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Insights, guides, and perspectives on AI-driven goal achievement and personal
            development.
          </p>
        </div>

        {/* Featured Posts */}
        <div className="mb-16 grid gap-12">
          {posts
            .filter((post) => post.featured)
            .map((post) => (
              <div key={post.id} className="grid items-center gap-8 md:grid-cols-2">
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <div
                    className="h-full w-full bg-muted"
                    style={{
                      backgroundImage: `url(${post.coverImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                      {post.tags[0]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {post.readingTime} min read
                    </span>
                  </div>
                  <h2 className="mb-3 text-2xl font-bold md:text-3xl">{post.title}</h2>
                  <p className="mb-4 text-muted-foreground">{post.description}</p>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted">
                      <div
                        className="h-full w-full rounded-full"
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
                  <Link
                    href={`/${locale}/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    Read more <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
        </div>

        {/* All Posts */}
        <h2 className="mb-8 text-2xl font-bold">All Articles</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group rounded-lg border p-4 transition-colors hover:border-foreground/50"
            >
              <div
                className="mb-4 aspect-video rounded-md bg-muted"
                style={{
                  backgroundImage: `url(${post.coverImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                  {post.tags[0]}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readingTime} min
                </span>
              </div>
              <h2 className="mb-2 text-xl font-semibold">{post.title}</h2>
              <p className="mb-4 text-muted-foreground">{post.description}</p>
              <Link href={`/${locale}/blog/${post.slug}`} className="text-primary hover:underline">
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}

// Wrapper component with Suspense
export default function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  // We don't use setRequestLocale in client components as it's for server components only
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}
    >
      <BlogPageContent />
    </Suspense>
  );
}
