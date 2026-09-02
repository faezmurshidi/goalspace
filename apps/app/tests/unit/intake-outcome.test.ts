import { describe, expect, it } from 'vitest';

import { describeApplyOutcome } from '@/lib/intake/outcome';

describe('describeApplyOutcome', () => {
  it('says nothing when everything landed', () => {
    // Silence is the success signal: the owner arrives at a populated resume
    // view, which is the confirmation. A banner saying "4 items created" would
    // be the progress celebration PRODUCT.md excludes.
    expect(describeApplyOutcome({ applied: 4, questions: 2, failed: 0 })).toBeNull();
  });

  it('says nothing when the owner accepted nothing at all', () => {
    // Rejecting every proposal is a legitimate outcome, not a failure.
    expect(describeApplyOutcome({ applied: 0, questions: 0, failed: 0 })).toBeNull();
  });

  it('names a partial failure and how many were lost', () => {
    // Six applied, one refused: the six stay, and the owner is told about the
    // one rather than discovering later that the list was shorter than the one
    // they ticked.
    expect(describeApplyOutcome({ applied: 6, questions: 0, failed: 1 })).toEqual({
      key: 'app.intake.partialFailure',
      count: 1,
    });
  });

  it('names a total failure with the same key', () => {
    // Nothing applied and everything refused is the same message with a
    // different count. A separate string would be two sentences to translate
    // for one situation.
    expect(describeApplyOutcome({ applied: 0, questions: 0, failed: 3 })).toEqual({
      key: 'app.intake.partialFailure',
      count: 3,
    });
  });
});
