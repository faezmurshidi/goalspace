import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnnotatedFigure } from '@/components/manual/annotated-figure';

const callouts = [
  { n: 1, label: 'You were away 23 days', x: 20, y: 30 },
  { n: 2, label: 'Blocked since 14 March', x: 70, y: 55 },
];

describe('AnnotatedFigure', () => {
  it('renders every callout label as text', () => {
    render(
      <AnnotatedFigure caption="Project state on return" callouts={callouts}>
        <rect x="10" y="10" width="80" height="80" />
      </AnnotatedFigure>
    );

    expect(screen.getByText('You were away 23 days')).toBeInTheDocument();
    expect(screen.getByText('Blocked since 14 March')).toBeInTheDocument();
  });

  it('exposes the figure with its caption', () => {
    render(
      <AnnotatedFigure caption="Project state on return" callouts={callouts}>
        <rect x="10" y="10" width="80" height="80" />
      </AnnotatedFigure>
    );

    expect(screen.getByRole('figure', { name: 'Project state on return' })).toBeInTheDocument();
  });

  it('numbers the callouts in the order given', () => {
    render(
      <AnnotatedFigure caption="c" callouts={callouts}>
        <rect x="0" y="0" width="1" height="1" />
      </AnnotatedFigure>
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('1');
    expect(items[1]).toHaveTextContent('2');
  });

  it('marks the decorative drawing as hidden from assistive technology', () => {
    const { container } = render(
      <AnnotatedFigure caption="c" callouts={callouts}>
        <rect x="0" y="0" width="1" height="1" />
      </AnnotatedFigure>
    );

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
