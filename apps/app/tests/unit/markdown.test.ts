import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Markdown } from '@/components/docs/markdown';

/**
 * The renderer is a security boundary, not only a formatting one.
 *
 * Document bodies are not always typed by the person reading them: phase 2
 * agents author them, and `projects.visibility` exists so a project can be
 * read by the public. An unsanitised body is therefore a stored-XSS path, and
 * these assertions are the regression gate on it.
 *
 * This suite runs in vitest's node environment with no DOM — `renderToStaticMarkup`
 * exercises the real component with its real plugin chain and returns a string.
 */
function render(markdown: string): string {
  return renderToStaticMarkup(createElement(Markdown, { children: markdown }));
}

describe('Markdown formatting', () => {
  it('renders headings as headings rather than literal hashes', () => {
    const html = render('## Tradeoffs');
    expect(html).toContain('<h2');
    expect(html).toContain('Tradeoffs');
    expect(html).not.toContain('## Tradeoffs');
  });

  it('renders lists as lists', () => {
    const html = render('- NEMA 17\n- Harmonic drive');
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('NEMA 17');
  });

  it('renders emphasis', () => {
    expect(render('a **loud** servo')).toContain('<strong');
  });

  it('renders GFM tables', () => {
    // The core design spec argues that BOM and parts tracking needs no feature
    // of its own because "a markdown table in a document covers it". Tables are
    // GFM, not CommonMark, so dropping remark-gfm would quietly break that.
    const html = render('| Part | Cost |\n| --- | --- |\n| Servo | 12 |');
    expect(html).toContain('<table');
    expect(html).toContain('<td');
    expect(html).toContain('Servo');
  });

  it('keeps hard line breaks between paragraphs', () => {
    const html = render('First para.\n\nSecond para.');
    expect(html.match(/<p/g)).toHaveLength(2);
  });
});

describe('Markdown sanitisation', () => {
  it('does not emit a script element', () => {
    const html = render('before <script>alert(1)</script> after');
    expect(html).not.toContain('<script');
    expect(html).toContain('before');
  });

  it('does not emit an inline event handler', () => {
    const html = render('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain('onerror');
  });

  it('does not emit a javascript: link', () => {
    const html = render('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('does not emit a javascript: image source', () => {
    const html = render('![alt](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('does not emit raw iframes', () => {
    const html = render('<iframe src="https://evil.test"></iframe>');
    expect(html).not.toContain('<iframe');
  });

  it('still renders ordinary links', () => {
    const html = render('[datasheet](https://example.test/ds.pdf)');
    expect(html).toContain('href="https://example.test/ds.pdf"');
  });
});
