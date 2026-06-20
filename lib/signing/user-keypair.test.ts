import crypto from "node:crypto";
import {
  encryptPrivateKeyPem,
  decryptPrivateKeyPem,
  generateEd25519KeypairPem,
  signWithEd25519Pem,
} from "./user-keypair";

const ORIGINAL_ENV = process.env.USER_KEY_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.USER_KEY_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
});

afterAll(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.USER_KEY_ENCRYPTION_KEY;
  } else {
    process.env.USER_KEY_ENCRYPTION_KEY = ORIGINAL_ENV;
  }
});

describe("user-keypair", () => {
  const aad = { userId: "user-1", keyVersion: 1 };

  it("generates a valid PEM Ed25519 keypair", () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeypairPem();
    expect(publicKeyPem).toContain("BEGIN PUBLIC KEY");
    expect(privateKeyPem).toContain("BEGIN PRIVATE KEY");
  });

  it("round-trips encryption/decryption", () => {
    const { privateKeyPem } = generateEd25519KeypairPem();
    const blob = encryptPrivateKeyPem(privateKeyPem, aad);
    expect(blob).toContain('"alg":"aes-256-gcm"');
    expect(decryptPrivateKeyPem(blob, aad)).toBe(privateKeyPem);
  });

  it("produces a different ciphertext per call (random IV)", () => {
    const { privateKeyPem } = generateEd25519KeypairPem();
    expect(encryptPrivateKeyPem(privateKeyPem, aad)).not.toBe(
      encryptPrivateKeyPem(privateKeyPem, aad)
    );
  });

  it("signs and verifies with the generated key", () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeypairPem();
    const msg = Buffer.from("hello world", "utf8");
    const sig = signWithEd25519Pem(privateKeyPem, msg);
    const ok = crypto.verify(null, msg, crypto.createPublicKey(publicKeyPem), sig);
    expect(ok).toBe(true);
  });

  it("rejects tampered ciphertext", () => {
    const { privateKeyPem } = generateEd25519KeypairPem();
    const blob = JSON.parse(encryptPrivateKeyPem(privateKeyPem, aad));
    blob.ct = Buffer.from("tampered").toString("base64");
    expect(() => decryptPrivateKeyPem(JSON.stringify(blob), aad)).toThrow();
  });

  it("rejects decrypt with mismatched AAD (different user)", () => {
    const { privateKeyPem } = generateEd25519KeypairPem();
    const blob = encryptPrivateKeyPem(privateKeyPem, aad);
    expect(() => decryptPrivateKeyPem(blob, { userId: "user-2", keyVersion: 1 })).toThrow();
  });

  it("rejects decrypt with mismatched AAD (different key version)", () => {
    const { privateKeyPem } = generateEd25519KeypairPem();
    const blob = encryptPrivateKeyPem(privateKeyPem, aad);
    expect(() => decryptPrivateKeyPem(blob, { userId: "user-1", keyVersion: 2 })).toThrow();
  });

  it("still decrypts legacy v1 blobs (no AAD bound)", () => {
    // Simulate a v1 blob produced by the previous version of this module.
    const cryptoMod = crypto;
    const { privateKeyPem } = generateEd25519KeypairPem();
    const key = Buffer.from(process.env.USER_KEY_ENCRYPTION_KEY as string, "base64");
    const iv = cryptoMod.randomBytes(12);
    const cipher = cryptoMod.createCipheriv("aes-256-gcm", key, iv);
    const ct = Buffer.concat([cipher.update(privateKeyPem, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const legacyBlob = JSON.stringify({
      v: 1,
      alg: "aes-256-gcm",
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ct: ct.toString("base64"),
    });
    expect(decryptPrivateKeyPem(legacyBlob, aad)).toBe(privateKeyPem);
  });
});
