'use client';

import { Bot, Brain, Sparkles, Users, Zap } from 'lucide-react';

import { AnimatedCard } from '@/components/ui/feature-block-animated-card';

const features = [
  {
    icon: Brain,
    title: 'Smart Learning Paths',
    description: 'AI-powered personalized learning journeys tailored to your goals',
  },
  {
    icon: Sparkles,
    title: 'Interactive Spaces',
    description: 'Organized workspaces for each learning objective',
  },
  {
    icon: Users,
    title: 'AI Mentorship',
    description: 'Get guidance from specialized AI mentors in your field',
  },
  {
    icon: Zap,
    title: 'Real-time Progress Tracking',
    description: 'Monitor your learning journey with advanced analytics and insights',
  },
  {
    icon: Bot,
    title: 'Adaptive Learning',
    description: 'Content and pace that adjusts to your understanding and progress',
  },
];

const AIFeatures = () => (
  <AnimatedCard
    title="Powered by Advanced AI"
    description="Leveraging cutting-edge AI models to provide personalized learning experiences"
    size="2xl"
    className="h-full"
    icons={[
      {
        icon: <ClaudeLogo className="h-4 w-4" />,
        size: 'sm',
      },
      {
        icon: <CopilotLogo className="h-6 w-6 dark:text-white" />,
        size: 'md',
      },
      {
        icon: <OpenAILogo className="h-8 w-8 dark:text-white" />,
        size: 'lg',
      },
      {
        icon: <MetaIconOutline className="h-6 w-6" />,
        size: 'md',
      },
      {
        icon: <GeminiLogo className="h-4 w-4" />,
        size: 'sm',
      },
    ]}
  />
);

export function FeaturesSection() {
  return (
    <section className="border-t bg-gray-50/50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to succeed
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Our platform combines AI intelligence with proven learning methodologies.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="mt-16 grid auto-rows-[20rem] grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* AI Features Card - Spans 2 columns and 2 rows */}
          <div className="md:col-span-2 md:row-span-2">
            <AIFeatures />
          </div>

          {/* Regular Feature Cards */}
          {features.map((feature, i) => (
            <AnimatedCard
              key={i}
              title={feature.title}
              description={feature.description}
              variant="feature"
              size="md"
              className="h-full"
              icons={[
                {
                  icon: <feature.icon className="text-primary" />,
                  size: 'lg',
                  className: 'bg-primary/10',
                },
              ]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// AI Logo Components
const ClaudeLogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    shapeRendering="geometricPrecision"
    textRendering="geometricPrecision"
    imageRendering="optimizeQuality"
    fillRule="evenodd"
    clipRule="evenodd"
    viewBox="0 0 512 512"
    className={className}
  >
    <rect fill="#CC9B7A" width="512" height="512" rx="104.187" ry="105.042" />
    <path
      fill="#1F1F1E"
      fillRule="nonzero"
      d="M318.663 149.787h-43.368l78.952 212.423 43.368.004-78.952-212.427zm-125.326 0l-78.952 212.427h44.255l15.932-44.608 82.846-.004 16.107 44.612h44.255l-79.126-212.427h-45.317zm-4.251 128.341l26.91-74.701 27.083 74.701h-53.993z"
    />
  </svg>
);

const CopilotLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 512 416"
    xmlns="http://www.w3.org/2000/svg"
    fillRule="evenodd"
    clipRule="evenodd"
    strokeLinejoin="round"
    strokeMiterlimit="2"
    className={className}
  >
    <path
      d="M181.33 266.143c0-11.497 9.32-20.818 20.818-20.818 11.498 0 20.819 9.321 20.819 20.818v38.373c0 11.497-9.321 20.818-20.819 20.818-11.497 0-20.818-9.32-20.818-20.818v-38.373zM308.807 245.325c-11.477 0-20.798 9.321-20.798 20.818v38.373c0 11.497 9.32 20.818 20.798 20.818 11.497 0 20.818-9.32 20.818-20.818v-38.373c0-11.497-9.32-20.818-20.818-20.818z"
      fillRule="nonzero"
    />
    <path d="M512.002 246.393v57.384c-.02 7.411-3.696 14.638-9.67 19.011C431.767 374.444 344.695 416 256 416c-98.138 0-196.379-56.542-246.33-93.21-5.975-4.374-9.65-11.6-9.671-19.012v-57.384a35.347 35.347 0 016.857-20.922l15.583-21.085c8.336-11.312 20.757-14.31 33.98-14.31 4.988-56.953 16.794-97.604 45.024-127.354C155.194 5.77 226.56 0 256 0c29.441 0 100.807 5.77 154.557 62.722 28.19 29.75 40.036 70.401 45.025 127.354 13.263 0 25.602 2.936 33.958 14.31l15.583 21.127c4.476 6.077 6.878 13.345 6.878 20.88zm-97.666-26.075c-.677-13.058-11.292-18.19-22.338-21.824-11.64 7.309-25.848 10.183-39.46 10.183-14.454 0-41.432-3.47-63.872-25.869-5.667-5.625-9.527-14.454-12.155-24.247a212.902 212.902 0 00-20.469-1.088c-6.098 0-13.099.349-20.551 1.088-2.628 9.793-6.509 18.622-12.155 24.247-22.4 22.4-49.418 25.87-63.872 25.87-13.612 0-27.86-2.855-39.501-10.184-11.005 3.613-21.558 8.828-22.277 21.824-1.17 24.555-1.272 49.11-1.375 73.645-.041 12.318-.082 24.658-.288 36.976.062 7.166 4.374 13.818 10.882 16.774 52.97 24.124 103.045 36.278 149.137 36.278 46.01 0 96.085-12.154 149.014-36.278 6.508-2.956 10.84-9.608 10.881-16.774.637-36.832.124-73.809-1.642-110.62h.041z" />
  </svg>
);

const OpenAILogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M26.153 11.46a6.888 6.888 0 0 0-.608-5.73 7.117 7.117 0 0 0-3.29-2.93 7.238 7.238 0 0 0-4.41-.454 7.065 7.065 0 0 0-2.41-1.742A7.15 7.15 0 0 0 12.514 0a7.216 7.216 0 0 0-4.217 1.346 7.061 7.061 0 0 0-2.603 3.539 7.12 7.12 0 0 0-2.734 1.188A7.012 7.012 0 0 0 .966 8.268a6.979 6.979 0 0 0 .88 8.273 6.89 6.89 0 0 0 .607 5.729 7.117 7.117 0 0 0 3.29 2.93 7.238 7.238 0 0 0 4.41.454 7.061 7.061 0 0 0 2.409 1.742c.92.404 1.916.61 2.923.604a7.215 7.215 0 0 0 4.22-1.345 7.06 7.06 0 0 0 2.605-3.543 7.116 7.116 0 0 0 2.734-1.187 7.01 7.01 0 0 0 1.993-2.196 6.978 6.978 0 0 0-.884-8.27Z"
      fill="currentColor"
    />
  </svg>
);

const GeminiLogo = ({ className }: { className?: string }) => (
  <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className={className}>
    <path
      d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
      fill="url(#prefix__paint0_radial_980_20147)"
    />
    <defs>
      <radialGradient
        id="prefix__paint0_radial_980_20147"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="matrix(16.1326 5.4553 -43.70045 129.2322 1.588 6.503)"
      >
        <stop offset=".067" stopColor="#9168C0" />
        <stop offset=".343" stopColor="#5684D1" />
        <stop offset=".672" stopColor="#1BA1E3" />
      </radialGradient>
    </defs>
  </svg>
);

const MetaIconOutline = ({ className }: { className?: string }) => (
  <svg
    id="Layer_1"
    data-name="Layer 1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 287.56 191"
    className={className}
  >
    <path
      fill="currentColor"
      d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85Z"
    />
  </svg>
);
