'use client';

import { useId, useState, useTransition } from 'react';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, cn } from '@goalspace/ui';

import type { Budget } from '@/lib/agents/caps';
import { MAX_PER_RUN_TOKEN_CAP, MIN_PER_RUN_TOKEN_CAP } from '@/lib/schemas/budget';
import { updateBudgetAction } from '@/app/(workspace)/actions';

/**
 * The two spend caps. Follows the pattern in
 * `agents/[agentId]/agent-editor.tsx`, with one addition: `updateBudgetSchema`
 * uses `z.number()`, and a number input yields a string, so each value is read
 * with `event.target.valueAsNumber` and held in state as a number rather than
 * text. `valueAsNumber` is `NaN` for a cleared field and `0` for a typed
 * zero — a monthly cap of `0` ("no agent spending this month") is legitimate
 * and must reach the schema as `0`, not be treated as empty.
 */
export function BudgetForm({ slug, budget }: { slug: string; budget: Budget }) {
  const { t } = useAppTranslations();
  const [pending, startTransition] = useTransition();

  const [monthlyCapUsd, setMonthlyCapUsd] = useState(budget.monthly_cap_usd);
  const [perRunTokenCap, setPerRunTokenCap] = useState(budget.per_run_token_cap);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const messageId = useId();
  const monthlyCapErrorId = useId();
  const perRunTokenCapErrorId = useId();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await updateBudgetAction(slug, {
          monthly_cap_usd: monthlyCapUsd,
          per_run_token_cap: perRunTokenCap,
        });

        if (!result.ok) {
          setFailed(true);
          setMessage(result.message ?? 'app.errors.generic');
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        setMessage('app.settings.saved');
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
      <div className="flex flex-wrap gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="budget-monthly-cap" className="label text-ink-soft">
            {t('app.settings.monthlyCap')}
          </label>
          <input
            id="budget-monthly-cap"
            type="number"
            required
            min={0}
            max={99_999_999.99}
            step="0.01"
            value={Number.isNaN(monthlyCapUsd) ? '' : monthlyCapUsd}
            onChange={(e) => setMonthlyCapUsd(e.target.valueAsNumber)}
            aria-invalid={fieldErrors.monthly_cap_usd ? true : undefined}
            aria-describedby={
              fieldErrors.monthly_cap_usd ? monthlyCapErrorId : failed ? messageId : undefined
            }
            className="border-rule-strong bg-paper text-title text-ink border px-3 py-2"
          />
          {fieldErrors.monthly_cap_usd ? (
            <p id={monthlyCapErrorId} role="alert" className="label text-oxide">
              {fieldErrors.monthly_cap_usd.map((key) => t(key)).join(' ')}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="budget-per-run-token-cap" className="label text-ink-soft">
            {t('app.settings.perRunTokenCap')}
          </label>
          <input
            id="budget-per-run-token-cap"
            type="number"
            required
            min={MIN_PER_RUN_TOKEN_CAP}
            max={MAX_PER_RUN_TOKEN_CAP}
            step="1"
            value={Number.isNaN(perRunTokenCap) ? '' : perRunTokenCap}
            onChange={(e) => setPerRunTokenCap(e.target.valueAsNumber)}
            aria-invalid={fieldErrors.per_run_token_cap ? true : undefined}
            aria-describedby={fieldErrors.per_run_token_cap ? perRunTokenCapErrorId : undefined}
            className="border-rule-strong bg-paper text-title text-ink border px-3 py-2"
          />
          {fieldErrors.per_run_token_cap ? (
            <p id={perRunTokenCapErrorId} role="alert" className="label text-oxide">
              {fieldErrors.per_run_token_cap.map((key) => t(key)).join(' ')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending} className="label shrink-0 rounded-none">
          {t(pending ? 'app.settings.saving' : 'app.settings.save')}
        </Button>
        {message ? (
          <p
            id={messageId}
            role={failed ? 'alert' : 'status'}
            className={cn('label min-w-0 flex-1', failed ? 'text-oxide' : 'text-ink-soft')}
          >
            {t(message)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
