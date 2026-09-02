import { describe, expect, it } from 'vitest';

import { proposalNoticesFrom } from '@/lib/chat/proposal-notices';

const askPart = (output: unknown) => ({ type: 'tool-ask_agent', output });

describe('proposalNoticesFrom', () => {
  it('reports what a delegated run filed', () => {
    expect(
      proposalNoticesFrom([askPart({ agent: 'planner', answer: '...', proposals: 4 })])
    ).toEqual([{ agent: 'planner', count: 4 }]);
  });

  it('reports nothing when the run filed nothing', () => {
    // The case that matters. The Partner once said four proposals were waiting
    // in the inbox after a delegated run that never called propose_work_item.
    // Rendering an affordance on that claim would have confirmed a falsehood in
    // the interface; rendering none leaves the sentence standing alone.
    expect(
      proposalNoticesFrom([askPart({ agent: 'planner', answer: '...', proposals: 0 })])
    ).toEqual([]);
  });

  it('ignores a refusal, which files nothing by definition', () => {
    expect(
      proposalNoticesFrom([
        askPart({ agent: 'critic', refused: 'Monthly cap reached.', proposals: 0 }),
      ])
    ).toEqual([]);
  });

  it('ignores text parts and other tools', () => {
    expect(
      proposalNoticesFrom([
        { type: 'text' },
        { type: 'tool-search_repo', output: { proposals: 9 } },
      ])
    ).toEqual([]);
  });

  it('reports each delegation separately when a turn made several', () => {
    expect(
      proposalNoticesFrom([
        askPart({ agent: 'planner', proposals: 3 }),
        askPart({ agent: 'tutor', proposals: 1 }),
      ])
    ).toEqual([
      { agent: 'planner', count: 3 },
      { agent: 'tutor', count: 1 },
    ]);
  });

  it('survives a malformed part rather than throwing mid-render', () => {
    expect(proposalNoticesFrom([askPart(undefined), askPart({ proposals: 'four' })])).toEqual([]);
    expect(proposalNoticesFrom(undefined)).toEqual([]);
  });
});
