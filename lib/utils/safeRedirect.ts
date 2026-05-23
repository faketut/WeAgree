const DEFAULT_PATH = "/dashboard";

/**
 * Sanitize a user-supplied `redirectTo` value to a same-origin relative path.
 * Rejects protocol-relative (`//evil.com`), backslash-tricks (`/\evil.com`),
 * absolute URLs, anything containing `@` (credential injection), and any
 * value that does not start with a single `/`.
 *
 * Returns "/dashboard" when input is missing or unsafe.
 */
export function safeRelativePath(input: string | null | undefined, fallback = DEFAULT_PATH): string {
  if (!input || typeof input !== "string") return fallback;

  let candidate = input.trim();
  if (!candidate) return fallback;

  // Decode once to catch %2F%2F and similar tricks.
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  if (!candidate.startsWith("/")) return fallback;
  if (candidate.length > 1 && (candidate[1] === "/" || candidate[1] === "\\")) return fallback;
  if (candidate.includes("\\")) return fallback;
  if (candidate.includes("@")) return fallback;
  // Reject any scheme-ish content
  if (/^\/+[a-z][a-z0-9+\-.]*:/i.test(candidate)) return fallback;

  return candidate;
}
