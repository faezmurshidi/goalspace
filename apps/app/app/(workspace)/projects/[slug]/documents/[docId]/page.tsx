import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { Attachments, type AttachmentView } from '@/components/docs/attachments';
import { requireSessionContext } from '@/lib/auth/session';
import { filenameFrom, listAttachments, signedUrlFor } from '@/lib/db/attachments';
import { getDocument, listRevisions, staleCountsFor } from '@/lib/db/documents';
import { getProjectBySlug } from '@/lib/db/projects';
import { AUTHOR_KEY, authorshipOf } from '@/lib/documents/authorship';
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

  const since = (await staleCountsFor(supabase, project.id)).get(document.id);

  // Signed here rather than in the browser: the bucket is private, so nothing
  // can be linked to directly, and a signature minted per render expires with
  // the page rather than sitting in client state.
  const attachmentRows = await listAttachments(supabase, { documentId: document.id });
  const attachments: AttachmentView[] = await Promise.all(
    attachmentRows.map(async (row) => ({
      id: row.id,
      filename: filenameFrom(row.storage_path),
      byteSize: row.byte_size,
      url: await signedUrlFor(supabase, row.storage_path),
    }))
  );

  const locale = await getLocale();
  const timeZone = await getTimeZone();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        <DocumentEditor slug={slug} document={document} />

        {/* Below the document rather than above it: the document is what the
            owner came for, and this is a note about it. */}
        {(since ?? 0) > 0 ? (
          <p className="label text-ink-soft pt-4">{t('app.documents.since', { count: since })}</p>
        ) : null}

        <Attachments
          slug={slug}
          documentId={document.id}
          projectId={project.id}
          ownerId={userId}
          attachments={attachments}
        />

        <section className="pt-10">
          <h2 className="label border-rule text-ink-soft border-b pb-2">
            {t('app.documents.history')}
          </h2>

          {revisions.length === 0 ? (
            <p className="text-ink-soft py-6">{t('app.documents.historyEmpty')}</p>
          ) : (
            <ul>
              {revisions.map((revision) => (
                <li key={revision.id} className="border-rule border-b">
                  <Link
                    href={`/projects/${slug}/documents/${document.id}/revisions/${revision.id}`}
                    className="hover:bg-paper-shade flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors"
                  >
                    <span className="label text-ink-soft shrink-0 tabular-nums">
                      {formatDateTime(revision.created_at, locale, timeZone)}
                    </span>
                    <span className="text-body text-ink min-w-0 flex-1">
                      {revision.title || t('app.documents.untitled')}
                    </span>
                    <span className="label text-ink-soft shrink-0">
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
