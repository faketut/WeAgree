/**
 * Lightweight rate limiter.
 *
 * Backend: Upstash Redis via REST (no SDK dep). Gated by env:
 *   - UPSTASH_REDIS_REST_URL
 *   - UPSTASH_REDIS_REST_TOKEN
 *
 * If either is unset (e.g. dev / CI), this becomes a no-op so behaviour is
 * unchanged. Production deployments MUST set both before public launch.
 *
 * Algorithm: sliding-window-ish via INCR + EXPIRE on first hit. Good enough
 * for abuse prevention; not exact. Swap to @upstash/ratelimit if you need
 * token-bucket precision.
 */
import { log } from "@/lib/log";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Seconds until the window resets. */
  resetSeconds: number;
};

const URL_ENV = "UPSTASH_REDIS_REST_URL";
const TOKEN_ENV = "UPSTASH_REDIS_REST_TOKEN";

function envOrNull(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

async function redisExec(args: string[]): Promise<unknown> {
  const url = envOrNull(URL_ENV);
  const token = envOrNull(TOKEN_ENV);
  if (!url || !token) throw new Error("rate-limit backend not configured");

  const res = await fetch(`${url}/${args.map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const body = (await res.json()) as { result?: unknown };
  return body.result;
}

/**
 * Allow up to `limit` actions per `windowSeconds` window keyed by `key`.
 * Returns { allowed: true } if the backend is unconfigured (fail-open in dev).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!envOrNull(URL_ENV) || !envOrNull(TOKEN_ENV)) {
    return { allowed: true, remaining: limit, limit, resetSeconds: windowSeconds };
  }

  try {
    const count = Number((await redisExec(["INCR", key])) ?? 0);
    if (count === 1) {
      await redisExec(["EXPIRE", key, String(windowSeconds)]);
    }
    const remaining = Math.max(0, limit - count);
    return {
      allowed: count <= limit,
      remaining,
      limit,
      resetSeconds: windowSeconds,
    };
  } catch (e) {
    log.warn("rate-limit backend error; failing open", {
      key,
      error: e instanceof Error ? e.message : String(e),
    });
    return { allowed: true, remaining: limit, limit, resetSeconds: windowSeconds };
  }
}

/** Build a stable namespaced key. */
export function rateLimitKey(scope: string, subject: string): string {
  return `rl:${scope}:${subject}`;
}
