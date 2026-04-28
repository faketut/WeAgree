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
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export function passkeySigningRequired(): boolean {
  return process.env.AGREEMENT_PASSKEY_REQUIRED !== "false";
}
