import { Metadata } from 'next';
import { ColorSystemDemo } from '@/components/ui/color-system-demo';

export const metadata: Metadata = {
  title: 'Design System - GoalSpace',
  description: 'Explore our design system including color palettes, typography, and components',
};

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 md:py-12">
      <div className="mb-12">
        <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">Design System</h1>
        <p className="text-xl text-muted-foreground">
          Explore our design language showcasing the color system, typography, and components.
        </p>
      </div>

      <div className="grid gap-12">
        <div className="rounded-xl border bg-card p-6 md:p-8">
          <ColorSystemDemo />
        </div>

        <div className="rounded-xl border bg-card p-6 md:p-8">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold tracking-tight">Typography</h2>
            <p className="text-lg text-muted-foreground">
              Our typographic system is designed for readability and hierarchy
            </p>
          </div>

          <div className="grid gap-8">
            <div>
              <h3 className="mb-4 text-xl font-semibold">Headings</h3>
              <div className="space-y-6 rounded-lg border bg-card/50 p-6">
                <div>
                  <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Heading 1
                  </h1>
                  <p className="text-sm text-muted-foreground">text-4xl / text-5xl, font-extrabold, tracking-tight</p>
                </div>
                <div>
                  <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
                    Heading 2
                  </h2>
                  <p className="text-sm text-muted-foreground">text-3xl, font-semibold, tracking-tight, border-b</p>
                </div>
                <div>
                  <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Heading 3
                  </h3>
                  <p className="text-sm text-muted-foreground">text-2xl, font-semibold, tracking-tight</p>
                </div>
                <div>
                  <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                    Heading 4
                  </h4>
                  <p className="text-sm text-muted-foreground">text-xl, font-semibold, tracking-tight</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-xl font-semibold">Paragraphs</h3>
              <div className="space-y-6 rounded-lg border bg-card/50 p-6">
                <div>
                  <p className="leading-7 [&:not(:first-child)]:mt-6">
                    The goal of GoalSpace is to provide a structured, personalized learning environment that helps users achieve their objectives through AI mentorship and progress tracking.
                  </p>
                  <p className="text-sm text-muted-foreground">Default paragraph: leading-7</p>
                </div>
                <div>
                  <p className="text-lg text-muted-foreground">
                    This is a larger muted paragraph often used for introductions or summaries, providing context to the main content.
                  </p>
                  <p className="text-sm text-muted-foreground">text-lg, text-muted-foreground</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Smaller text is used for supporting information, metadata, or interface labels where visual hierarchy requires reduced emphasis.
                  </p>
                  <p className="text-sm text-muted-foreground">text-sm, text-muted-foreground</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 