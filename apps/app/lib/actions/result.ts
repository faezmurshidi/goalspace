import { z } from 'zod';

/**
 * Actions return a result rather than throwing.
 *
 * A thrown error in a Server Action reaches the client as an opaque digest in
 * production, which is right for a bug but useless for "that title is too
 * long". Optimistic capture in particular has to know precisely why a write
 * failed so it can roll back and offer a retry that preserves the typed text,
 * and losing captured text is the worst failure this product has.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(message: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

/**
 * Translate a zod failure into field errors the form can attach to inputs.
 *
 * The message is an i18n key, not prose: actions run on the server where
 * there is no i18next instance bound to the user's locale, so the client
 * resolves it. Returning English here would hard-code one locale into every
 * error the workspace can produce.
 */
function issueToKey(issue: z.ZodIssue): string {
  // issue.message is Zod's own English prose. Returning it would put an
  // untranslated string straight into an interface that serves en, ms and zh,
  // so each issue is mapped to a key the client resolves in its own locale.
  switch (issue.code) {
    case z.ZodIssueCode.too_small:
      return 'app.errors.fieldRequired';
    case z.ZodIssueCode.too_big:
      return 'app.errors.fieldTooLong';
    default:
      return 'app.errors.fieldInvalid';
  }
}

export function fromZodError(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    const bucket = (fieldErrors[key] ??= []);
    const translationKey = issueToKey(issue);
    // One key per field is enough; repeating it renders the same sentence
    // twice under one input.
    if (!bucket.includes(translationKey)) bucket.push(translationKey);
  }

  return { ok: false, message: 'app.errors.validation', fieldErrors };
}
