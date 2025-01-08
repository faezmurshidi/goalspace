import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
  {
    name: 'Free',
    description: 'Perfect for getting started with GoalSpace',
    price: '£0',
    features: [
      'Basic goal-setting functionality with Faez',
      'Access to one learning space at a time',
      'Standard AI mentor support',
      'Basic content modules',
      'Limited progress-tracking features',
      'Community support',
      'Standard platform access',
      '50 API requests per hour',
      '10 Faez interactions per day',
      '20 mentor interactions per day'
    ],
    buttonText: 'Get Started',
    popular: false
  },
  {
    name: 'Lite',
    description: 'Great for serious learners',
    price: '£9.99',
    features: [
      'All Free features, plus:',
      'Up to three concurrent learning spaces',
      'Enhanced mentor support',
      'Interactive mindmaps & quizzes',
      'Advanced progress-tracking',
      'Priority support',
      'Full platform access',
      '500 API requests per hour',
      '50 Faez interactions per day',
      '100 mentor interactions per day'
    ],
    buttonText: 'Start Trial',
    popular: true
  },
  {
    name: 'Pro',
    description: 'For power users and professionals',
    price: '£19.99',
    features: [
      'All Lite features, plus:',
      'Unlimited learning spaces',
      'Premium mentor support',
      'Advanced content modules',
      'Comprehensive analytics',
      'Priority customer support',
      'Third-party integrations',
      'Early access to features',
      'Unlimited AI interactions',
      'Full Wolfram Alpha API access'
    ],
    buttonText: 'Start Trial',
    popular: false
  }
];

export default function PricingPage() {
  return (
    <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Choose the plan that best fits your learning journey
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={`relative flex flex-col ${
              plan.popular 
                ? 'border-blue-500 shadow-lg scale-105' 
                : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className={`w-full ${
                  plan.popular 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : ''
                }`}
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          All plans include a 14-day free trial. No credit card required.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Need a custom plan? <a href="/contact" className="text-blue-500 hover:underline">Contact us</a>
        </p>
      </div>
    </div>
  );
} 