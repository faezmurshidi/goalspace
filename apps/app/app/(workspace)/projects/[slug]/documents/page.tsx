import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { listDocuments } from '@/lib/db/documents';
import { getProjectBySlug } from '@/lib/db/projects';
import { formatDate, getLocale, getTimeZone } from '@/lib/format';
import { NewDocumentForm } from './new-document-form';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getFixedT(await getLocale());
  return { title: `${t('app.documents.title')} · ${slug}` };
}

/**
 * Documents are the project's living artifacts — the things entries refer to.
 * The list carries when each last changed, because for a document the useful
 * question on return is which of these moved while you were away.
 */
export default async function DocumentsPage({ params }: Params) {
  const { slug } = await params;

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) notFound();

  const documents = await listDocuments(supabase, project.id);
  const locale = await getLocale();
  const timeZone = await getTimeZone();
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        {/* Wraps for the same reason the rows below do: at phone widths the
            heading and the create form do not fit on one line, and without
            this the form ran off the right edge of the viewport. */}
        <div className="border-rule flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b pb-2">
          <h1 className="label text-ink-soft">{t('app.documents.title')}</h1>
          <NewDocumentForm slug={slug} />
        </div>

        {documents.length === 0 ? (
          <p className="text-ink-soft py-6">{t('app.documents.empty')}</p>
        ) : (
          <ul>
            {documents.map((document) => (
              <li key={document.id} className="border-rule border-b">
                <Link
                  href={`/projects/${slug}/documents/${document.id}`}
                  className="hover:bg-paper-shade flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors"
                >
                  <span className="text-body text-ink min-w-0 flex-1">
                    {document.title || t('app.documents.untitled')}
                  </span>
                  {document.agent_id ? (
                    <span className="label text-ink-soft shrink-0">
                      {t('app.documents.byAgent')}
                    </span>
                  ) : null}
                  <span className="label text-ink-soft shrink-0 tabular-nums">
                    {formatDate(document.updated_at, locale, timeZone)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
