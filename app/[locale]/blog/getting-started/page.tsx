'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import { ArrowLeft } from 'lucide-react';

import { FooterSection } from '@/components/sections/footer-section';
import { SiteHeader } from '@/components/site-header';

// Inner component that uses useParams
function ArticlePageContent() {
  const { t, currentLocale } = useAppTranslations();
  const params = useParams();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-16">
        <Link
          href={`/${currentLocale}/blog`}
          className="mb-8 flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to all articles
        </Link>

        <article className="prose prose-lg mx-auto dark:prose-invert">
          <h1 className="mb-6 text-4xl font-bold">Getting Started with GoalSpace</h1>
          <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
            <time dateTime="2023-01-01">January 1, 2023</time>
            <span>•</span>
            <span>10 min read</span>
          </div>

          <p className="lead">{t('blog.gettingStarted.intro')}</p>

          <h2>Setting Up Your First Goal</h2>
          <p>
            GoalSpace is designed to help you achieve your goals with the help of AI-powered
            mentorship and structured learning paths. In this guide, we&apos;ll walk you through the
            process of setting up your first goal and creating a personalized learning space.
          </p>

          <h3>1. Define Your Goal</h3>
          <p>
            The first step is to define your goal clearly. The more specific your goal, the better
            our AI can assist you. For example, instead of saying &quot;Learn Python&quot;, try
            &quot;Build a web scraper with Python to collect data from news websites&quot;.
          </p>

          <h3>2. Create Your Space</h3>
          <p>
            Once you&apos;ve defined your goal, GoalSpace will create a personalized learning space
            for you. This space will include:
          </p>
          <ul>
            <li>A structured learning path</li>
            <li>Recommended resources</li>
            <li>Milestone tracking</li>
            <li>AI-powered mentorship</li>
          </ul>

          <h3>3. Track Your Progress</h3>
          <p>
            Use the progress tracking features to monitor your journey. Regular check-ins with your
            AI mentor will help you stay on track and overcome any obstacles you encounter.
          </p>

          <h2>Making the Most of AI Mentorship</h2>
          <p>
            Your AI mentor is available 24/7 to provide guidance, answer questions, and help you
            overcome challenges. Here are some tips for effective interaction:
          </p>
          <ul>
            <li>Ask specific questions</li>
            <li>Request explanations when concepts are unclear</li>
            <li>Share your progress regularly</li>
            <li>Discuss obstacles you&apos;re facing</li>
          </ul>

          <h2>Next Steps</h2>
          <p>
            Now that you understand the basics, it&apos;s time to create your first goal. Head to
            the dashboard and click on &quot;Create New Goal&quot; to get started.
          </p>

          <div className="my-8 flex justify-center">
            <Link
              href={`/${currentLocale}`}
              className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to Home
            </Link>
          </div>
        </article>
      </main>
      <FooterSection />
    </div>
  );
}

// Main component with Suspense
export default function GettingStartedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ArticlePageContent />
    </Suspense>
  );
}
