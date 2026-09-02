import type { ReactElement } from 'react';
import { cn } from '@goalspace/ui';

export type Status = 'open' | 'doing' | 'blocked' | 'done' | 'dropped';

/**
 * The Two Signals Rule (DESIGN.md 2) limits colour to oxide (live) and
 * waiting-blue (blocked). Every status still needs to survive greyscale and
 * colour blindness, so each one also gets a distinct glyph: status is never
 * encoded by colour alone (PRODUCT.md, Accessibility & Inclusion).
 */
const MARKS: Record<Status, { mark: ReactElement; tone: string }> = {
  open: {
    mark: <rect x="1" y="1" width="6" height="6" fill="none" stroke="currentColor" />,
    tone: 'text-ink',
  },
  doing: {
    mark: <path d="M1 4 L4 1 L7 4 L4 7 Z" fill="currentColor" />,
    tone: 'text-oxide',
  },
  blocked: {
    mark: <rect x="0" y="0" width="8" height="8" fill="currentColor" />,
    tone: 'text-waiting',
  },
  done: {
    mark: <path d="M0 4 L3 7 L8 1" fill="none" stroke="currentColor" strokeWidth="2" />,
    tone: 'text-ink-soft',
  },
  dropped: {
    mark: <path d="M0 0 L8 8 M8 0 L0 8" fill="none" stroke="currentColor" />,
    tone: 'text-ink-soft',
  },
};

interface StatusChipProps {
  status: Status;
  label: string;
  className?: string;
}

export function StatusChip({ status, label, className }: StatusChipProps) {
  const { mark, tone } = MARKS[status];

  return (
    <span
      className={cn(
        'label border-rule inline-flex items-center gap-2 border px-2 py-1',
        tone,
        className
      )}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="shrink-0">
        {mark}
      </svg>
      {label}
    </span>
  );
}
