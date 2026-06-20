import crypto from "node:crypto";

type EncryptedBlobV1 = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string; // base64
  tag: string; // base64
  ct: string; // base64
};

type EncryptedBlobV2 = {
  v: 2;
  alg: "aes-256-gcm";
  iv: string; // base64
  tag: string; // base64
  ct: string; // base64
  /** AAD identifier; opaque to readers but kept so the shape is self-describing. */
  aad_kind: "user-key";
};

type EncryptedBlob = EncryptedBlobV1 | EncryptedBlobV2;

/** Identifies which user/key version owns an encrypted private key blob. */
export type EncryptionAad = {
  userId: string;
  keyVersion: number;
};

function getEncryptionKey(): Buffer {
  const raw = process.env.USER_KEY_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "Missing USER_KEY_ENCRYPTION_KEY (base64 32 bytes). Set it in .env / Vercel env."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "USER_KEY_ENCRYPTION_KEY must be base64-encoded 32 bytes (44 chars, typically ending with '=')."
    );
  }
  return key;
}

function buildAadBytes(aad: EncryptionAad): Buffer {
  // Stable serialization (matches canonical JSON of {user_id,key_version}).
  return Buffer.from(
    JSON.stringify({ key_version: aad.keyVersion, user_id: aad.userId }),
    "utf8"
  );
}

export function generateEd25519KeypairPem(): {
  publicKeyPem: string;
  privateKeyPem: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  return { publicKeyPem, privateKeyPem };
}

/**
 * Encrypt the user's private key PEM with AES-256-GCM and bind it to the
 * owning user + key version via AAD. New writes always produce a v2 blob.
 */
export function encryptPrivateKeyPem(privateKeyPem: string, aad: EncryptionAad): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(buildAadBytes(aad));
  const ct = Buffer.concat([cipher.update(privateKeyPem, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob: EncryptedBlobV2 = {
    v: 2,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
    aad_kind: "user-key",
  };
  return JSON.stringify(blob);
}

/**
 * Decrypt a private key blob. v2 blobs require AAD that matches the original
 * encryption context; v1 blobs (legacy, pre-AAD) are still accepted for
 * back-compat but should be rotated.
 */
export function decryptPrivateKeyPem(encrypted: string, aad: EncryptionAad): string {
  const key = getEncryptionKey();
  const blob = JSON.parse(encrypted) as EncryptedBlob;
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const ct = Buffer.from(blob.ct, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  if (blob.v === 2) {
    decipher.setAAD(buildAadBytes(aad));
  }
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function signWithEd25519Pem(privateKeyPem: string, data: Buffer): Buffer {
  const keyObj = crypto.createPrivateKey(privateKeyPem);
  return crypto.sign(null, data, keyObj);
}
