'use client';

import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { FooterSection } from '@/components/sections/footer-section';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function ArticlePage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <Link 
          href={`/${locale}/blog`} 
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to all articles
        </Link>
        <article className="prose dark:prose-invert lg:prose-lg max-w-none">
          <h1 className="mb-4 text-4xl font-bold">Getting Started with AI-Powered Goal Setting</h1>
          <p className="text-muted-foreground mb-8">Published on March 18, 2024</p>
          
          <div className="aspect-video w-full bg-muted rounded-lg mb-8"></div>
          
          <p className="text-lg leading-relaxed mb-6">
            Setting and achieving goals is a fundamental part of personal and professional growth. 
            With the advent of AI technology, we now have powerful tools at our disposal to make 
            this process more effective and personalized.
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Why AI-Powered Goal Setting?</h2>
          <p className="mb-4">
            Traditional goal-setting methods often lack personalization and adaptability. 
            AI brings a new dimension to goal setting by:
          </p>
          <ul className="list-disc pl-6 mb-6">
            <li className="mb-2">Analyzing your patterns and preferences</li>
            <li className="mb-2">Providing personalized recommendations</li>
            <li className="mb-2">Adapting to your progress and challenges</li>
            <li className="mb-2">Offering real-time feedback and adjustments</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Getting Started</h2>
          <p className="mb-4">
            To begin your AI-powered goal-setting journey:
          </p>
          <ol className="list-decimal pl-6 mb-6">
            <li className="mb-2">Define your objectives clearly</li>
            <li className="mb-2">Input your preferences and constraints</li>
            <li className="mb-2">Let the AI analyze and suggest optimal approaches</li>
            <li className="mb-2">Track your progress with AI-powered insights</li>
          </ol>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Best Practices</h2>
          <p className="mb-4">
            To make the most of AI-powered goal setting:
          </p>
          <ul className="list-disc pl-6 mb-6">
            <li className="mb-2">Be specific with your inputs</li>
            <li className="mb-2">Regularly update your progress</li>
            <li className="mb-2">Stay open to AI suggestions</li>
            <li className="mb-2">Combine AI insights with your personal judgment</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Conclusion</h2>
          <p className="mb-4">
            AI-powered goal setting represents a significant advancement in personal development technology. 
            By leveraging these tools effectively, you can enhance your productivity, maintain motivation, 
            and achieve your goals more efficiently than ever before.
          </p>
          <p className="mb-4">
            Ready to revolutionize your goal-setting process? Sign up for our platform today 
            and experience the power of AI-assisted goal achievement!
          </p>
          
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-xl font-bold mb-4">Related Articles</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Link 
                href={`/${locale}/blog/ai-productivity`}
                className="p-4 border rounded-lg hover:border-foreground/50 transition-colors"
              >
                <h4 className="font-medium mb-2">5 Ways AI Can Transform Your Productivity</h4>
                <p className="text-sm text-muted-foreground">Discover how artificial intelligence can help you work smarter.</p>
              </Link>
              <Link 
                href={`/${locale}/blog/future-learning`}
                className="p-4 border rounded-lg hover:border-foreground/50 transition-colors"
              >
                <h4 className="font-medium mb-2">The Future of Learning with AI Assistants</h4>
                <p className="text-sm text-muted-foreground">Explore how AI mentors are revolutionizing education.</p>
              </Link>
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </div>
  );
} 