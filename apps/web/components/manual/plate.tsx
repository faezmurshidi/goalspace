import type { ReactNode } from 'react';
import { cn } from '@goalspace/ui';

interface PlateProps {
  number: string;
  title?: string;
  meta?: string;
  drenched?: boolean;
  className?: string;
  children: ReactNode;
}

export function Plate({ number, title, meta, drenched = false, className, children }: PlateProps) {
  const headingId = title ? `plate-${number}-heading` : undefined;

  return (
    <section
      aria-labelledby={headingId}
      aria-label={title ? undefined : `Plate ${number}`}
      className={cn(
        'relative px-6 py-10 md:px-16 md:py-16',
        drenched ? 'bg-oxide-deep text-paper' : 'border border-rule bg-paper text-ink',
        className
      )}
    >
      <span className={cn('label mb-6 block', drenched ? 'text-paper/75' : 'text-oxide')}>
        Plate {number}
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
            drenched ? 'text-paper/75' : 'text-ink-soft'
          )}
        >
          {meta}
        </span>
      ) : null}
    </section>
  );
}
