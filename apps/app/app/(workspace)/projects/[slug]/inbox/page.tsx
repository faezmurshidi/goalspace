import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { listPendingProposals } from '@/lib/db/proposals';
import { getLocale } from '@/lib/format';
import { ProposalCard } from './proposal-card';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.inbox.title')} · ${slug}` };
}

/**
 * Where an agent's suggestions wait for a decision.
 *
 * Nothing an agent produces reaches the record without passing through here,
 * which is the whole of "agents propose, they never write" made visible. It is
 * also the surface phase 4 reuses: an outside contribution is a proposal row
 * with a contributor instead of an agent as its author.
 */
export default async function InboxPage({ params }: Params) {
  const { slug } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const proposals = await listPendingProposals(supabase, project.id);
  const t = getFixedT(await getLocale());

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl">{t('app.inbox.title')}</h1>

      {proposals.length === 0 ? (
        // An empty inbox is the normal state, not an accomplishment. Stated
        // plainly and left alone.
        <p className="text-ink-soft">{t('app.inbox.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard proposal={proposal} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
