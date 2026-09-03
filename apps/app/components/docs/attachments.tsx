'use client';

import { useRef, useState } from 'react';
import { useAppTranslations } from '@goalspace/i18n';
import { Button } from '@goalspace/ui';

import { attachToDocumentAction, removeAttachmentAction } from '@/lib/actions/attachments';
import {
  ALLOWED_EXTENSIONS,
  attachmentKind,
  formatBytes,
  isAllowedAttachment,
} from '@/lib/attachments/kinds';
import { ATTACHMENTS_BUCKET, storagePathFor } from '@/lib/db/attachments';
import { createClient } from '@/utils/supabase/client';

export interface AttachmentView {
  id: string;
  filename: string;
  byteSize: number;
  /** Signed and short-lived; the bucket is private. Null if signing failed. */
  url: string | null;
}

/**
 * The files that belong to a document.
 *
 * Bytes go straight from the browser to Supabase Storage under the owner's own
 * path prefix, which is what the storage policies are written for. A
 * fifty-megabyte STEP file has no reason to travel through a server action, and
 * the row is only recorded once the object exists.
 *
 * Images preview. Everything else — SVG included — is a named, sized link.
 * That is not a limitation to fix later: a STEP assembly has no browser
 * rendering, and an SVG rendered from this origin could carry script.
 */
export function Attachments({
  slug,
  documentId,
  projectId,
  ownerId,
  attachments,
}: {
  slug: string;
  documentId: string;
  projectId: string;
  ownerId: string;
  attachments: AttachmentView[];
}) {
  const { t } = useAppTranslations();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);

    // A courtesy check. The rule is the server's, because the bucket has to
    // accept octet-stream for CAD to work and so cannot police itself.
    if (!isAllowedAttachment(file.name)) {
      setError(t('app.attachments.typeRefused'));
      return;
    }

    setBusy(true);
    const path = storagePathFor({ ownerId, projectId, filename: file.name });
    const supabase = createClient();

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream' });

    if (uploadError) {
      setBusy(false);
      setError(t('app.attachments.uploadFailed'));
      return;
    }

    const result = await attachToDocumentAction(slug, {
      documentId,
      filename: file.name,
      storagePath: path,
      mimeType: file.type || 'application/octet-stream',
      byteSize: file.size,
    });

    setBusy(false);
    if (!result.ok) setError(t(result.message));
    if (input.current) input.current.value = '';
  }

  return (
    <section className="pt-10">
      <h2 className="label border-rule text-ink-soft border-b pb-2">
        {t('app.attachments.title')}
      </h2>

      {attachments.length === 0 ? (
        <p className="text-ink-soft py-6">{t('app.attachments.empty')}</p>
      ) : (
        <ul className="py-4">
          {attachments.map((attachment) => {
            const kind = attachmentKind(attachment.filename);
            return (
              <li key={attachment.id} className="border-rule border-b py-3">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {attachment.url ? (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-body text-ink hover:text-ink-soft min-w-0 flex-1 underline underline-offset-2"
                    >
                      {attachment.filename}
                    </a>
                  ) : (
                    <span className="text-body text-ink-soft min-w-0 flex-1">
                      {attachment.filename}
                    </span>
                  )}
                  <span className="label text-ink-soft shrink-0 tabular-nums">
                    {formatBytes(attachment.byteSize)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachmentAction(slug, attachment.id, documentId)}
                    className="label text-ink-soft hover:text-oxide shrink-0 underline underline-offset-2"
                  >
                    {t('app.attachments.remove')}
                  </button>
                </div>

                {kind === 'image' && attachment.url ? (
                  // Only the formats that cannot carry script. A STEP assembly
                  // has no rendering and an SVG could execute, so both stay
                  // links.
                  <img
                    src={attachment.url}
                    alt={attachment.filename}
                    className="border-rule mt-3 max-h-96 border"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p role="alert" className="label text-oxide mt-2">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept={ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          className="label text-ink-soft"
          aria-label={t('app.attachments.add')}
        />
        <span className="label text-ink-soft">{t('app.attachments.hint')}</span>
        {busy ? (
          <span className="label text-ink-soft">{t('app.attachments.uploading')}</span>
        ) : null}
      </div>
    </section>
  );
}
