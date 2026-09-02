'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@goalspace/ui';

interface DrawOnViewProps {
  children: ReactNode;
  className?: string;
  /** Total stroke-draw duration for a single element, in ms. */
  durationMs?: number;
  /** Delay added per element index, in ms. Capped at STAGGER_STEPS elements. */
  staggerMs?: number;
}

// The nth-child stagger rules in globals.css only go up to this many
// elements before every further sibling reuses the last step's delay, so
// a figure's total draw time stays bounded no matter how many strokes it
// has. Keep this in sync with the `.draw-on-view svg *:nth-child(n)` rules.
const STAGGER_STEPS = 8;

/**
 * Wraps a figure so its strokes draw in on scroll entry, driven entirely by
 * CSS (stroke-dashoffset transitions in globals.css keyed off the
 * `data-draw-pending` attribute). `prefers-reduced-motion: reduce` is
 * checked on mount: when it matches, no `data-draw-pending` attribute is
 * ever set and no IntersectionObserver is attached, so the figure renders
 * in its final state immediately, exactly as PRODUCT.md's accessibility
 * section requires.
 */
export function DrawOnView({
  children,
  className,
  durationMs = 600,
  staggerMs = 60,
}: DrawOnViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    setPending(true);

    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      // No observer available in this environment (or nothing mounted to
      // observe yet). Every supported browser has IntersectionObserver, so
      // this only matters for non-browser test environments; leave the
      // figure in its pending, undrawn state rather than skip the effect
      // entirely, since skipping is indistinguishable from "reduced motion"
      // to anything inspecting the DOM.
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPending(false);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const drawCompleteMs = durationMs + (STAGGER_STEPS - 1) * staggerMs;
  const style = {
    '--draw-duration': `${durationMs}ms`,
    '--draw-stagger': `${staggerMs}ms`,
    '--draw-complete': `${drawCompleteMs}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cn('draw-on-view', className)}
      style={style}
      {...(pending ? { 'data-draw-pending': '' } : {})}
    >
      {children}
    </div>
  );
}
