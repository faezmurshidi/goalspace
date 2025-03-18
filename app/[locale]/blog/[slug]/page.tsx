'use client';

import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { FooterSection } from '@/components/sections/footer-section';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Share2 } from 'lucide-react';
import { getPostBySlug, getRelatedPosts } from '../mock-data';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';

export default function ArticlePage() {
  const t = useTranslations();
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
      <main className="container mx-auto px-4 py-16 max-w-4xl mt-16">
        <Link 
          href={`/${locale}/blog`} 
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to all articles
        </Link>
        
        <article>
          {/* Article Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              {post.tags.map(tag => (
                <span key={tag} className="bg-primary/10 text-primary px-2 py-1 rounded-full">{tag}</span>
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
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">{post.title}</h1>
            <p className="text-xl text-muted-foreground mb-6">{post.description}</p>
            
            <div className="flex items-center justify-between py-4 border-y">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="w-full h-full"
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
              
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
          </div>
          
          {/* Article Cover Image */}
          <div className="aspect-video w-full rounded-lg bg-muted mb-10 overflow-hidden">
            <div 
              className="w-full h-full"
              style={{ 
                backgroundImage: `url(${post.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          </div>
          
          {/* Article Content */}
          <div 
            className="prose dark:prose-invert lg:prose-lg max-w-none mb-16"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          
          {/* Article Footer */}
          <div className="border-t pt-10">
            <h3 className="text-xl font-bold mb-6">Related Articles</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {relatedPosts.map(relatedPost => (
                <Link 
                  key={relatedPost.id}
                  href={`/${locale}/blog/${relatedPost.slug}`}
                  className="p-4 border rounded-lg hover:border-foreground/50 transition-colors group"
                >
                  <div className="aspect-video rounded bg-muted mb-4 overflow-hidden">
                    <div 
                      className="w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                      style={{ 
                        backgroundImage: `url(${relatedPost.coverImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                  </div>
                  <h4 className="font-medium mb-2 group-hover:text-primary transition-colors">{relatedPost.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{relatedPost.description}</p>
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