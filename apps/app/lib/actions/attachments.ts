'use server';

import { revalidatePath } from 'next/cache';

import { fail, ok, type ActionResult } from '@/lib/actions/result';
import { isAllowedAttachment } from '@/lib/attachments/kinds';
import { requireSessionContext } from '@/lib/auth/session';
import { ATTACHMENTS_BUCKET, deleteAttachment, recordAttachment } from '@/lib/db/attachments';
import { getProjectBySlug } from '@/lib/db/projects';

/**
 * Record a file that has already been uploaded to storage.
 *
 * The bytes go straight from the browser to Supabase Storage, which is what the
 * per-owner storage policies are written for; a fifty-megabyte STEP file has no
 * reason to travel through a server action. This records the row afterwards, so
 * the attachment only exists once the object does.
 *
 * The extension is checked here as well as in the browser. The client check is
 * a courtesy that stops a doomed upload; this one is the rule, because the
 * bucket must accept `application/octet-stream` for CAD to work at all and
 * therefore cannot police what it holds.
 */
export async function attachToDocumentAction(
  slug: string,
  input: {
    documentId: string;
    filename: string;
    storagePath: string;
    mimeType: string;
    byteSize: number;
  }
): Promise<ActionResult<{ id: string }>> {
  if (!isAllowedAttachment(input.filename)) {
    return fail('app.attachments.typeRefused');
  }

  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) return fail('app.errors.projectMissing');

  // The path is generated client-side, so it is checked rather than trusted:
  // storage RLS already refuses an upload outside the owner's own prefix, but a
  // row pointing at another project's folder would still be a mis-filed record.
  if (!input.storagePath.startsWith(`${userId}/${project.id}/`)) {
    return fail('app.errors.generic');
  }

  try {
    const attachment = await recordAttachment(supabase, {
      projectId: project.id,
      ownerId: userId,
      documentId: input.documentId,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
    });

    revalidatePath(`/projects/${slug}/documents/${input.documentId}`);
    return ok({ id: attachment.id });
  } catch (error) {
    console.error('attachToDocumentAction failed', error);
    return fail('app.errors.generic');
  }
}

export async function removeAttachmentAction(
  slug: string,
  attachmentId: string,
  documentId: string
): Promise<ActionResult<{ removed: true }>> {
  const { supabase, userId } = await requireSessionContext();
  const project = await getProjectBySlug(supabase, userId, slug);
  if (!project) return fail('app.errors.projectMissing');

  try {
    const removed = await deleteAttachment(supabase, attachmentId);
    if (!removed) return fail('app.errors.generic');

    // The row goes first, then the object. The other order can leave a row
    // pointing at nothing if the second step fails, which renders as a broken
    // attachment forever; this order can leave an orphaned object, which is
    // invisible and cheap. Same asymmetry deleteProject already documents.
    const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([removed.storagePath]);
    if (error) console.error('Attachment row removed but object remains', removed.storagePath);

    revalidatePath(`/projects/${slug}/documents/${documentId}`);
    return ok({ removed: true });
  } catch (error) {
    console.error('removeAttachmentAction failed', error);
    return fail('app.errors.generic');
  }
}
