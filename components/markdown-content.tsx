'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
        components={{
          // Custom components for markdown elements
          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-bold mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="mb-4 text-gray-600 dark:text-gray-300" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="text-blue-500 hover:text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ node, inline, ...props }) =>
            inline ? (
              <code
                className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono"
                {...props}
              />
            ) : (
              <code
                className="block bg-gray-100 dark:bg-gray-800 rounded p-4 text-sm font-mono overflow-x-auto"
                {...props}
              />
            ),
          pre: ({ node, ...props }) => (
            <pre className="bg-gray-100 dark:bg-gray-800 rounded p-4 mb-4 overflow-x-auto" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 italic mb-4"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 