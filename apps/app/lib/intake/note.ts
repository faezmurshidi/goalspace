import { answeredPairs, type IntakeAnswer } from '@/lib/schemas/intake';

/**
 * The intake answers as one log entry, in the owner's own words.
 *
 * Markdown headings rather than a transcript format, because the log renders
 * markdown and because this entry is read later as reference, not as a record
 * of a conversation. The questions are kept: an answer without its question is
 * unreadable in a month, which is the moment this entry exists for.
 *
 * Returns an empty string when nothing was answered, so the caller can decline
 * to write an entry at all rather than filing one with no content.
 */
export function intakeNoteBody(answers: IntakeAnswer[]): string {
  const answered = answeredPairs(answers);
  if (answered.length === 0) return '';

  return answered.map((a) => `**${a.question}**\n\n${a.answer.trim()}`).join('\n\n');
}
