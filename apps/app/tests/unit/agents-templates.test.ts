import { describe, expect, it } from 'vitest';

import { RATES } from '@/lib/agents/cost';
import { agentRowsFor, SEEDED_TEMPLATES } from '@/lib/agents/templates';
import { isAllowed, REGISTRY, REPO_READ } from '@/lib/agents/tools/registry';

describe('SEEDED_TEMPLATES', () => {
  it('seeds only agents whose every tool exists in the registry', () => {
    // An agent referencing a tool that has not shipped would silently have
    // fewer capabilities than its description claims.
    for (const template of SEEDED_TEMPLATES) {
      for (const name of template.tools) {
        expect(Object.keys(REGISTRY)).toContain(name);
      }
    }
  });

  it('includes a Critic that can write nothing and reach nowhere', () => {
    // The clearest demonstration that tools are a real boundary.
    const critic = SEEDED_TEMPLATES.find((t) => t.slug === 'critic');
    expect(critic).toBeDefined();
    for (const name of critic!.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].writes).toBe(false);
      expect(REGISTRY[name as keyof typeof REGISTRY].external).toBe(false);
    }
  });

  it('uses dotted gateway model slugs', () => {
    // anthropic/claude-sonnet-5, never anthropic/claude-sonnet-4-6.
    for (const template of SEEDED_TEMPLATES) {
      expect(template.model).toMatch(/^[a-z]+\/[a-z0-9.\-]+$/);
      expect(template.model).not.toMatch(/-\d+-\d+$/);
    }
  });

  it('gives every template a non-empty system prompt', () => {
    for (const template of SEEDED_TEMPLATES) {
      expect(template.system_prompt.trim().length).toBeGreaterThan(0);
    }
  });

  it('prices every seeded model in the rate table', () => {
    // The rate table is the fallback for when the gateway does not report a
    // cost. A seeded model missing from it records $0.00 per run, which reads
    // as "free" and quietly disables the spend caps that gate the whole layer.
    for (const template of SEEDED_TEMPLATES) {
      expect(Object.keys(RATES)).toContain(template.model);
    }
  });
});

describe('agentRowsFor', () => {
  const PROJECT = '11111111-1111-4111-8111-111111111111';
  const OWNER = '22222222-2222-4222-8222-222222222222';

  it('stamps every row with the project and owner it was asked for', () => {
    // agents_insert checks owner_id = auth.uid() AND that the project belongs
    // to the caller. A row missing either is rejected by RLS, not merely odd.
    const rows = agentRowsFor(PROJECT, OWNER);
    expect(rows).toHaveLength(SEEDED_TEMPLATES.length);
    for (const row of rows) {
      expect(row.project_id).toBe(PROJECT);
      expect(row.owner_id).toBe(OWNER);
    }
  });

  it('carries each template’s tools through unchanged', () => {
    // The allowlist is the capability boundary. A seed that widened or
    // dropped it would hand the agent a different reach than the template
    // describes.
    const rows = agentRowsFor(PROJECT, OWNER);
    for (const template of SEEDED_TEMPLATES) {
      const row = rows.find((r) => r.slug === template.slug);
      expect(row).toBeDefined();
      expect(row!.tools).toEqual([...template.tools]);
      expect(row!.model).toBe(template.model);
      expect(row!.system_prompt).toBe(template.system_prompt);
    }
  });

  it('returns a mutable tools array, not the frozen template constant', () => {
    // REPO_READ is a shared `as const`. Handing the same reference to the
    // insert would let a caller mutate the registry group for the process.
    const rows = agentRowsFor(PROJECT, OWNER);
    const critic = SEEDED_TEMPLATES.find((t) => t.slug === 'critic')!;
    expect(rows.find((r) => r.slug === 'critic')!.tools).not.toBe(critic.tools);
  });

  it('seeds every agent active', () => {
    for (const row of agentRowsFor(PROJECT, OWNER)) {
      expect(row.is_active).toBe(true);
    }
  });
});

describe('SEEDED_TEMPLATES rate coverage', () => {
  it('prices every seeded model in the rate table', () => {
    // The rate table is the fallback for when the gateway does not report a
    // cost. A seeded model missing from it records $0.00 per run, which reads
    // as "free" and quietly disables the spend caps that gate the whole layer.
    for (const template of SEEDED_TEMPLATES) {
      expect(Object.keys(RATES)).toContain(template.model);
    }
  });
});

describe('the Tutor', () => {
  it('is seeded with repo-read plus the entry and document write tools', () => {
    const tutor = SEEDED_TEMPLATES.find((t) => t.slug === 'tutor');
    expect(tutor).toBeDefined();
    expect(tutor!.tools).toContain('propose_entry');
    expect(tutor!.tools).toContain('propose_document_edit');
    expect(tutor!.tools).toContain('search_repo');
  });

  it('cannot propose work items or reach outside the system', () => {
    // The Researcher is the one that opens work items and searches the web.
    // Widening the Tutor here would make the two templates indistinguishable.
    const tutor = SEEDED_TEMPLATES.find((t) => t.slug === 'tutor')!;
    expect(tutor.tools).not.toContain('propose_work_item');
    for (const name of tutor.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].external).toBe(false);
    }
  });

  it('does not claim a capability it has no tool for', () => {
    // generate_audio ships in a later phase. A description that promises it
    // now is a lie the model will repeat.
    const tutor = SEEDED_TEMPLATES.find((t) => t.slug === 'tutor')!;
    expect(tutor.role_description.toLowerCase()).not.toContain('audio');
    expect(tutor.system_prompt.toLowerCase()).not.toContain('audio');
  });

  it('leaves the Critic writing nothing', () => {
    // The regression that matters: adding write tools to the registry must not
    // quietly widen the agent defined as reaching nowhere.
    const critic = SEEDED_TEMPLATES.find((t) => t.slug === 'critic')!;
    for (const name of critic.tools) {
      expect(REGISTRY[name as keyof typeof REGISTRY].writes).toBe(false);
    }
  });
});

describe('the Interviewer', () => {
  it('is seeded with no tools at all', () => {
    const interviewer = SEEDED_TEMPLATES.find((t) => t.slug === 'interviewer');
    expect(interviewer).toBeDefined();
    expect(interviewer!.tools).toEqual([]);
  });

  it('is refused every tool in the registry', () => {
    // Asserted through isAllowed rather than against the array's length,
    // because isAllowed is the gate the executor re-checks on every call. A
    // test of the data would still pass if the gate stopped consulting it.
    const interviewer = SEEDED_TEMPLATES.find((t) => t.slug === 'interviewer')!;
    for (const name of Object.keys(REGISTRY)) {
      expect(isAllowed(interviewer.tools, name)).toBe(false);
    }
  });

  it('does not claim a capability it has no tool for', () => {
    // Same rule the Tutor is held to: a description that promises retrieval
    // is a lie the model repeats to the owner.
    const interviewer = SEEDED_TEMPLATES.find((t) => t.slug === 'interviewer')!;
    const claims = `${interviewer.role_description} ${interviewer.system_prompt}`.toLowerCase();
    expect(claims).not.toContain('search');
    expect(claims).not.toContain('retrieve');
  });
});
