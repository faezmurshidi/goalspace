import { describe, expect, it } from 'vitest';

import { previewText } from '@/lib/text';

describe('previewText', () => {
  it('returns short text unchanged', () => {
    expect(previewText('Frame from 100x50 RHS', 80)).toBe('Frame from 100x50 RHS');
  });

  it('returns text of exactly the limit unchanged', () => {
    expect(previewText('abcde', 5)).toBe('abcde');
  });

  it('truncates and marks the cut', () => {
    expect(previewText('abcdefghij', 5)).toBe('abcde…');
  });

  it('counts an astral character as one, not two', () => {
    // A surrogate pair is two UTF-16 units but one character to a reader, so a
    // UTF-16 budget would cut this preview half as short as asked.
    expect(previewText('𝐀𝐁𝐂𝐃𝐄', 5)).toBe('𝐀𝐁𝐂𝐃𝐄');
  });

  it('never splits a surrogate pair', () => {
    const out = previewText('𝐀𝐁𝐂𝐃𝐄𝐅', 3);
    expect(out).toBe('𝐀𝐁𝐂…');
    // A lone surrogate would render as a replacement glyph.
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(out)).toBe(false);
  });

  it('keeps a combining mark with the character it modifies', () => {
    // "e" + combining acute is two code points but one grapheme; cutting
    // between them leaves a stray accent floating on the next character.
    const text = 'café society';
    expect(previewText(text, 4)).toBe('café…');
  });

  it('keeps a ZWJ emoji sequence intact', () => {
    // Family emoji: several code points joined by zero-width joiners. Splitting
    // it produces a row of unrelated people.
    const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
    expect(previewText(`${family}ab`, 2)).toBe(`${family}a…`);
  });

  it('keeps a flag intact', () => {
    // Regional indicator pairs are one grapheme.
    const flag = '\u{1F1F2}\u{1F1FE}';
    expect(previewText(`${flag}xyz`, 2)).toBe(`${flag}x…`);
  });

  it('handles an empty string', () => {
    expect(previewText('', 10)).toBe('');
  });
});
