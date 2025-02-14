import { motion } from 'framer-motion';
import { Book, Calendar, Clock, User } from 'lucide-react';

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
  content: string;
  author: {
    name: string;
    avatar?: string;
  };
  publishedAt: string;
  readingTime: string;
  category: string;
  tags: string[];
}

interface BlogSectionProps {
  posts: BlogPost[];
}

export function BlogSection({ posts }: BlogSectionProps) {
  return (
    <div className="space-y-8">
      {/* Featured Post */}
      {posts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={cn(
            'overflow-hidden transition-all duration-500',
            'bg-gradient-to-br from-purple-50 via-white to-cyan-50',
            'hover:shadow-lg hover:shadow-primary/5',
            'dark:from-purple-500/5 dark:via-background dark:to-cyan-500/5',
            'dark:hover:shadow-primary/10'
          )}>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {posts[0].category}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(posts[0].publishedAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {posts[0].readingTime}
                </span>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {posts[0].title}
              </CardTitle>
              <CardDescription className="text-base">
                {posts[0].description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-2">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{posts[0].author.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Blog Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.slice(1).map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={cn(
              'group h-full overflow-hidden transition-all duration-500',
              'hover:shadow-lg hover:shadow-primary/5',
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
                <CardTitle className="line-clamp-2 text-xl">
                  {post.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {post.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-2">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{post.author.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 