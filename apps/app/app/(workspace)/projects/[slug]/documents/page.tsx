import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getProjectBySlug } from '@/lib/db/projects';
import { listDocuments } from '@/lib/db/documents';
import { formatDate, getLocale } from '@/lib/format';
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
  const t = getFixedT(locale);

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="pt-8">
        {/* Wraps for the same reason the rows below do: at phone widths the
            heading and the create form do not fit on one line, and without
            this the form ran off the right edge of the viewport. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-rule pb-2">
          <h1 className="label text-ink-soft">{t('app.documents.title')}</h1>
          <NewDocumentForm slug={slug} />
        </div>

        {documents.length === 0 ? (
          <p className="py-6 text-ink-soft">{t('app.documents.empty')}</p>
        ) : (
          <ul>
            {documents.map((document) => (
              <li key={document.id} className="border-b border-rule">
                <Link
                  href={`/projects/${slug}/documents/${document.id}`}
                  className="unstyled flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper-shade"
                >
                  <span className="min-w-0 flex-1 text-body text-ink">
                    {document.title || t('app.documents.untitled')}
                  </span>
                  {document.agent_id ? (
                    <span className="label shrink-0 text-ink-soft">
                      {t('app.documents.byAgent')}
                    </span>
                  ) : null}
                  <span className="label shrink-0 tabular-nums text-ink-soft">
                    {formatDate(document.updated_at, locale)}
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
