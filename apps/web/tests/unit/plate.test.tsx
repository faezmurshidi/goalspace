import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Plate } from '@/components/manual/plate';

describe('Plate', () => {
  it('renders its number, title, and metadata', () => {
    render(
      <Plate number="01" title="The return" meta="REV C / 2026-08-13">
        <p>Body</p>
      </Plate>
    );

    expect(screen.getByText(/^plate 01$/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The return' })).toBeInTheDocument();
    expect(screen.getByText('REV C / 2026-08-13')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('labels the section by its title for assistive technology', () => {
    render(
      <Plate number="02" title="How the record accrues">
        body
      </Plate>
    );
    expect(screen.getByRole('region', { name: 'How the record accrues' })).toBeInTheDocument();
  });

  it('omits the heading when no title is given', () => {
    render(<Plate number="00">body</Plate>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
