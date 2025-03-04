'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BlogSection } from '@/components/blog-section';
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

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .order('published_at', { ascending: false });

        if (error) throw error;

        // Transform the data to match the BlogPost interface
        const transformedPosts = data.map((post: any) => ({
          id: post.id,
          title: post.title,
          description: post.description,
          content: post.content,
          author: {
            name: post.author_name,
            avatar: post.author_avatar,
          },
          publishedAt: post.published_at,
          readingTime: `${Math.ceil(post.content.split(' ').length / 200)} min read`,
          category: post.category,
          tags: post.tags || [],
        }));

        setPosts(transformedPosts);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [supabase]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <h1
          className={cn(
            'text-4xl font-bold tracking-tight',
            'bg-gradient-to-r from-purple-600 via-primary to-cyan-600 bg-clip-text text-transparent',
            'dark:from-purple-300 dark:via-primary dark:to-cyan-300'
          )}
        >
          Blog
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Discover insights, tutorials, and updates about your learning journey and goal achievements.
        </p>
      </div>

      {/* Blog Content */}
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-2 text-sm text-muted-foreground">Loading posts...</p>
          </div>
        </div>
      ) : (
        <BlogSection posts={posts} />
      )}
    </div>
  );
} 