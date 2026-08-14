export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  publishedAt: string;
  updatedAt: string;
  coverImage: string;
  readingTime: number;
  tags: string[];
  featured: boolean;
}

// Intentionally empty. This route previously shipped three posts describing
// a shipping AI mentor product that has since been removed (see
// PRODUCT.md / landing.agent in packages/i18n/src/locales/en.json: the
// agent is explicitly "not built yet"), and attributed them to invented
// named people. Neither belongs on the site. The blog list renders a clean
// empty ruled table with no posts here, rather than fabricated content.
export const blogPosts: BlogPost[] = [];

export function getBlogPosts() {
  return blogPosts;
}

export function getFeaturedPosts() {
  return blogPosts.filter(post => post.featured);
}

export function getPostBySlug(slug: string) {
  return blogPosts.find(post => post.slug === slug);
}

export function getRelatedPosts(slug: string, limit = 2) {
  const currentPost = getPostBySlug(slug);
  if (!currentPost) return [];

  // Find posts with matching tags, excluding the current post
  return blogPosts
    .filter(post =>
      post.slug !== slug &&
      post.tags.some(tag => currentPost.tags.includes(tag))
    )
    .slice(0, limit);
}
