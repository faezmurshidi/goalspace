'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';
import { Button, Textarea } from '@goalspace/ui';

import type { IntakeAnswer, IntakeQuestion } from '@/lib/schemas/intake';
import {
  applyIntakeAction,
  rejectIntakeRemainderAction,
  startIntakeAction,
  submitIntakeAction,
  type ProposedItem,
} from './actions';

type Stage = 'asking' | 'answering' | 'planning' | 'reviewing';

export function IntakeWizard({ slug }: { slug: string }) {
  const { t } = useAppTranslations();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('asking');
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<ProposedItem[]>([]);
  const [acceptedItems, setAcceptedItems] = useState<Set<string>>(new Set());
  const [keptQuestions, setKeptQuestions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Cap refusals come back as prose written for a person, not as a key —
   * checkCaps owns that wording and it names the cap and the figure. Every
   * other failure is a key. One helper so the two cannot be confused, and so a
   * raw key never reaches the screen.
   */
  const describe = (message: string) => (message.startsWith('app.') ? t(message) : message);

  // React 19 StrictMode mounts effects twice in development. Without this the
  // Interviewer runs twice on every load, which is two reservations and two
  // charges for one intake.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const result = await startIntakeAction(slug);
      if (!result.ok) {
        setError(result.message.startsWith('app.') ? t(result.message) : result.message);
        setStage('answering');
        return;
      }
      setQuestions(result.data.questions);
      setStage('answering');
    })();
  }, [slug, t]);

  const answerList = (): IntakeAnswer[] =>
    questions.map((q) => ({ id: q.id, question: q.question, answer: answers[q.id] ?? '' }));

  async function submitAnswers() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setStage('planning');

    const result = await submitIntakeAction(slug, { answers: answerList() });

    if (!result.ok) {
      setError(describe(result.message));
      setStage('answering');
      setBusy(false);
      return;
    }

    setProposals(result.data.proposals);
    // Checked by default: the owner asked for a breakdown and this is it.
    setAcceptedItems(new Set(result.data.proposals.map((p) => p.id)));
    // Unchecked by default: nothing is created by walking away. See spec §8.2.
    setKeptQuestions(new Set());
    if (result.data.plannerFailed && result.data.proposals.length === 0) {
      setError(t('app.intake.plannerMissing'));
    }
    setStage('reviewing');
    setBusy(false);
  }

  async function apply() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const accepted = [...acceptedItems];
    const declined = proposals.map((p) => p.id).filter((id) => !acceptedItems.has(id));

    const result = await applyIntakeAction(
      slug,
      { answers: answerList() },
      { proposalIds: accepted, questionIds: [...keptQuestions] }
    );

    // Rejection is best-effort and deliberately does not gate navigation: a
    // proposal left pending is a stale inbox row, not lost work.
    if (declined.length > 0) await rejectIntakeRemainderAction(declined);

    if (!result.ok) {
      setError(describe(result.message));
      setBusy(false);
      return;
    }

    router.push(`/projects/${slug}`);
    router.refresh();
  }

  const skip = (
    <p className="mt-8">
      <Link href={`/projects/${slug}`} className="label text-ink-soft underline">
        {t('app.intake.skip')}
      </Link>
    </p>
  );

  if (stage === 'asking' || stage === 'planning') {
    return (
      <div>
        <h1 className="wdth-wide text-headline text-ink font-bold">{t('app.intake.title')}</h1>
        {/* A shaped skeleton rather than the word "Loading", so the plate holds
            its footprint and the page does not jump when the form arrives. */}
        <div
          role="status"
          aria-live="polite"
          aria-label={t(stage === 'asking' ? 'app.intake.asking' : 'app.intake.planning')}
          className="border-rule bg-paper-shade mt-8 h-96 border"
        />
        {skip}
      </div>
    );
  }

  if (stage === 'reviewing') {
    const openQuestions = answerList().filter((a) => a.answer.trim().length === 0);
    const total = acceptedItems.size + keptQuestions.size;

    return (
      <div>
        <h1 className="wdth-wide text-headline text-ink font-bold">
          {t('app.intake.reviewTitle')}
        </h1>
        <p className="prose-measure text-ink-soft mt-3">{t('app.intake.reviewBody')}</p>

        {error ? (
          <p role="alert" className="label text-oxide mt-6">
            {error}
          </p>
        ) : null}

        {proposals.length === 0 ? (
          <p className="text-ink-soft mt-8">{t('app.intake.noProposals')}</p>
        ) : (
          <fieldset className="mt-8">
            <legend className="label text-ink-soft">{t('app.intake.reviewTitle')}</legend>
            <ul className="border-rule border-t">
              {proposals.map((p) => (
                <li key={p.id} className="border-rule border-b py-3">
                  <label className="flex items-baseline gap-3">
                    <input
                      type="checkbox"
                      checked={acceptedItems.has(p.id)}
                      onChange={(event) =>
                        setAcceptedItems((prev) => {
                          const next = new Set(prev);
                          if (event.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-body text-ink block">{p.title}</span>
                      <span className="label text-ink-soft block">{p.rationale}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {openQuestions.length > 0 ? (
          <fieldset className="mt-10">
            <legend className="label text-ink-soft">{t('app.intake.openTitle')}</legend>
            <p className="prose-measure text-ink-soft mt-2">{t('app.intake.openBody')}</p>
            <ul className="border-rule mt-4 border-t">
              {openQuestions.map((q) => (
                <li key={q.id} className="border-rule border-b py-3">
                  <label className="flex items-baseline gap-3">
                    <input
                      type="checkbox"
                      checked={keptQuestions.has(q.id)}
                      onChange={(event) =>
                        setKeptQuestions((prev) => {
                          const next = new Set(prev);
                          if (event.target.checked) next.add(q.id);
                          else next.delete(q.id);
                          return next;
                        })
                      }
                    />
                    <span className="text-body text-ink min-w-0 flex-1">{q.question}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        <Button
          type="button"
          onClick={apply}
          disabled={busy}
          className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper mt-10 h-12 w-full disabled:opacity-60"
        >
          {busy
            ? t('app.intake.applying')
            : total === 0
              ? t('app.intake.applyNone')
              : t('app.intake.apply', { count: total })}
        </Button>
        {skip}
      </div>
    );
  }

  return (
    <div>
      <h1 className="wdth-wide text-headline text-ink font-bold">{t('app.intake.title')}</h1>
      <p className="prose-measure text-ink-soft mb-8 mt-3">{t('app.intake.body')}</p>

      {error ? (
        <p role="alert" className="label text-oxide mb-6">
          {error}
        </p>
      ) : null}

      {questions.length === 0 ? null : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitAnswers();
          }}
          className="border-rule bg-paper border p-8"
        >
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={i === 0 ? 'flex flex-col gap-2' : 'mt-6 flex flex-col gap-2'}
            >
              <label htmlFor={`q-${q.id}`} className="label text-ink-soft">
                {q.question}
              </label>
              <Textarea
                id={`q-${q.id}`}
                rows={2}
                value={answers[q.id] ?? ''}
                onChange={(event) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: event.target.value }))
                }
                className="bg-paper text-body text-ink"
              />
            </div>
          ))}

          <Button
            type="submit"
            disabled={busy}
            className="label bg-primary text-primary-foreground hover:bg-ink hover:text-paper mt-8 h-12 w-full disabled:opacity-60"
          >
            {t('app.intake.submit')}
          </Button>
        </form>
      )}
      {skip}
    </div>
  );
}
