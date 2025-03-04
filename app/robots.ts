import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_lib/', '/dashboard/'],
    },
    sitemap: 'https://goalspace.com/sitemap.xml',
    host: 'https://goalspace.com',
  };
} 