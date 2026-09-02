import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusChip } from '@/components/manual/status-chip';

describe('StatusChip', () => {
  it('always renders a text label alongside the colour', () => {
    render(<StatusChip status="blocked" label="Blocked since 14 March" />);
    expect(screen.getByText('Blocked since 14 March')).toBeInTheDocument();
  });

  it('renders a distinct shape marker for each status', () => {
    const { container: blocked } = render(<StatusChip status="blocked" label="b" />);
    const { container: done } = render(<StatusChip status="done" label="d" />);
    expect(blocked.querySelector('svg')?.innerHTML).not.toBe(done.querySelector('svg')?.innerHTML);
  });

  it('hides the shape marker from assistive technology', () => {
    const { container } = render(<StatusChip status="open" label="o" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
