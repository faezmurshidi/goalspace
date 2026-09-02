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
  /**
   * True on a drenched (Oxide Deep) plate. The caption tone follows the
   * plate the same way `Plate` tones its own meta text: `text-ink-soft`
   * reads at roughly 1.09:1 against Oxide Deep, far below AA, so a drenched
   * figure needs the paper-based tone instead (DESIGN.md #1, contrast).
   */
  drenched?: boolean;
  /**
   * Renders the sr-only "Callout N." label read out before each callout's
   * text. Callers already hold the translation function (mirroring
   * `Plate`'s own `label` prop, for the same testability reason: this
   * component takes no i18n dependency of its own), so this stays a plain
   * function prop rather than a hook call inside the component. Falls back
   * to the literal English form so existing callers and tests that don't
   * pass it keep working unchanged.
   */
  calloutSrLabel?: (n: number) => string;
}

export function AnnotatedFigure({
  caption,
  callouts,
  children,
  className,
  drenched = false,
  calloutSrLabel = (n) => `Callout ${n}.`,
}: AnnotatedFigureProps) {
  return (
    <figure aria-label={caption} className={cn('m-0', className)}>
      <div className="relative mx-auto max-w-[640px]">
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
          <g className="[&_*]:stroke-ink [&_*]:fill-none [&_*]:[stroke-width:1.5] [&_*]:[vector-effect:non-scaling-stroke]">
            {children}
          </g>

          {/*
            `non-scaling-stroke` is scoped per-group, not inherited from the
            drawing group above (a sibling, not an ancestor): without it here
            too, a `stroke-width:1` user unit scales with the viewBox instead
            of staying a true 1px, so at a few hundred CSS px of rendered
            width it reads as a much heavier line than the One Weight Rule
            and DESIGN.md's own "Leader lines 1px Rule" call for.
          */}
          <g className="hidden sm:block [&_*]:[vector-effect:non-scaling-stroke]">
            {callouts.map((c) => (
              <g key={c.n}>
                <line
                  x1={c.x}
                  y1={c.y}
                  x2={c.x < 50 ? 4 : 96}
                  y2={c.y}
                  className="stroke-rule [stroke-width:1]"
                />
                <circle cx={c.x} cy={c.y} r="0.35" className="fill-ink stroke-ink" />
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
              className="callout-num label bg-oxide text-paper mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
            >
              {c.n}
            </span>
            <span className="sr-only">{calloutSrLabel(c.n)}</span>
            <span className="text-body">{c.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className={cn('label mt-6', drenched ? 'text-paper-soft' : 'text-ink-soft')}>
        {caption}
      </figcaption>
    </figure>
  );
}
