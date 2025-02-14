import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Basic plan',
    price: '$9',
    period: 'per month',
    description: 'For individuals or small teams starting their productivity journey.',
    features: [
      'Task Management',
      'Unlimited Projects',
      'Basic Analytics',
      'Mobile App Access',
      'Email Support'
    ],
    buttonText: 'Get started',
    variant: 'ghost'
  },
  {
    name: 'Business plan',
    price: '$29',
    period: 'per month',
    description: 'Built for teams that need advanced features to collaborate and scale.',
    features: [
      'Team Collaboration Tools',
      'Customizable Workflows',
      'Advanced Reporting',
      'Priority Support',
      'Integrations with Popular Apps'
    ],
    buttonText: 'Upgrade to Business',
    variant: 'accent'
  },
  {
    name: 'Enterprise plan',
    price: '$149',
    period: 'per month',
    description: 'Built for large organizations with tailored needs and premium support.',
    features: [
      'Unlimited Team Members',
      'Dedicated Account Manager',
      'Custom Security Features',
      'API Access for Custom Solutions',
      'Onboarding & Training'
    ],
    buttonText: 'Upgrade to Enterprise',
    variant: 'ghost'
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50/50">
      <div className="container max-w-6xl mx-auto py-24 px-4">
        <div className="text-center space-y-2 mb-20">
          <p className="text-sm text-[#969FA2] uppercase tracking-wide">PRICING</p>
          <div className="space-y-1">
            <h1 className="text-[2.5rem] font-medium tracking-tight text-[#2D2D2D]">
              Choose the plan
            </h1>
            <h2 className="text-[2.5rem] font-medium tracking-tight text-[#2D2D2D]">
              that fits your goals.
            </h2>
          </div>
          <p className="mt-6 text-base text-[#969FA2]">
            Choose the plan that fits your needs and scale your productivity with GoalSpace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "group relative rounded-[1.5rem] transition-all duration-500",
                "before:absolute before:inset-0 before:rounded-[1.5rem] before:bg-gradient-to-b before:from-white before:to-gray-50/90 before:backdrop-blur-xl",
                "after:absolute after:inset-0 after:rounded-[1.5rem] after:shadow-[0_2px_20px_-2px_rgba(0,0,0,0.08)]"
              )}
            >
              <div className="relative z-10 p-8 space-y-6">
                {/* Plan Header */}
                <div>
                  <h3 className="text-[15px] font-medium text-[#2D2D2D]">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold text-[#2D2D2D]">{plan.price}</span>
                    <span className="text-sm text-[#969FA2]">{plan.period}</span>
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-[#969FA2]">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <Check className="h-[14px] w-[14px] text-[#969FA2]" />
                      <span className="text-[13px] text-[#969FA2]">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Button */}
                <Button
                  className={cn(
                    'w-full h-11 text-[13px] font-normal rounded-xl transition-all duration-200',
                    'border border-[#EBEBEB]/80',
                    plan.variant === 'accent'
                      ? 'bg-[#2D2D2D] text-white hover:bg-[#1A1A1A]'
                      : 'bg-white text-[#2D2D2D] hover:bg-gray-50'
                  )}
                >
                  {plan.buttonText}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 