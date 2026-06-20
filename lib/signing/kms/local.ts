import crypto from "node:crypto";
import type { KmsAdapter } from "./interface";
import { log } from "@/lib/log";

/**
 * Local / dev KMS adapter.
 *
 * - Loads a PEM private key from SIGNING_PRIVATE_KEY_PEM when present.
 * - Otherwise generates an in-memory RSA keypair (NEVER use in production).
 * - Refuses to run in production without an explicit PEM key.
 */
export class LocalKmsAdapter implements KmsAdapter {
  readonly keyId: string;
  private readonly pemFromEnv: string | undefined;
  private devKeyPair: crypto.KeyPairKeyObjectResult | null = null;

  constructor(keyId: string, pemFromEnv: string | undefined) {
    this.keyId = keyId;
    this.pemFromEnv = pemFromEnv;
  }

  private getPrivateKey(): crypto.KeyObject {
    if (this.pemFromEnv) {
      return crypto.createPrivateKey({ key: this.pemFromEnv, format: "pem" });
    }

    if (process.env.NODE_ENV === "production") {
      log.error(
        "SIGNING_PRIVATE_KEY_PEM is unset in production; refusing to use ephemeral dev key."
      );
      throw new Error(
        "SIGNING_PRIVATE_KEY_PEM must be configured in production. See README › Production checklist."
      );
    }

    if (!this.devKeyPair) {
      this.devKeyPair = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicExponent: 0x10001,
      });
    }
    return this.devKeyPair.privateKey;
  }

  private getPublicKey(): crypto.KeyObject {
    return crypto.createPublicKey(this.getPrivateKey());
  }

  async sign(data: Buffer) {
    const signature = crypto.sign("sha256", data, {
      key: this.getPrivateKey(),
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    });
    return { signature, keyId: this.keyId };
  }

  async encrypt(plaintext: Buffer) {
    const dataKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedKey = crypto.publicEncrypt(
      {
        key: this.getPublicKey(),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      dataKey
    );

    const blob = JSON.stringify({
      v: 1,
      alg: "AES-256-GCM+RSA-OAEP",
      key_id: this.keyId,
      iv: iv.toString("base64"),
      tag: authTag.toString("base64"),
      encrypted_key: encryptedKey.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    });

    return { blob, keyId: this.keyId };
  }

  async decrypt(blob: string) {
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

    const dataKey = crypto.privateDecrypt(
      {
        key: this.getPrivateKey(),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      encryptedKey
    );

    const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
