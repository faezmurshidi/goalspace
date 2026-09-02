import { describe, expect, it } from 'vitest';

import { SEEDED_TEMPLATES } from '@/lib/agents/templates';
import { HANDLERS, type ToolContext } from '@/lib/agents/tools/handlers';
import { REGISTRY, REPO_READ } from '@/lib/agents/tools/registry';

const ctx = (delegate?: ToolContext['delegate']): ToolContext =>
  ({
    supabase: null as never,
    projectId: 'proj-1',
    ownerId: 'owner-1',
    agentId: 'agent-1',
    runId: 'run-1',
    documentVersions: new Map<string, string>(),
    delegate,
  }) as ToolContext;

describe('ask_agent', () => {
  it('is a read in the registry sense: it proposes nothing itself', () => {
    // The sub-agent may well propose. ask_agent does not — it starts a run and
    // returns text. Filing it as a write would put it in WRITE_TOOLS and make
    // the Critic, which must write nothing, ineligible to ever hold it.
    expect(REGISTRY.ask_agent.writes).toBe(false);
    expect(REGISTRY.ask_agent.external).toBe(false);
  });

  it('is not part of repo-read', () => {
    // REPO_READ is granted to every seeded agent. Delegation is not a
    // capability everyone should have, and keeping it out of the group is what
    // makes nesting impossible.
    expect(REPO_READ).not.toContain('ask_agent');
  });

  it('refuses to call the Partner, closing the self-call', () => {
    // The allowlist alone permits it: the Partner holds ask_agent, so nothing
    // in the registry stops it naming itself and recursing.
    expect(
      REGISTRY.ask_agent.inputSchema.safeParse({
        agent_slug: 'partner',
        question: 'What should I do?',
      }).success
    ).toBe(false);
  });

  it('accepts the three specialists', () => {
    for (const slug of ['critic', 'tutor', 'planner']) {
      const parsed = REGISTRY.ask_agent.inputSchema.safeParse({
        agent_slug: slug,
        question: 'x',
      });
      expect(parsed.success, slug).toBe(true);
    }
  });

  it('is held by the Partner and by nobody else', () => {
    // The property that makes nesting impossible: a delegated agent has no
    // ask_agent, so it cannot delegate onward.
    const holders = SEEDED_TEMPLATES.filter((t) => t.tools.includes('ask_agent')).map(
      (t) => t.slug
    );
    expect(holders).toEqual(['partner']);
  });
});

describe('the ask_agent handler', () => {
  it('reports a refusal instead of throwing', async () => {
    // A delegated run refused for budget is not an error. The Partner is told
    // and says so; the conversation continues.
    const result = await HANDLERS.ask_agent(
      ctx(async () => ({ ok: false, message: 'Monthly cap of $10.00 reached.' })),
      { agent_slug: 'critic', question: 'Is this sound?' } as never
    );
    expect(JSON.stringify(result)).toContain('Monthly cap');
  });

  it('returns the sub-agent’s text on success', async () => {
    const result = await HANDLERS.ask_agent(
      ctx(async (slug: string, question: string) => ({
        ok: true as const,
        text: `${slug} answered: ${question}`,
        proposals: 2,
      })),
      { agent_slug: 'planner', question: 'Break it down' } as never
    );
    expect(JSON.stringify(result)).toContain('planner answered: Break it down');
  });

  it('fails loudly when no delegate was supplied', async () => {
    // An agent holding ask_agent in a run that cannot delegate is a wiring
    // bug. Returning "sorry, cannot" would let it ship unnoticed.
    await expect(
      HANDLERS.ask_agent(ctx(undefined), { agent_slug: 'critic', question: 'x' } as never)
    ).rejects.toThrow(/delegate/i);
  });
});
