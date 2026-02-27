import crypto from "node:crypto";

/**
 * KMS-like signing client.
 *
 * Production:
 *   - Replace the implementation of kmsSign with a real KMS / TEE call.
 *   - NEVER store private keys in env or on disk.
 *
 * Development:
 *   - Optionally use SIGNING_PRIVATE_KEY_PEM (PEM) for deterministic testing.
 *   - Otherwise generate an in-memory keypair per process (not persisted).
 */

const SIGNING_KEY_ID = process.env.SIGNING_KEY_ID || "local-dev-key";
const SIGNING_PRIVATE_KEY_PEM = process.env.SIGNING_PRIVATE_KEY_PEM;

let devKeyPair: crypto.KeyPairKeyObjectResult | null = null;

function getPrivateKey(): crypto.KeyObject {
  if (SIGNING_PRIVATE_KEY_PEM) {
    return crypto.createPrivateKey({
      key: SIGNING_PRIVATE_KEY_PEM,
      format: "pem",
    });
  }

  if (!devKeyPair) {
    devKeyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicExponent: 0x10001,
    });
  }

  return devKeyPair.privateKey;
}

export async function kmsSign(
  data: Buffer
): Promise<{ signature: Buffer; keyId: string }> {
  const privateKey = getPrivateKey();

  const signature = crypto.sign("sha256", data, {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  });

  return { signature, keyId: SIGNING_KEY_ID };
}

