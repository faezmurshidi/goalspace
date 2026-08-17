import { cn } from '@goalspace/ui';

/**
 * The wordmark, set in Archivo at the display weight and expanded width per
 * DESIGN.md's Width Axis Rule.
 *
 * Deliberately not what it replaced: a Brain icon beside the name in a
 * rose-to-purple-to-cyan `bg-clip-text` gradient. That is the AI startup
 * costume PRODUCT.md names as its primary anti-reference, and gradient text is
 * an absolute ban. One solid ink word does the job.
 *
 * No translation: a product name is not translated.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'wdth-expanded font-sans text-headline font-extrabold tracking-tight text-ink',
        className
      )}
    >
      Goalspace
    </span>
  );
}
