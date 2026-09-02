import { describe, expect, it } from 'vitest';

import { parseMention } from '@/lib/chat/mention';

const AGENTS = ['critic', 'tutor', 'planner', 'partner'];

describe('parseMention', () => {
  it('routes a leading handle to that agent', () => {
    expect(parseMention('@critic is the stepper decision sound?', AGENTS)).toEqual({
      agentSlug: 'critic',
      question: 'is the stepper decision sound?',
    });
  });

  it('is case-insensitive on the handle but not on the question', () => {
    expect(parseMention('@Critic Is M4 worth modelling?', AGENTS)).toEqual({
      agentSlug: 'critic',
      question: 'Is M4 worth modelling?',
    });
  });

  it('ignores a handle the project does not have', () => {
    // Matched against the project's own agents. An owner who deleted the Tutor
    // should have @tutor read as prose, not silently address a missing agent.
    expect(parseMention('@researcher what does the literature say?', AGENTS)).toBeNull();
  });

  it('ignores an @ that is not at the start', () => {
    // '@' turns up in prose — an email address, a handle being quoted. Only a
    // leading one addresses anybody.
    expect(parseMention('ask the @critic about this', AGENTS)).toBeNull();
    expect(parseMention('mail me at me@example.com', AGENTS)).toBeNull();
  });

  it('ignores a bare handle with nothing after it', () => {
    // Starting a paid run with no question is worse than doing nothing.
    expect(parseMention('@critic', AGENTS)).toBeNull();
    expect(parseMention('@critic   ', AGENTS)).toBeNull();
  });

  it('tolerates leading whitespace', () => {
    expect(parseMention('  @planner break this down', AGENTS)?.agentSlug).toBe('planner');
  });

  it('does not match a handle glued to another word', () => {
    expect(parseMention('@criticism of the plan', AGENTS)).toBeNull();
  });
});
