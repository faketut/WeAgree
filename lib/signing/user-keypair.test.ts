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
  it("generates a valid PEM Ed25519 keypair", () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeypairPem();
    expect(publicKeyPem).toContain("BEGIN PUBLIC KEY");
    expect(privateKeyPem).toContain("BEGIN PRIVATE KEY");
  });

  it("round-trips encryption/decryption", () => {
    const { privateKeyPem } = generateEd25519KeypairPem();
    const blob = encryptPrivateKeyPem(privateKeyPem);
    expect(blob).toContain('"alg":"aes-256-gcm"');
    expect(decryptPrivateKeyPem(blob)).toBe(privateKeyPem);
  });

  it("produces a different ciphertext per call (random IV)", () => {
    const { privateKeyPem } = generateEd25519KeypairPem();
    expect(encryptPrivateKeyPem(privateKeyPem)).not.toBe(encryptPrivateKeyPem(privateKeyPem));
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
    const blob = JSON.parse(encryptPrivateKeyPem(privateKeyPem));
    blob.ct = Buffer.from("tampered").toString("base64");
    expect(() => decryptPrivateKeyPem(JSON.stringify(blob))).toThrow();
  });
});
