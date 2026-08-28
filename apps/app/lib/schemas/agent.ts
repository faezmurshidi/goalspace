import { z } from 'zod';

import { requiredText } from './common';
import { REGISTRY_NAMES } from '@/lib/agents/tools/registry';
import { RATES } from '@/lib/agents/cost';

/**
 * The models an agent may be set to.
 *
 * Derived from the rate table rather than listed separately, because an
 * unpriced model is not merely undisplayable — it is dangerous. `costUsd`
 * returns 0 for a model absent from `RATES`, recording the run as free and so
 * disabling the monthly cap for it; `worstCaseUsd` returns 0, so
 * `start_agent_run` reserves nothing and the concurrency guard lapses. Both
 * fail silently. Tying the choices to the table means the two can only ever
 * disagree if someone deletes a rate out from under a stored agent.
 */
export const MODEL_CHOICES = Object.keys(RATES);

const toolName = z.enum(REGISTRY_NAMES);

export const updateAgentSchema = z.object({
  id: z.string().uuid(),
  name: requiredText(80),
  // `not null default ''` in the database, so empty is legitimate.
  role_description: z.string().max(280).default(''),
  system_prompt: requiredText(8_000),
  model: z.string().refine((m) => m in RATES, {
    message: 'Choose a model with a known rate.',
  }),
  is_active: z.boolean(),
  tools: z
    .array(toolName)
    .max(REGISTRY_NAMES.length)
    .refine((list) => new Set(list).size === list.length, {
      message: 'A tool may only be granted once.',
    }),
});

export type UpdateAgentValues = z.output<typeof updateAgentSchema>;
