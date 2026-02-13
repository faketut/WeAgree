"use client";

import { AuthenticationClient } from "authing-js-sdk";

const appId = process.env.NEXT_PUBLIC_AUTHING_APP_ID;
const host = process.env.NEXT_PUBLIC_AUTHING_HOST; // optional, e.g. private deployment

/**
 * Authing client for browser. Used on login page for GitHub OAuth.
 * Requires NEXT_PUBLIC_AUTHING_APP_ID in env.
 */
export function getAuthingClient(): AuthenticationClient | null {
  if (!appId) return null;
  return new AuthenticationClient({ appId, ...(host && { host }) });
}

export const AUTHING_PROVIDER_GITHUB = "github" as const;
