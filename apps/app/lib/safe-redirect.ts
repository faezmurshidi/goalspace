/**
 * Resolve a caller-supplied redirect target to a same-origin path, or `/`.
 *
 * Both the sign-in form and the OAuth callback take a destination from a query
 * string, which is attacker-controllable: anyone can send a link carrying one.
 * They previously each carried their own prefix test (starts with `/`, not
 * `//`, not `/\`), and that test has a hole. A value like `"/" + newline +
 * "//evil.com"` starts with a slash and not with a double slash, so it passes,
 * but browsers strip control characters while parsing a URL, leaving
 * `//evil.com`, which is protocol-relative and resolves with evil.com as the
 * host. The result is an open redirect that appears to originate from us.
 *
 * Parsing against the trusted origin and comparing the result closes the whole
 * class rather than that one case: absolute URLs, protocol-relative URLs,
 * backslash variants and non-http schemes all fail the same check.
 */

/**
 * Drop C0 controls and DEL, the characters a URL parser ignores.
 *
 * Written as a code-point filter rather than a regex literal so the source
 * carries no control characters of its own, which editors and diffs render
 * invisibly.
 */
function stripControlCharacters(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code > 0x1f && code !== 0x7f) out += char;
  }
  return out;
}

export function safeInternalPath(raw: string | null | undefined, origin: string): string {
  if (!raw) return '/';

  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    return '/';
  }

  // Stripped before the prefix test, so a control character cannot disguise a
  // protocol-relative prefix. The origin comparison below would catch it
  // anyway; this keeps the two checks from disagreeing about one string.
  const cleaned = stripControlCharacters(raw);
  if (!cleaned.startsWith('/') && !cleaned.startsWith(base.origin)) return '/';

  let target: URL;
  try {
    target = new URL(cleaned, base);
  } catch {
    return '/';
  }

  if (target.origin !== base.origin) return '/';

  return `${target.pathname}${target.search}${target.hash}`;
}
