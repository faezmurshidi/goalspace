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
});
