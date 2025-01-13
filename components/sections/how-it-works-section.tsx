const steps = [
  {
    number: '01',
    title: 'Define Your Goal',
    description: 'Tell us what you want to achieve',
  },
  {
    number: '02',
    title: 'Get Your Plan',
    description: 'Receive a personalized learning path',
  },
  {
    number: '03',
    title: 'Start Learning',
    description: 'Follow your structured journey to success',
  },
];

export function HowItWorksSection() {
  return (
    <section className="border-t">
      <div className="container mx-auto px-4 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Get started in minutes with our simple three-step process.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative rounded-2xl border bg-background p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-6 text-4xl font-bold text-primary/20">{step.number}</div>
              <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
