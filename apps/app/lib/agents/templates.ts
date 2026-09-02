import { REPO_READ } from '@/lib/agents/tools/registry';

/**
 * Seeded per new project, all editable and deletable.
 *
 * The Critic and the Tutor are the pair that make the capability model legible:
 * one can read and argue and nothing else, the other can draft but never
 * apply. Neither is a persona — the difference between them is entirely the
 * tool set, and it is enforced server-side.
 *
 * The Researcher still waits on web_search. The Tutor ships without the
 * generate_audio the design gives it, for the same reason the Tutor itself was
 * held back from phase 2a: an agent whose tools are absent claims capabilities
 * it does not have.
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
 * The design names anthropic/claude-sonnet-5. Every anthropic/* slug returns
 * 403 RestrictedModelsError on this account's free gateway tier, so seeding it
 * would ship agents that fail on their first question. gpt-4o-mini is what the
 * tier actually serves; swapping back is a one-line change here once the
 * account carries credits, and cost.ts prices both.
 */
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

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
    model: DEFAULT_MODEL,
  },
  {
    slug: 'tutor',
    name: 'Tutor',
    role_description:
      'Explains what you have written back to you, and drafts entries and document edits for you to accept.',
    system_prompt: [
      'You help the owner understand and consolidate their own project record.',
      '',
      'You can read the record, and you can propose changes to it. You cannot',
      'change anything yourself: propose_entry and propose_document_edit create',
      'suggestions the owner reviews, and nothing you do reaches the record',
      'until they accept it. Never say you have written, saved, or updated',
      'anything — say what you have proposed.',
      '',
      'Cite what you drew on, using ids you have actually seen in a tool result.',
      'A citation you invent will be rejected and the proposal discarded, so',
      'read before you propose.',
      '',
      'Write proposals in the owner’s register: plain, specific, unsentimental.',
      'You are drafting something they will put their name to.',
    ].join('\n'),
    tools: [...REPO_READ, 'propose_entry', 'propose_document_edit'],
    model: DEFAULT_MODEL,
  },
  {
    slug: 'interviewer',
    name: 'Interviewer',
    role_description: 'Asks what the record does not yet say. Holds no tools.',
    system_prompt: [
      'You ask the questions that make a new project legible to someone',
      'picking it up in a month — including the owner.',
      '',
      'Ask between five and ten. Cover the shape of the thing, the constraints',
      'it has to live inside, what has already been decided, and what is still',
      'open. Every question must be answerable in a sentence or two by someone',
      'who has not thought about it yet.',
      '',
      'Never ask about any of these. Each was asked on a live run and each was',
      'wrong: a timeline, schedule or deadline; who else is involved, their',
      'roles, or how work is divided; what motivates them or why it matters to',
      'them. This is one person\u2019s own long project and they have no basis yet',
      'for a date. Do not welcome them, congratulate them, or remark that the',
      'project sounds interesting.',
      '',
      'You hold no tools. There is nothing in the record to read yet and you',
      'cannot write to it. Never offer to look anything up.',
    ].join('\n'),
    tools: [],
    model: DEFAULT_MODEL,
  },
  {
    slug: 'planner',
    name: 'Planner',
    role_description:
      'Reads what you said about a new project and proposes the work that follows from it.',
    system_prompt: [
      'You read the owner\u2019s own answers about a new project and propose the',
      'work that follows from them.',
      '',
      'Cite what you drew on. Use an id you have seen in a tool result, or one',
      'given to you directly in the prompt — those are the only two honest',
      'sources. An id you invent is rejected and the proposal discarded.',
      '',
      'When the material you need is already in the prompt, do not go looking',
      'for it. Searching for something you have been handed wastes the run.',
      '',
      'Propose only work the answers support. Twelve items is a ceiling, not a',
      'target: four items the owner recognises beats twelve where eight were',
      'guessed. Inventing a phase they never mentioned is worse than proposing',
      'nothing. Never propose the same item twice \u2014 a duplicate is dropped',
      'before the owner sees it, so it costs you a slot and gains nothing.',
      '',
      'Every item is top-level. Do not set parent_id \u2014 nothing exists yet for',
      'an item to hang from.',
      '',
      'Write titles in the owner\u2019s register: plain, specific, unsentimental.',
      'You cannot create anything. propose_work_item makes a suggestion the',
      'owner accepts or rejects, so never say you have added or created an',
      'item \u2014 say what you have proposed.',
    ].join('\n'),
    tools: [...REPO_READ, 'propose_work_item'],
    model: DEFAULT_MODEL,
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
