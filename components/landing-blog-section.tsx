import { motion } from 'framer-motion';
import { ArrowRight, Book, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BlogPost {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  readingTime: string;
  category: string;
}

interface LandingBlogSectionProps {
  posts: BlogPost[];
}

export function LandingBlogSection({ posts }: LandingBlogSectionProps) {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        <div
          className="absolute inset-y-0 left-0 -translate-x-1/2 w-[200%] rotate-[-35deg]
            bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-background
            dark:from-purple-500/10 dark:via-cyan-500/10 dark:to-background"
        />
      </div>

      <div className="container relative mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Book className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-primary">
                Latest from our Blog
              </h2>
            </div>
            <h3 className={cn(
              'text-3xl font-bold tracking-tight sm:text-4xl',
              'bg-gradient-to-r from-purple-600 via-primary to-cyan-600 bg-clip-text text-transparent',
              'dark:from-purple-300 dark:via-primary dark:to-cyan-300'
            )}>
              Insights & Resources
            </h3>
            <p className="mt-4 text-lg text-muted-foreground">
              Discover expert tips, strategies, and insights to help you achieve your goals and enhance your learning journey.
            </p>
          </motion.div>
        </div>

        {/* Blog Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={`/blog/${post.id}`}>
                <Card className={cn(
                  'group h-full overflow-hidden transition-all duration-500',
                  'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5',
                  'dark:hover:shadow-primary/10'
                )}>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {post.readingTime}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {post.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Link href="/blog">
            <Button
              size="lg"
              className={cn(
                'group',
                'bg-gradient-to-r from-purple-600 via-primary to-cyan-600',
                'hover:from-purple-500 hover:via-primary/90 hover:to-cyan-500',
                'dark:from-purple-400 dark:via-primary dark:to-cyan-400',
                'dark:hover:from-purple-300 dark:hover:via-primary/90 dark:hover:to-cyan-300'
              )}
            >
              View all posts
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
} 