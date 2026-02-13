/**
 * Authing AuthenticationClient for browser (QR code login).
 * Per Authing docs: appId and appHost are both required.
 * Use NEXT_PUBLIC_ env vars only so this is safe in client components.
 * On the server, initialize a new AuthenticationClient per request if needed.
 */

import { AuthenticationClient } from "authing-js-sdk";

const APP_HOST_FORMAT = "https://YOUR_DOMAIN.authing.cn";

export function getAuthingClient(): AuthenticationClient {
  const appId = process.env.NEXT_PUBLIC_AUTHING_APP_ID;
  const appHost = process.env.NEXT_PUBLIC_AUTHING_APP_HOST;
  if (!appId) {
    throw new Error("NEXT_PUBLIC_AUTHING_APP_ID is not set");
  }
  if (!appHost) {
    throw new Error(
      "NEXT_PUBLIC_AUTHING_APP_HOST is not set (required, e.g. " + APP_HOST_FORMAT + ")"
    );
  }
  return new AuthenticationClient({
    appId,
    appHost,
  });
}

export function isAuthingConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_AUTHING_APP_ID &&
      process.env.NEXT_PUBLIC_AUTHING_APP_HOST
  );
}
