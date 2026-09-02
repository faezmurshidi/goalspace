import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getDocument, listRevisions } from '@/lib/db/documents';
import { authorshipOf, AUTHOR_KEY } from '@/lib/documents/authorship';
import { formatDateTime, getLocale, getTimeZone } from '@/lib/format';
import { DocumentEditor } from './document-editor';

type Params = { params: Promise<{ slug: string; docId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, docId } = await params;
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  const document = project ? await getDocument(supabase, project.id, docId) : null;
  const t = getFixedT(await getLocale());
  return { title: `${document?.title || t('app.documents.untitled')} · ${slug}` };
}

export default async function DocumentPage({ params }: Params) {
  const { slug, docId } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const document = await getDocument(supabase, project.id, docId);
  if (!document) notFound();

  const revisions = await listRevisions(supabase, project.id, document.id);
  const locale = await getLocale();
  const timeZone = await getTimeZone();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <DocumentEditor slug={slug} document={document} />

        <section className="pt-10">
          <h2 className="label border-b border-rule pb-2 text-ink-soft">
            {t('app.documents.history')}
          </h2>

          {revisions.length === 0 ? (
            <p className="py-6 text-ink-soft">{t('app.documents.historyEmpty')}</p>
          ) : (
            <ul>
              {revisions.map((revision) => (
                <li key={revision.id} className="border-b border-rule">
                  <Link
                    href={`/projects/${slug}/documents/${document.id}/revisions/${revision.id}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
                  >
                    <span className="label shrink-0 tabular-nums text-ink-soft">
                      {formatDateTime(revision.created_at, locale, timeZone)}
                    </span>
                    <span className="min-w-0 flex-1 text-body text-ink">
                      {revision.title || t('app.documents.untitled')}
                    </span>
                    <span className="label shrink-0 text-ink-soft">
                      {t(AUTHOR_KEY[authorshipOf(revision).by])}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
