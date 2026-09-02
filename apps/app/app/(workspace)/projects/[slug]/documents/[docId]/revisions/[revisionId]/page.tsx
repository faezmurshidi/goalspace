import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { Markdown } from '@/components/docs/markdown';
import { requireSessionContext } from '@/lib/auth/session';
import { getDocument, getRevision } from '@/lib/db/documents';
import { getProjectBySlug } from '@/lib/db/projects';
import { AUTHOR_KEY, authorshipOf } from '@/lib/documents/authorship';
import { formatDateTime, getLocale, getTimeZone } from '@/lib/format';
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
  const timeZone = await getTimeZone();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        {/* Stated plainly and first, so this is never mistaken for the editor. */}
        <p className="label border-rule text-ink-soft border-b pb-2">
          {t('app.documents.viewingRevision')}
        </p>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
          <span className="label text-ink-soft tabular-nums">
            {formatDateTime(revision.created_at, locale, timeZone)}
          </span>
          <span className="label text-ink-soft">{t(AUTHOR_KEY[authorshipOf(revision).by])}</span>
        </div>

        <h1 className="wdth-wide text-headline text-ink font-bold">
          {revision.title || t('app.documents.untitled')}
        </h1>

        {/* Rendered, not raw. A `<p>` wrapper would be invalid here — markdown
            produces block elements, and nesting a list or a heading inside a
            paragraph makes the browser close the p early and the server and
            client trees disagree. */}
        <Markdown className="mt-4 max-w-[70ch]">{revision.body}</Markdown>

        <div className="border-rule mt-8 flex items-center gap-4 border-t pt-4">
          <RestoreButton
            slug={slug}
            documentId={document.id}
            revisionId={revision.id}
            expectedUpdatedAt={document.updated_at}
          />
          <Link
            href={`/projects/${slug}/documents/${document.id}`}
            className="label text-ink-soft hover:text-ink transition-colors"
          >
            {t('app.documents.backToDocument')}
          </Link>
        </div>
      </div>
    </div>
  );
}
