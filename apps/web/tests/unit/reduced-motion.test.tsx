import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DrawOnView } from '@/components/manual/draw-on-view';

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

describe('DrawOnView', () => {
  it('renders content in its final state when reduced motion is requested', () => {
    mockReducedMotion(true);
    const { container } = render(
      <DrawOnView>
        <svg>
          <line x1="0" y1="0" x2="10" y2="10" />
        </svg>
      </DrawOnView>
    );
    expect(container.firstElementChild).not.toHaveAttribute('data-draw-pending');
  });

  it('marks content as pending when motion is allowed', () => {
    mockReducedMotion(false);
    const { container } = render(
      <DrawOnView>
        <svg>
          <line x1="0" y1="0" x2="10" y2="10" />
        </svg>
      </DrawOnView>
    );
    expect(container.firstElementChild).toHaveAttribute('data-draw-pending');
  });
});
