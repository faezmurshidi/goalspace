import { describe, expect, it } from 'vitest';

import { intakeNoteBody } from '@/lib/intake/note';

describe('intakeNoteBody', () => {
  const answers = [
    { id: 'q1', question: 'What are you building?', answer: 'A bandsaw sawmill.' },
    { id: 'q2', question: 'What is unresolved?', answer: '' },
    { id: 'q3', question: 'What constrains it?', answer: 'A 3kW single-phase supply.' },
  ];

  it('includes only the answered questions', () => {
    // An unanswered question is an open loop, recorded as a work item. Putting
    // it in the note as a heading with nothing under it would say the owner
    // answered and had nothing to say.
    const body = intakeNoteBody(answers);
    expect(body).toContain('What are you building?');
    expect(body).toContain('A bandsaw sawmill.');
    expect(body).not.toContain('What is unresolved?');
  });

  it('keeps the questions in the order they were asked', () => {
    const body = intakeNoteBody(answers);
    expect(body.indexOf('What are you building?')).toBeLessThan(
      body.indexOf('What constrains it?')
    );
  });

  it('returns an empty string when nothing was answered', () => {
    // The caller writes no entry at all in this case; a document of headings
    // with no content would put an empty note in the log.
    expect(intakeNoteBody([{ id: 'q1', question: 'Why?', answer: '  ' }])).toBe('');
  });

  it('emits no markdown syntax', () => {
    // Entry bodies render as plain text with `whitespace-pre-line`, in the log
    // (log/page.tsx) and in the resume view's "where you left off"
    // (resume/regions.tsx). Only documents go through the Markdown component.
    // Emphasis markers here reach the owner as literal asterisks in their own
    // record — verified in the browser before this test existed.
    const body = intakeNoteBody(answers);
    expect(body).not.toContain('**');
    expect(body).not.toMatch(/^#/m);
  });

  it('puts the question and its answer on adjacent lines', () => {
    // The pair has to read as a pair with no styling to carry it, so the
    // answer sits directly under its question and a blank line separates
    // one pair from the next.
    const body = intakeNoteBody(answers);
    expect(body).toContain(
      'What are you building?\nA bandsaw sawmill.\n\nWhat constrains it?\nA 3kW single-phase supply.'
    );
  });
});
