'use client';

import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { FooterSection } from '@/components/sections/footer-section';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getBlogPosts } from './mock-data';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function BlogPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const posts = getBlogPosts();
  
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-16 max-w-7xl mt-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('blog.title') || 'Latest Articles'}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Insights, guides, and perspectives on AI-driven goal achievement and personal development.
          </p>
        </div>

        {/* Featured Posts */}
        <div className="grid gap-12 mb-16">
          {posts.filter(post => post.featured).map(post => (
            <div key={post.id} className="grid md:grid-cols-2 gap-8 items-center">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <div 
                  className="w-full h-full bg-muted"
                  style={{ 
                    backgroundImage: `url(${post.coverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">{post.tags[0]}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {post.readingTime} min read
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">{post.title}</h2>
                <p className="text-muted-foreground mb-4">{post.description}</p>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0">
                    <div 
                      className="w-full h-full rounded-full"
                      style={{ 
                        backgroundImage: `url(${post.author.avatar})`,
                        backgroundSize: 'cover'
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
        <h2 className="text-2xl font-bold mb-8">All Articles</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <article key={post.id} className="group rounded-lg border p-4 hover:border-foreground/50 transition-colors">
              <div 
                className="aspect-video rounded-md bg-muted mb-4"
                style={{ 
                  backgroundImage: `url(${post.coverImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">{post.tags[0]}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readingTime} min
                </span>
              </div>
              <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
              <p className="text-muted-foreground mb-4">{post.description}</p>
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