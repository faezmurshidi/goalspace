import type { ReactNode } from 'react';
import { cn } from '@goalspace/ui';

interface PlateProps {
  number: string;
  /**
   * The already-localized "Plate {{number}}" string. Callers hold the
   * `t` function (Plate itself takes no i18n dependency so it stays a
   * plain, router-free component that's simple to unit test), so they
   * pass `t('common.plateLabel', { number })` through. Falls back to the
   * bare English form so existing callers and tests that don't pass it
   * keep working unchanged.
   */
  label?: string;
  title?: string;
  meta?: string;
  drenched?: boolean;
  className?: string;
  children: ReactNode;
}

export function Plate({
  number,
  label,
  title,
  meta,
  drenched = false,
  className,
  children,
}: PlateProps) {
  const headingId = title ? `plate-${number}-heading` : undefined;
  const resolvedLabel = label ?? `Plate ${number}`;

  return (
    <section
      aria-labelledby={headingId}
      aria-label={title ? undefined : resolvedLabel}
      className={cn(
        'relative px-6 py-10 md:px-16 md:py-16',
        drenched ? 'bg-oxide-deep text-paper' : 'border border-rule bg-paper text-ink',
        className
      )}
    >
      <span className={cn('label mb-6 block', drenched ? 'text-paper-soft' : 'text-oxide')}>
        {resolvedLabel}
      </span>

      {title ? (
        <h2
          id={headingId}
          className={cn('mb-4 wdth-wide', drenched ? 'text-display' : 'text-headline')}
        >
          {title}
        </h2>
      ) : null}

      {children}

      {meta ? (
        <span
          className={cn(
            'label mt-10 block text-right',
            drenched ? 'text-paper-soft' : 'text-ink-soft'
          )}
        >
          {meta}
        </span>
      ) : null}
    </section>
  );
}
