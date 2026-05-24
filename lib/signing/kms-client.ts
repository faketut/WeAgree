/**
 * Public KMS-like signing and encryption API.
 *
 * Thin facade over the adapter in lib/signing/kms. The adapter is selected
 * by KMS_PROVIDER (local | aws). Switching providers requires no caller
 * changes — only env config.
 *
 * Production deployments MUST set KMS_PROVIDER=aws (or another real KMS)
 * AND wire credentials. See README › Production checklist.
 */
import { getKmsAdapter } from "./kms";

export async function kmsSign(
  data: Buffer
): Promise<{ signature: Buffer; keyId: string }> {
  return getKmsAdapter().sign(data);
}

export async function kmsEncryptAgreementContent(
  plaintext: Buffer
): Promise<{ blob: string; keyId: string }> {
  return getKmsAdapter().encrypt(plaintext);
}

export async function kmsDecryptAgreementContent(blob: string): Promise<Buffer> {
  return getKmsAdapter().decrypt(blob);
}
