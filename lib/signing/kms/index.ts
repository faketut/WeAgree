import type { KmsAdapter } from "./interface";
import { LocalKmsAdapter } from "./local";
import { AwsKmsAdapter } from "./aws";

let cached: KmsAdapter | null = null;

function selectAdapter(): KmsAdapter {
  const provider = (process.env.KMS_PROVIDER ?? "local").toLowerCase();
  const keyId = process.env.SIGNING_KEY_ID || "local-dev-key";

  if (provider === "aws") {
    return new AwsKmsAdapter(keyId);
  }
  return new LocalKmsAdapter(keyId, process.env.SIGNING_PRIVATE_KEY_PEM);
}

export function getKmsAdapter(): KmsAdapter {
  if (!cached) cached = selectAdapter();
  return cached;
}

/** Test-only: reset the cached adapter after env mutation. */
export function _resetKmsAdapterForTests(): void {
  cached = null;
}

export type { KmsAdapter };
