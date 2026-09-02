import { z } from 'zod';

/**
 * The intake's own shapes.
 *
 * `intakeQuestionsSchema` is handed to `generateObject`, so its bounds are the
 * contract with the model: a set outside five-to-ten is rejected at the tool
 * layer and retried, rather than asked for in the prompt and hoped for.
 */

export const intakeQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  question: z.string().min(1).max(300),
  /**
   * Why the question is worth asking. Never rendered — a question that needs
   * justifying to the owner is a badly written question. It exists so the
   * model has somewhere to put its reasoning instead of smuggling it into the
   * question text.
   */
  purpose: z.string().max(300),
});

export const intakeQuestionsSchema = z.object({
  questions: z.array(intakeQuestionSchema).min(5).max(10),
});

export const intakeAnswerSchema = intakeQuestionSchema
  .omit({ purpose: true })
  .extend({ answer: z.string().max(2_000) });

export const intakeAnswersSchema = z.object({
  answers: z.array(intakeAnswerSchema).min(1).max(10),
});

export const applyIntakeSchema = z.object({
  /** Proposed work items the owner ticked. */
  proposalIds: z.array(z.string().uuid()).max(12),
  /** Unanswered questions the owner chose to keep as open loops. */
  questionIds: z.array(z.string().min(1).max(64)).max(10),
});

export type IntakeQuestion = z.infer<typeof intakeQuestionSchema>;
export type IntakeAnswer = z.infer<typeof intakeAnswerSchema>;
export type ApplyIntakeValues = z.infer<typeof applyIntakeSchema>;

/**
 * Whitespace is not an answer.
 *
 * Treating "   " as answered would put an empty line in the log entry under a
 * question heading, and would silently deny the owner the chance to keep that
 * question as an open loop.
 */
function isAnswered(a: IntakeAnswer): boolean {
  return a.answer.trim().length > 0;
}

export function answeredPairs(answers: IntakeAnswer[]): IntakeAnswer[] {
  return answers.filter(isAnswered);
}

export function unansweredQuestions(answers: IntakeAnswer[]): IntakeAnswer[] {
  return answers.filter((a) => !isAnswered(a));
}
