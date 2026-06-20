export const LOCAL_DEFAULT_BASE_URL = "http://localhost:3000";

function stripTrailing(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Configured site URL (NEXT_PUBLIC_SITE_URL), trimmed of trailing slashes. Empty string if unset. */
export function getEnvBaseUrl(): string {
  return stripTrailing(process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "");
}

function trustedHosts(): Set<string> | null {
  const raw = process.env.NEXT_PUBLIC_TRUSTED_HOSTS?.trim();
  if (!raw) return null;
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Resolve a base URL using, in order:
 *   1. NEXT_PUBLIC_SITE_URL (in production: ALWAYS, even if it points at localhost — that's a config bug worth surfacing)
 *   2. x-forwarded-proto + x-forwarded-host (only if host is in NEXT_PUBLIC_TRUSTED_HOSTS, or we're not in production)
 *   3. host header (same trust rule)
 *   4. requestOrigin (e.g. new URL(req.url).origin)
 *   5. LOCAL_DEFAULT_BASE_URL (http://localhost:3000)
 *
 * Production posture: forwarded headers are user-controllable on platforms
 * that don't strip them. We refuse to trust them unless they match an explicit
 * allowlist OR a NEXT_PUBLIC_SITE_URL is configured (preferred).
 */
export function getBaseUrlFromHeaders(h: Headers, requestOrigin?: string): string {
  const env = getEnvBaseUrl();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && env) return env;
  if (env && !env.includes("localhost")) return env;

  const allowlist = trustedHosts();
  const hostIsTrusted = (host: string | null): boolean => {
    if (!host) return false;
    if (!allowlist) return !isProd; // dev: trust by default
    return allowlist.has(host.toLowerCase());
  };

  const proto = h.get("x-forwarded-proto");
  const fwdHost = h.get("x-forwarded-host");
  if (proto && fwdHost && hostIsTrusted(fwdHost)) {
    return stripTrailing(`${proto}://${fwdHost}`);
  }

  const host = h.get("host");
  if (host && !host.includes("localhost") && hostIsTrusted(host)) {
    return stripTrailing(`${proto ?? "https"}://${host}`);
  }

  if (requestOrigin && hostIsTrusted(hostOf(requestOrigin))) {
    return stripTrailing(requestOrigin);
  }
  if (requestOrigin && !isProd) return stripTrailing(requestOrigin);

  return env || LOCAL_DEFAULT_BASE_URL;
}

/** Best-effort base URL for server actions (no request context). */
export function getBaseUrl(): string {
  return getEnvBaseUrl() || LOCAL_DEFAULT_BASE_URL;
}
