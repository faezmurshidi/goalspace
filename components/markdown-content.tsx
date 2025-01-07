'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { cn } from '@/lib/utils';
import type { Components } from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const components: Partial<Components> = {
    h1: ({ children, ...props }) => (
      <h1 
        className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors" 
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 
        className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors" 
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 
        className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors" 
        {...props}
      >
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => (
      <p 
        className="mb-4 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors leading-relaxed" 
        {...props}
      >
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul 
        className="list-disc list-inside mb-4 space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors" 
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol 
        className="list-decimal list-inside mb-4 space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors" 
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li 
        className="mb-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded transition-colors" 
        {...props}
      >
        {children}
      </li>
    ),
    a: ({ children, ...props }) => (
      <a
        className="text-blue-500 hover:text-blue-600 underline decoration-blue-500/30 hover:decoration-blue-500 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    code: ({ children, className, inline, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline ? (
        <code
          className={cn(
            "block bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm font-mono overflow-x-auto border border-gray-200 dark:border-gray-700",
            className
          )}
          {...props}
        >
          {children}
        </code>
      ) : (
        <code
          className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded px-1.5 py-0.5 text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre 
        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors" 
        {...props}
      >
        {children}
      </pre>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 italic mb-4 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-r-md transition-colors"
        {...props}
      >
        {children}
      </blockquote>
    ),
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto mb-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
        <table 
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" 
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th
        className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td 
        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" 
        {...props}
      >
        {children}
      </td>
    ),
    img: ({ ...props }) => (
      <img
        className="rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        {...props}
        loading="lazy"
      />
    ),
    hr: ({ ...props }) => (
      <hr
        className="my-8 border-t border-gray-200 dark:border-gray-700"
        {...props}
      />
    ),
  };

  return (
    <div className={cn("prose dark:prose-invert max-w-none notion-like", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Add custom styles to tailwind.config.ts 