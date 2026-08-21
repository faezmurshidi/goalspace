import { REPO_READ } from '@/lib/agents/tools/registry';

/**
 * Seeded per new project, all editable and deletable.
 *
 * Phase 2a seeds only the Critic. The Tutor and Researcher in the design need
 * propose_entry, generate_audio, and web_search — none of which exist until
 * the proposal layer ships — and an agent whose tools are missing would claim
 * capabilities it does not have.
 *
 * The Critic having no write tools is the point rather than a limitation: it
 * is the clearest demonstration in the product that a tool set is a real
 * boundary and not a description.
 */

export interface AgentTemplate {
  slug: string;
  name: string;
  role_description: string;
  system_prompt: string;
  tools: readonly string[];
  model: string;
}

/**
 * The design names anthropic/claude-sonnet-5, and the `agents.model` column
 * still defaults to it. Every anthropic/* slug returns 403
 * RestrictedModelsError on this account's free gateway tier, so seeding it
 * would ship a Critic that fails on its first question. gpt-4o-mini is what
 * the tier actually serves; swapping back is a one-line change here once the
 * account carries credits, and cost.ts prices both.
 */
const CRITIC_MODEL = 'openai/gpt-4o-mini';

export const SEEDED_TEMPLATES: readonly AgentTemplate[] = [
  {
    slug: 'critic',
    name: 'Critic',
    role_description: 'Reviews decisions and plans, argues with you, writes nothing.',
    system_prompt: [
      'You review this project’s decisions and plans. You argue with the owner.',
      '',
      'You can read the record and nothing else. You cannot write to it, and you',
      'cannot reach outside it — so never claim to have looked something up, and',
      'never offer to make a change. If a claim needs a source you do not have,',
      'say what you would need.',
      '',
      'Cite what you draw on. When you reference a decision or entry, name it, so',
      'the owner can find it. Do not invent an id you have not seen in a tool',
      'result.',
      '',
      'Be specific and unsentimental. The owner wants the weakness in the plan,',
      'not encouragement. If a decision looks sound, say so briefly and move on.',
    ].join('\n'),
    tools: REPO_READ,
    model: CRITIC_MODEL,
  },
];

export interface SeededAgentRow {
  project_id: string;
  owner_id: string;
  slug: string;
  name: string;
  role_description: string;
  system_prompt: string;
  tools: string[];
  model: string;
  is_active: boolean;
}

/**
 * The templates as rows for one project. Pure, so the shape can be tested
 * without a database.
 *
 * owner_id is stamped on every row rather than left to a default: agents_insert
 * checks `owner_id = auth.uid()` *and* that the project belongs to the caller,
 * so a row missing either is refused by RLS rather than merely looking odd.
 *
 * tools is copied. REPO_READ is a shared `as const` used to define what the
 * seeded agents may reach; handing that same reference to a caller would let
 * one project's insert path mutate the group for the whole process.
 */
export function agentRowsFor(projectId: string, ownerId: string): SeededAgentRow[] {
  return SEEDED_TEMPLATES.map((template) => ({
    project_id: projectId,
    owner_id: ownerId,
    slug: template.slug,
    name: template.name,
    role_description: template.role_description,
    system_prompt: template.system_prompt,
    tools: [...template.tools],
    model: template.model,
    is_active: true,
  }));
}
