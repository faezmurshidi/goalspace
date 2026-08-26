import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { getDocument, getRevision } from '@/lib/db/documents';
import { authorshipOf, AUTHOR_KEY } from '@/lib/documents/authorship';
import { formatDateTime, getLocale } from '@/lib/format';
import { RestoreButton } from './restore-button';

type Params = { params: Promise<{ slug: string; docId: string; revisionId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.documents.viewingRevision')} · ${slug}` };
}

export default async function RevisionPage({ params }: Params) {
  const { slug, docId, revisionId } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const [document, revision] = await Promise.all([
    getDocument(supabase, project.id, docId),
    getRevision(supabase, project.id, revisionId),
  ]);

  // The revision must belong to the document in the URL. Without this check a
  // guessed id would render one document's history under another's heading.
  if (!document || !revision || revision.document_id !== document.id) notFound();

  const locale = await getLocale();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        {/* Stated plainly and first, so this is never mistaken for the editor. */}
        <p className="label border-b border-rule pb-2 text-ink-soft">
          {t('app.documents.viewingRevision')}
        </p>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
          <span className="label tabular-nums text-ink-soft">
            {formatDateTime(revision.created_at, locale)}
          </span>
          <span className="label text-ink-soft">
            {t(AUTHOR_KEY[authorshipOf(revision).by])}
          </span>
        </div>

        <h1 className="wdth-wide text-headline font-bold text-ink">
          {revision.title || t('app.documents.untitled')}
        </h1>

        <p className="mt-4 max-w-[70ch] whitespace-pre-wrap text-body text-ink">
          {revision.body}
        </p>

        <div className="mt-8 flex items-center gap-4 border-t border-rule pt-4">
          <RestoreButton
            slug={slug}
            documentId={document.id}
            revisionId={revision.id}
            expectedUpdatedAt={document.updated_at}
          />
          <Link
            href={`/projects/${slug}/documents/${document.id}`}
            className="label text-ink-soft transition-colors hover:text-ink"
          >
            {t('app.documents.backToDocument')}
          </Link>
        </div>
      </div>
    </div>
  );
}
