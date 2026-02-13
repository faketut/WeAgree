/**
 * Authing AuthenticationClient for server (API routes, server actions).
 * Per Authing docs: "我们推荐每次请求初始化一个新的 AuthenticationClient，保证不同请求之间完全隔离."
 * Use this in API routes; do not reuse the instance across requests.
 *
 * For ManagementClient (admin operations), init once and reuse globally.
 */

import { AuthenticationClient } from "authing-js-sdk";

export function createServerAuthingClient(): AuthenticationClient {
  const appId = process.env.NEXT_PUBLIC_AUTHING_APP_ID;
  const appHost = process.env.NEXT_PUBLIC_AUTHING_APP_HOST;
  if (!appId || !appHost) {
    throw new Error(
      "NEXT_PUBLIC_AUTHING_APP_ID and NEXT_PUBLIC_AUTHING_APP_HOST are required for server Authing client"
    );
  }
  return new AuthenticationClient({
    appId,
    appHost,
  });
}
