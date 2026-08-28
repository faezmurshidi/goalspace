import { describe, expect, it } from 'vitest';

import { RATES } from '@/lib/agents/cost';
import { MODEL_CHOICES, updateAgentSchema } from '@/lib/schemas/agent';

const valid = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Critic',
  role_description: 'Argues with decisions.',
  system_prompt: 'You review decisions.',
  model: 'openai/gpt-4o-mini',
  is_active: true,
  tools: ['search_repo', 'read_document'],
};

describe('updateAgentSchema', () => {
  it('accepts a well-formed agent', () => {
    expect(updateAgentSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an empty tool set — an agent may be granted nothing', () => {
    expect(updateAgentSchema.safeParse({ ...valid, tools: [] }).success).toBe(true);
  });

  it('rejects a tool that is not in the registry', () => {
    // resolveTools drops unknown names silently at run time, so a typo would
    // look like a working grant until someone wondered why the agent never
    // used it. Rejecting at the boundary is the only place it is visible.
    const result = updateAgentSchema.safeParse({ ...valid, tools: ['search_repo', 'delete_all'] });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate tools', () => {
    const result = updateAgentSchema.safeParse({
      ...valid,
      tools: ['search_repo', 'search_repo'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a model with no entry in the rate table', () => {
    // costUsd and worstCaseUsd both return 0 for an unpriced model, which
    // records the run as free and reserves nothing. Storing one would disable
    // the monthly cap and the concurrency guard at once, silently.
    const result = updateAgentSchema.safeParse({ ...valid, model: 'acme/not-a-model' });
    expect(result.success).toBe(false);
  });

  it('rejects prototype-chain keys that a bare `in` check would let through', () => {
    // `m in RATES` walks the prototype chain, so `"constructor"`,
    // `"toString"`, and `"hasOwnProperty"` all pass — and RATES[those] is
    // truthy, so costUsd/worstCaseUsd return NaN instead of 0, which breaks
    // the monthly spend cap silently. MODEL_CHOICES.includes must reject them.
    for (const model of ['constructor', 'toString', 'hasOwnProperty', 'valueOf']) {
      const result = updateAgentSchema.safeParse({ ...valid, model });
      expect(result.success).toBe(false);
    }
  });

  it('offers exactly the priced models as choices', () => {
    expect([...MODEL_CHOICES].sort()).toEqual(Object.keys(RATES).sort());
    expect(MODEL_CHOICES.length).toBeGreaterThan(0);
  });

  it('requires a name', () => {
    expect(updateAgentSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('requires a system prompt', () => {
    expect(updateAgentSchema.safeParse({ ...valid, system_prompt: '' }).success).toBe(false);
  });

  it('allows an empty role description', () => {
    // The column is `not null default ''`; a schema that demanded text here
    // would reject rows the database is perfectly happy with.
    expect(updateAgentSchema.safeParse({ ...valid, role_description: '' }).success).toBe(true);
  });
});
