import { describe, expect, it } from 'vitest';

import { runTooled } from '@/lib/agents/tooled';

const AGENT = {
  id: '44444444-4444-4444-8444-444444444444',
  project_id: '11111111-1111-4111-8111-111111111111',
  system_prompt: 'Propose work.',
  model: 'openai/gpt-4o-mini',
  tools: ['search_repo', 'propose_work_item'] as readonly string[],
};

const OWNER = '22222222-2222-4222-8222-222222222222';

describe('runTooled', () => {
  it('refuses an agent with no tools', async () => {
    // The mirror of runStructured's guard. An agent with an empty allowlist
    // has no reason to be in a tool loop, and running one would spend a
    // reservation on a model call that can do nothing but talk.
    await expect(
      runTooled({
        supabase: null as never,
        agent: { ...AGENT, tools: [] },
        ownerId: OWNER,
        prompt: 'Break this down.',
      })
    ).rejects.toThrow(/no tools/i);
  });

  it('checks the allowlist before it touches the database', async () => {
    // `supabase: null` is the assertion, as in agents-structured.test.ts.
    await expect(
      runTooled({
        supabase: null as never,
        agent: { ...AGENT, tools: [] },
        ownerId: OWNER,
        prompt: 'Break this down.',
      })
    ).rejects.toThrow(/runTooled/);
  });
});
