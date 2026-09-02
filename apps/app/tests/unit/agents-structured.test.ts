import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { runStructured } from '@/lib/agents/structured';

const AGENT = {
  id: '33333333-3333-4333-8333-333333333333',
  project_id: '11111111-1111-4111-8111-111111111111',
  system_prompt: 'Ask between five and ten questions.',
  model: 'openai/gpt-4o-mini',
  tools: [] as readonly string[],
};

const OWNER = '22222222-2222-4222-8222-222222222222';
const SCHEMA = z.object({ questions: z.array(z.string()) });

describe('runStructured', () => {
  it('refuses an agent that holds tools', async () => {
    // A structured run builds no tool set, so an allowlist handed to it would
    // be dropped rather than enforced — an agent that looks capable and is
    // checked against nothing. That is the one failure this module must never
    // produce, so it throws rather than degrading.
    await expect(
      runStructured({
        supabase: null as never,
        agent: { ...AGENT, tools: ['search_repo'] },
        ownerId: OWNER,
        prompt: 'A robot arm.',
        schema: SCHEMA,
      })
    ).rejects.toThrow(/tool/i);
  });

  it('checks the allowlist before it touches the database', async () => {
    // `supabase: null` is the assertion. If the guard ever moves below the
    // budget read, this case fails with a TypeError on null instead of the
    // guard's own message — which is exactly the regression worth catching,
    // because a guard that runs after a reservation has already opened a run
    // it will never close.
    await expect(
      runStructured({
        supabase: null as never,
        agent: { ...AGENT, tools: ['propose_work_item'] },
        ownerId: OWNER,
        prompt: 'A robot arm.',
        schema: SCHEMA,
      })
    ).rejects.toThrow(/structured runs build no tool set/);
  });
});
