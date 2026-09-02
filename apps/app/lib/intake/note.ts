import { answeredPairs, type IntakeAnswer } from '@/lib/schemas/intake';

/**
 * The intake answers as one log entry, in the owner's own words.
 *
 * Plain text, deliberately. Entry bodies are rendered with `whitespace-pre-line`
 * and nothing else — in the log (`log/page.tsx`) and in the resume view's
 * "where you left off" (`resume/regions.tsx`). Only documents pass through the
 * `Markdown` component. An earlier version wrapped each question in `**`, which
 * reached the owner as literal asterisks in their own record.
 *
 * So the shape carries itself: the answer sits directly under its question, a
 * blank line separates one pair from the next. The questions are kept because
 * an answer without its question is unreadable in a month, which is the moment
 * this entry exists for.
 *
 * Returns an empty string when nothing was answered, so the caller can decline
 * to write an entry at all rather than filing one with no content.
 */
export function intakeNoteBody(answers: IntakeAnswer[]): string {
  const answered = answeredPairs(answers);
  if (answered.length === 0) return '';

  return answered.map((a) => `${a.question}\n${a.answer.trim()}`).join('\n\n');
}
