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
export function fromZodError(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return { ok: false, message: 'app.errors.validation', fieldErrors };
}
