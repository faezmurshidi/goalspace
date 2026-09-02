import { describe, expect, it } from 'vitest';

import { approvalOutcomesFrom, approvalRequestsFrom } from '@/lib/chat/approvals';

const request = (payload: unknown, id = 'ap-1') => ({
  type: 'tool-record_entry',
  state: 'approval-requested',
  input: { payload, source_message_ids: ['m1'] },
  approval: { id },
});

describe('approvalRequestsFrom', () => {
  it('surfaces the entry the agent wants to write', () => {
    // The owner reads the body before it lands. That is the guarantee the
    // citation mechanism was standing in for and never actually gave: citing a
    // message id constrains which message is named, never what goes in body.
    expect(
      approvalRequestsFrom([request({ kind: 'note', title: 'Cross-slide', body: 'Freed it.' })])
    ).toEqual([{ approvalId: 'ap-1', kind: 'note', title: 'Cross-slide', body: 'Freed it.' }]);
  });

  it('ignores a call that is not awaiting a decision', () => {
    // Only 'approval-requested' is a question. A part already executed or
    // already answered must not render as a fresh prompt.
    for (const state of ['input-available', 'approval-responded', 'output-available']) {
      expect(approvalRequestsFrom([{ ...request({ kind: 'note', body: 'x' }), state }])).toEqual(
        []
      );
    }
  });

  it('ignores an approval for some other tool', () => {
    expect(
      approvalRequestsFrom([{ ...request({ kind: 'note', body: 'x' }), type: 'tool-ask_agent' }])
    ).toEqual([]);
  });

  it('skips an empty body rather than asking about a blank entry', () => {
    expect(approvalRequestsFrom([request({ kind: 'note', body: '   ' })])).toEqual([]);
  });

  it('survives a malformed part', () => {
    expect(
      approvalRequestsFrom([{ type: 'tool-record_entry', state: 'approval-requested' }])
    ).toEqual([]);
    expect(approvalRequestsFrom(undefined)).toEqual([]);
  });
});

describe('approvalOutcomesFrom', () => {
  it('reports a decision once one is given', () => {
    expect(
      approvalOutcomesFrom([
        {
          type: 'tool-record_entry',
          state: 'approval-responded',
          approval: { id: 'ap-1', approved: false },
        },
      ])
    ).toEqual([{ approvalId: 'ap-1', approved: false }]);
  });

  it('reports nothing while the question is still open', () => {
    expect(approvalOutcomesFrom([request({ kind: 'note', body: 'x' })])).toEqual([]);
  });
});
