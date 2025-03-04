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
    <section className="border-t bg-gray-50/50 dark:bg-gray-900/50" aria-labelledby="testimonials-heading">
      <div className="container mx-auto px-4 py-24">
        <div className="text-center">
          <h2 id="testimonials-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by learners worldwide
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Join thousands of satisfied users who have transformed their learning journey.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {testimonials.map((testimonial, i) => (
            <article
              key={i}
              className="relative rounded-2xl border bg-background p-8 shadow-sm transition-shadow hover:shadow-md"
              role="listitem"
              itemScope
              itemType="https://schema.org/Review"
            >
              <div className="mb-4 flex" aria-label={`${testimonial.rating} out of 5 stars`}>
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                ))}
                <meta itemProp="reviewRating" content={testimonial.rating.toString()} />
              </div>
              <blockquote itemProp="reviewBody" className="text-sm text-muted-foreground">&quot;{testimonial.content}&quot;</blockquote>
              <footer className="mt-4">
                <cite className="not-italic">
                  <p className="font-semibold" itemProp="author">{testimonial.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400" itemProp="authorJobTitle">{testimonial.role}</p>
                </cite>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
