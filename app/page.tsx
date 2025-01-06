import { SiteHeader } from '@/components/site-header';
import { GoalForm } from '@/components/goal-form';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <section className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Achieve Your Goals with{' '}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                AI-Powered Mentorship
              </span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Enter your goal below and get personalized guidance from our AI mentor.
            </p>
          </div>
          <GoalForm />
        </section>
      </main>
    </div>
  );
}