import type { KmsAdapter } from "./interface";

/**
 * AWS KMS adapter (stub).
 *
 * Production swap target. Implementation outline:
 * - `sign`: KMS#Sign with SigningAlgorithm=RSASSA_PSS_SHA_256.
 * - `encrypt`: GenerateDataKey for the AES-256 key, then KMS#Encrypt the data
 *   key reference; ciphertext stays envelope-formatted to match LocalKmsAdapter.
 * - `decrypt`: KMS#Decrypt of the wrapped key, then AES-GCM unwrap.
 *
 * Wire this in by exporting a real implementation and routing on KMS_PROVIDER
 * in ./index.ts.
 */
export class AwsKmsAdapter implements KmsAdapter {
  readonly keyId: string;

  constructor(keyId: string) {
    this.keyId = keyId;
  }

  async sign(_data: Buffer): Promise<{ signature: Buffer; keyId: string }> {
    throw new Error("AwsKmsAdapter.sign not implemented. See lib/signing/kms/aws.ts.");
  }

  async encrypt(_plaintext: Buffer): Promise<{ blob: string; keyId: string }> {
    throw new Error("AwsKmsAdapter.encrypt not implemented. See lib/signing/kms/aws.ts.");
  }

  async decrypt(_blob: string): Promise<Buffer> {
    throw new Error("AwsKmsAdapter.decrypt not implemented. See lib/signing/kms/aws.ts.");
  }
}
