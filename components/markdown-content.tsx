'use client';

import { useEffect } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ComponentPropsWithoutRef } from 'react';

interface MarkdownContentProps {
  content: string;
}

interface CodeProps extends ComponentPropsWithoutRef<'code'> {
  inline?: boolean;
  node?: any;
  match?: any;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  useEffect(() => {
    // Initialize mermaid with dark theme configuration
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      mindmap: {
        padding: 10,
        useMaxWidth: true,
      },
    });
  }, []);

  useEffect(() => {
    // Re-render mermaid diagrams when content changes
    mermaid.contentLoaded();
  }, [content]);

  const components: Components = {
    code: function Code({ className, children, inline, ...rest }: CodeProps) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      if (language === 'mermaid') {
        return (
          <div className="mermaid my-4 bg-background/50 p-4 rounded-lg">
            {String(children).replace(/\\n/g, '\n')}
          </div>
        );
      }

      if (inline) {
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      }

      return (
        <div className="rounded-lg !bg-background/50 !p-4">
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language}
            PreTag="div"
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    },
    // Add styles for other markdown elements
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mt-6 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-medium mt-4 mb-2">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mb-4 leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="ml-4">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic">
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-border">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 text-left font-medium">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 border-t border-border">
        {children}
      </td>
    ),
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}

// Add custom styles to tailwind.config.ts 