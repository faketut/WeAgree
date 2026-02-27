import crypto from "node:crypto";

/**
 * KMS-like signing and encryption client.
 *
 * Production:
 *   - Replace the implementations of kmsSign/kmsEncryptAgreementContent/kmsDecryptAgreementContent
 *     with real KMS / TEE calls.
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

function getPublicKey(): crypto.KeyObject {
  const privateKey = getPrivateKey();
  return crypto.createPublicKey(privateKey);
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

/**
 * Encrypt agreement content using envelope encryption:
 * - Generate a random AES-256-GCM data key.
 * - Encrypt the content with that data key.
 * - Encrypt the data key with the KMS RSA key (OAEP).
 * The result is a JSON blob suitable for storage as text.
 */
export async function kmsEncryptAgreementContent(
  plaintext: Buffer
): Promise<{ blob: string; keyId: string }> {
  const dataKey = crypto.randomBytes(32); // 256-bit
  const iv = crypto.randomBytes(12); // recommended size for GCM

  const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const publicKey = getPublicKey();
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    dataKey
  );

  const blob = JSON.stringify({
    v: 1,
    alg: "AES-256-GCM+RSA-OAEP",
    key_id: SIGNING_KEY_ID,
    iv: iv.toString("base64"),
    tag: authTag.toString("base64"),
    encrypted_key: encryptedKey.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  });

  return { blob, keyId: SIGNING_KEY_ID };
}

export async function kmsDecryptAgreementContent(blob: string): Promise<Buffer> {
  const parsed = JSON.parse(blob) as {
    v: number;
    alg: string;
    key_id: string;
    iv: string;
    tag: string;
    encrypted_key: string;
    ciphertext: string;
  };

  const iv = Buffer.from(parsed.iv, "base64");
  const authTag = Buffer.from(parsed.tag, "base64");
  const encryptedKey = Buffer.from(parsed.encrypted_key, "base64");
  const ciphertext = Buffer.from(parsed.ciphertext, "base64");

  const privateKey = getPrivateKey();
  const dataKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encryptedKey
  );

  const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext;
}

