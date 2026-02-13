/**
 * Decode JWT payload without verification (cookie is httpOnly; we only check exp).
 * Edge-compatible (no Buffer). Do not use for security-critical verification.
 */
export function isAuthingTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "====".slice(0, 4 - pad);
    const json = atob(base64);
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== "number") return true; // no exp, assume valid
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const AUTHING_SESSION_COOKIE = "authing_session";
