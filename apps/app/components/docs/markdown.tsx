import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import { cn } from '@goalspace/ui';

/**
 * The one place a document body becomes formatted output.
 *
 * Documents are markdown — the core design spec says so, and says the editor
 * is "a markdown textarea with preview" rather than the TipTap surface that
 * was deleted with the rest of the old product. This renders the preview half
 * and the read half; the stored body stays plain markdown text throughout.
 *
 * Two safety properties, both covered by tests/unit/markdown.test.ts:
 *
 *  - Raw HTML never becomes elements. `rehype-raw` is deliberately absent, so
 *    anything HTML-shaped in the source is escaped text, and `rehype-sanitize`
 *    is the second line behind that.
 *  - Dangerous URL protocols are dropped, by react-markdown's own default URL
 *    transform.
 *
 * That matters more than it looks: an agent authors document bodies in phase 2,
 * and `projects.visibility` exists so a project can be read by the public. A
 * body is therefore not always written by the person reading it.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('markdown-body prose-measure text-ink', className)}>
      <ReactMarkdown
        // GFM because the spec leans on it: it argues that BOM and parts
        // tracking needs no feature of its own because "a markdown table in a
        // document covers it", and tables are GFM, not CommonMark.
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // A parts table is the one thing here that legitimately gets wider
          // than the measure, so it scrolls inside its own box. Styling it to
          // scroll instead would mean `display: block` on the table, which
          // breaks column alignment.
          table: ({ children: cells }) => (
            <div className="overflow-x-auto">
              <table>{cells}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
