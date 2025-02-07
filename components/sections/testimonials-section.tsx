import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Software Developer',
    content: 'This platform helped me structure my learning journey effectively.',
    rating: 5,
  },
  {
    name: 'Michael Park',
    role: 'Data Scientist',
    content: 'The AI mentorship feature is incredibly helpful for staying on track.',
    rating: 5,
  },
  {
    name: 'Emma Wilson',
    role: 'UX Designer',
    content: 'Perfect for organizing multiple learning goals simultaneously.',
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="border-t bg-gray-50/50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by learners worldwide
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Join thousands of satisfied users who have transformed their learning journey.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="relative rounded-2xl border bg-background p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">&quot;{testimonial.content}&quot;</p>
              <div>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
