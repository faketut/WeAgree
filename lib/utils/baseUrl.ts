const LOCAL_DEFAULT = "http://localhost:3000";

function stripTrailing(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Configured site URL (NEXT_PUBLIC_SITE_URL), trimmed of trailing slashes. Empty string if unset. */
export function getEnvBaseUrl(): string {
  return stripTrailing(process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "");
}

/**
 * Resolve a base URL using, in order:
 *   1. NEXT_PUBLIC_SITE_URL (unless it points at localhost)
 *   2. x-forwarded-proto + x-forwarded-host
 *   3. host header (assumed https unless localhost)
 *   4. requestOrigin (e.g. new URL(req.url).origin)
 *   5. LOCAL_DEFAULT (http://localhost:3000)
 */
export function getBaseUrlFromHeaders(h: Headers, requestOrigin?: string): string {
  const env = getEnvBaseUrl();
  if (env && !env.includes("localhost")) return env;

  const proto = h.get("x-forwarded-proto");
  const fwdHost = h.get("x-forwarded-host");
  if (proto && fwdHost) return stripTrailing(`${proto}://${fwdHost}`);

  const host = h.get("host");
  if (host && !host.includes("localhost")) {
    return stripTrailing(`${proto ?? "https"}://${host}`);
  }

  if (requestOrigin) return stripTrailing(requestOrigin);
  return env || LOCAL_DEFAULT;
}

/** Best-effort base URL for server actions (no request context). */
export function getBaseUrl(): string {
  return getEnvBaseUrl() || LOCAL_DEFAULT;
}
