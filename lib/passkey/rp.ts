import { getEnvBaseUrl } from "@/lib/utils/baseUrl";

/**
 * WebAuthn RP configuration (server + client must match).
 */
export function getWebAuthnRpId(): string {
  const fromEnv = process.env.WEBAUTHN_RP_ID?.trim();
  if (fromEnv) return fromEnv;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      const host = new URL(site).hostname;
      if (host) return host;
    } catch {
      /* ignore */
    }
  }
  return "localhost";
}

export function getWebAuthnExpectedOrigin(): string {
  const env = getEnvBaseUrl();
  if (env) return env;
  return "http://localhost:3000";
}

export function passkeySigningRequired(): boolean {
  // With auto-assigned per-user keypairs, passkey is an optional step-up.
  // Set explicitly to "true" to enforce passkey signing.
  return process.env.AGREEMENT_PASSKEY_REQUIRED === "true";
}
