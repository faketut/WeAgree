const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape `& < > " '` for safe interpolation into HTML attribute/text content. */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

/** Return the URL only if it is an http(s) URL; otherwise null. */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    // eslint-disable-next-line no-new
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}
