/**
 * KMS adapter interface.
 *
 * Implementations must:
 * - sign(data) using a strong asymmetric signature (RSA-PSS or Ed25519)
 * - encrypt(plaintext) using envelope encryption (random data key + RSA-OAEP wrap)
 * - decrypt(blob) inverse of encrypt
 * - expose a stable keyId for audit trails
 *
 * The local dev implementation lives in ./local. A production swap should
 * replace `selectAdapter()` in ./index to dispatch on the KMS_PROVIDER env var.
 */
export interface KmsAdapter {
  readonly keyId: string;
  sign(_data: Buffer): Promise<{ signature: Buffer; keyId: string }>;
  encrypt(_plaintext: Buffer): Promise<{ blob: string; keyId: string }>;
  decrypt(_blob: string): Promise<Buffer>;
}
