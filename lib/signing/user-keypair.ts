import crypto from "node:crypto";

type EncryptedBlob = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string; // base64
  tag: string; // base64
  ct: string; // base64
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

export function generateEd25519KeypairPem(): {
  publicKeyPem: string;
  privateKeyPem: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  return { publicKeyPem, privateKeyPem };
}

export function encryptPrivateKeyPem(privateKeyPem: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(privateKeyPem, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob: EncryptedBlob = {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
  };
  return JSON.stringify(blob);
}

export function decryptPrivateKeyPem(encrypted: string): string {
  const key = getEncryptionKey();
  const blob = JSON.parse(encrypted) as EncryptedBlob;
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const ct = Buffer.from(blob.ct, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function signWithEd25519Pem(privateKeyPem: string, data: Buffer): Buffer {
  const keyObj = crypto.createPrivateKey(privateKeyPem);
  return crypto.sign(null, data, keyObj);
}
