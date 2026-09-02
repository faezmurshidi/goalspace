import { describe, expect, it } from 'vitest';

import {
  answeredPairs,
  applyIntakeSchema,
  intakeAnswersSchema,
  intakeQuestionsSchema,
  unansweredQuestions,
} from '@/lib/schemas/intake';

const question = (n: number) => ({
  id: `q${n}`,
  question: `Question ${n}?`,
  purpose: 'Because.',
});

describe('intakeQuestionsSchema', () => {
  it('rejects fewer than five questions', () => {
    // The bound is the contract, enforced by the schema rather than requested
    // in the prompt. generateObject retries the model against it.
    const four = { questions: [1, 2, 3, 4].map(question) };
    expect(intakeQuestionsSchema.safeParse(four).success).toBe(false);
  });

  it('rejects more than ten', () => {
    const eleven = { questions: Array.from({ length: 11 }, (_, i) => question(i)) };
    expect(intakeQuestionsSchema.safeParse(eleven).success).toBe(false);
  });

  it('accepts five and accepts ten', () => {
    for (const n of [5, 10]) {
      const set = { questions: Array.from({ length: n }, (_, i) => question(i)) };
      expect(intakeQuestionsSchema.safeParse(set).success, `${n} questions`).toBe(true);
    }
  });
});

describe('answeredPairs and unansweredQuestions', () => {
  const answers = [
    { id: 'q1', question: 'What is it?', answer: 'A sawmill.' },
    { id: 'q2', question: 'What is unresolved?', answer: '   ' },
    { id: 'q3', question: 'What is decided?', answer: '' },
  ];

  it('treats whitespace as unanswered', () => {
    // Otherwise a stray space silently becomes an "answer" in the log entry
    // and the question is never offered as an open loop.
    expect(answeredPairs(answers)).toHaveLength(1);
    expect(unansweredQuestions(answers).map((q) => q.id)).toEqual(['q2', 'q3']);
  });

  it('partitions without losing or duplicating a question', () => {
    expect(answeredPairs(answers).length + unansweredQuestions(answers).length).toBe(
      answers.length
    );
  });
});

describe('applyIntakeSchema', () => {
  it('accepts empty selections', () => {
    // Rejecting every proposal and keeping no questions is a legitimate
    // outcome, not a validation failure.
    expect(applyIntakeSchema.safeParse({ proposalIds: [], questionIds: [] }).success).toBe(true);
  });

  it('rejects a proposal id that is not a uuid', () => {
    const bad = { proposalIds: ['not-a-uuid'], questionIds: [] };
    expect(applyIntakeSchema.safeParse(bad).success).toBe(false);
  });
});

describe('intakeAnswersSchema', () => {
  it('caps an answer at 2000 characters', () => {
    const long = { answers: [{ id: 'q1', question: 'How?', answer: 'x'.repeat(2_001) }] };
    expect(intakeAnswersSchema.safeParse(long).success).toBe(false);
  });
});
