import type { ReactNode } from 'react';
import { cn } from '@goalspace/ui';

export interface Callout {
  n: number;
  label: string;
  x: number;
  y: number;
}

interface AnnotatedFigureProps {
  caption: string;
  callouts: Callout[];
  children: ReactNode;
  className?: string;
}

export function AnnotatedFigure({ caption, callouts, children, className }: AnnotatedFigureProps) {
  return (
    <figure aria-label={caption} className={cn('m-0', className)}>
      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className="w-full"
        >
          {/*
            Scoped to this <g> rather than the whole <svg> so a figure's own
            drawing content (children) is the only thing forced to the ink
            outline weight. If a future figure sets its own stroke colour or
            width inside {children}, note that Tailwind resolves same-specificity
            classes by stylesheet order, not JSX position or DOM nesting, so an
            equal-specificity utility here can still win over one written inline
            on the child element. Keep drawing-specific stroke overrides at a
            higher specificity (e.g. an arbitrary selector or a wrapping <g>
            deeper than this one) rather than relying on JSX order.
          */}
          <g className="[&_*]:fill-none [&_*]:stroke-ink [&_*]:[stroke-width:1.5] [&_*]:[vector-effect:non-scaling-stroke]">
            {children}
          </g>

          <g className="hidden sm:block">
            {callouts.map((c) => (
              <g key={c.n}>
                <line
                  x1={c.x}
                  y1={c.y}
                  x2={c.x < 50 ? 4 : 96}
                  y2={c.y}
                  className="stroke-rule [stroke-width:1]"
                />
                <circle cx={c.x} cy={c.y} r="0.8" className="fill-ink stroke-ink" />
              </g>
            ))}
          </g>
        </svg>
      </div>

      <ol className="mt-8 grid gap-3 sm:grid-cols-2">
        {callouts.map((c) => (
          <li key={c.n} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="callout-num label mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-oxide text-paper"
            >
              {c.n}
            </span>
            <span className="sr-only">Callout {c.n}.</span>
            <span className="text-body">{c.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="label mt-6 text-ink-soft">{caption}</figcaption>
    </figure>
  );
}
