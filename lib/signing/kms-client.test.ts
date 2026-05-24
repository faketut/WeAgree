import crypto from "node:crypto";

// Set env BEFORE importing kms-client, because it captures values at module load.
const TEST_KEY = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = TEST_KEY.privateKey.export({ type: "pkcs1", format: "pem" }).toString();
process.env.SIGNING_PRIVATE_KEY_PEM = PEM;

// Use require() so the env var above is set before kms-client's module-load capture.
const kms = require("./kms-client") as typeof import("./kms-client");

describe("kms-client", () => {
  it("kmsSign returns a signature + keyId and verifies against the public key", async () => {
    const data = Buffer.from("payload");
    const { signature, keyId } = await kms.kmsSign(data);
    expect(typeof keyId).toBe("string");
    const ok = crypto.verify(
      "sha256",
      data,
      {
        key: TEST_KEY.publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      signature
    );
    expect(ok).toBe(true);
  });

  it("envelope encryption round-trips arbitrary plaintext", async () => {
    const plaintext = Buffer.from("the quick brown fox 1234", "utf8");
    const { blob } = await kms.kmsEncryptAgreementContent(plaintext);
    expect(blob).toContain('"alg":"AES-256-GCM+RSA-OAEP"');
    const decrypted = await kms.kmsDecryptAgreementContent(blob);
    expect(decrypted.equals(plaintext)).toBe(true);
  });
});
