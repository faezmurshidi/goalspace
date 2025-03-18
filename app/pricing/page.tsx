'use client';

import { Suspense } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Define the plan type with proper types
type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'; // Match Button variant types
  popular?: boolean;
};

const plans: Plan[] = [
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
    variant: 'ghost',
    popular: false
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
    variant: 'default',
    popular: true
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

// Separate content component
function PricingPageContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50/50">
      <div className="container max-w-6xl mx-auto py-24 px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card key={plan.name} className={cn(
              "flex flex-col",
              plan.popular && "border-primary shadow-md"
            )}>
              {plan.popular && (
                <div className="px-4 py-1 text-xs font-semibold text-center text-white bg-primary">
                  MOST POPULAR
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-gray-500 ml-2">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={plan.variant || "default"}
                >
                  {plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center max-w-2xl mx-auto bg-gray-50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Enterprise Plan</h2>
          <p className="text-gray-600 mb-6">
            Need a custom solution for your organization? Our enterprise plan offers tailored features, dedicated support, and customizable pricing.
          </p>
          <Button variant="outline">Contact Sales</Button>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto grid gap-6 mt-8">
            {/* FAQ items would go here */}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function PricingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading pricing information...</div>}>
      <PricingPageContent />
    </Suspense>
  );
} 