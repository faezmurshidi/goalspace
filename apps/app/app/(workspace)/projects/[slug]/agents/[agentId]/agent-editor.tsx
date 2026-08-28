'use client';

import { useId, useState, useTransition } from 'react';
import { Button, cn } from '@goalspace/ui';
import { useAppTranslations } from '@goalspace/i18n';

import { updateAgentAction } from '@/app/(workspace)/actions';
import { toolGroups } from '@/lib/agents/tool-groups';
import { MODEL_CHOICES } from '@/lib/schemas/agent';
import type { Agent } from '@/lib/db/agents';

/**
 * The editor is where the capability boundary is set, so it shows tools
 * grouped by consequence rather than as a flat checklist. The owner may grant
 * or revoke anything registered, including on the seeded agents: the boundary
 * exists to stop a *model* exceeding what the owner granted, not to stop the
 * owner.
 */
export function AgentEditor({ slug, agent }: { slug: string; agent: Agent }) {
  const { t } = useAppTranslations();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role_description);
  const [prompt, setPrompt] = useState(agent.system_prompt);
  const [model, setModel] = useState(agent.model);
  const [isActive, setIsActive] = useState(agent.is_active);
  const [tools, setTools] = useState<string[]>(agent.tools);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const messageId = useId();

  function toggleTool(toolName: string) {
    setTools((current) =>
      current.includes(toolName)
        ? current.filter((n) => n !== toolName)
        : [...current, toolName]
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);

    startTransition(async () => {
      try {
        const result = await updateAgentAction(slug, {
          id: agent.id,
          name,
          role_description: role,
          system_prompt: prompt,
          model,
          is_active: isActive,
          tools,
        });

        if (!result.ok) {
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          return;
        }
        setMessage('app.agents.saved');
      } catch {
        // A server action can reject rather than resolve — a lost session, a
        // dropped connection. Without this the transition ends silently.
        setFailed(true);
        setMessage('app.errors.generic');
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="agent-name" className="label text-ink-soft">
          {t('app.agents.nameLabel')}
        </label>
        <input
          id="agent-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby={failed ? messageId : undefined}
          className="border border-rule-strong bg-paper px-3 py-2 text-title text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="agent-role" className="label text-ink-soft">
          {t('app.agents.roleLabel')}
        </label>
        <input
          id="agent-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-rule-strong bg-paper px-3 py-2 text-body text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="agent-prompt" className="label text-ink-soft">
          {t('app.agents.promptLabel')}
        </label>
        <textarea
          id="agent-prompt"
          required
          rows={10}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full max-w-[70ch] border border-rule-strong bg-paper p-3 text-body text-ink"
        />
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="agent-model" className="label text-ink-soft">
            {t('app.agents.modelLabel')}
          </label>
          {/* A select, not free text. An unpriced model silently zeroes both
              the spend cap and the run reservation — see lib/schemas/agent.ts. */}
          <select
            id="agent-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="label border border-rule-strong bg-paper px-3 py-2 text-ink"
          >
            {MODEL_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="label text-ink-soft">{t('app.agents.activeLabel')}</span>
        </label>
      </div>

      <fieldset className="flex flex-col gap-4 border-t border-rule pt-4">
        <legend className="label text-ink-soft">{t('app.agents.tools.heading')}</legend>

        {toolGroups().map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <p className="label text-ink-soft">
              {t(group.labelKey)}
              {group.noteKey ? (
                <span className="normal-case tracking-normal"> — {t(group.noteKey)}</span>
              ) : null}
            </p>

            {group.tools.length === 0 ? (
              <p className="text-ink-soft">{t('app.agents.tools.none')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {group.tools.map((tool) => (
                  <li key={tool.name}>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={tools.includes(tool.name)}
                        onChange={() => toggleTool(tool.name)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="font-mono text-body text-ink">{tool.name}</span>
                        <span className="block text-ink-soft">{tool.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending} className="label shrink-0 rounded-none">
          {t(pending ? 'app.agents.saving' : 'app.agents.save')}
        </Button>
        {message ? (
          <p
            id={messageId}
            role={failed ? 'alert' : undefined}
            className={cn('label min-w-0 flex-1', failed ? 'text-oxide' : 'text-ink-soft')}
          >
            {t(message)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
