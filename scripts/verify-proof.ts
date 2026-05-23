import fs from "node:fs";
import crypto from "node:crypto";
import { canonicalize } from "../lib/signing/json-canonical";

function sha256Hex(buf: Buffer | string): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function die(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

type ProofFile = {
  final_proof_hash: string;
  payload: any;
  signatures: Array<{
    signer_id: string;
    signing_payload: any;
    signing_payload_hash: string | null;
    signature_hash: string | null;
    signature_bytes_base64: string | null;
    signer_public_key_pem: string | null;
    signer_key_fingerprint: string | null;
    signer_key_version: number | null;
  }>;
  anchor?: { final_proof_hash?: string | null } | null;
};

function verifyEd25519Signature(
  publicKeyPem: string,
  message: Buffer,
  signature: Buffer
): boolean {
  const keyObj = crypto.createPublicKey(publicKeyPem);
  return crypto.verify(null, message, keyObj, signature);
}

function main() {
  const file = process.argv[2];
  if (!file) die("Usage: ts-node scripts/verify-proof.ts <proof.json>");

  const raw = fs.readFileSync(file, "utf8");
  const proof = JSON.parse(raw) as ProofFile;

  if (!proof?.payload || !Array.isArray(proof.signatures)) {
    die("Invalid proof file: missing payload/signatures.");
  }

  // 1) Recompute final_proof_hash
  const recomputedFinal = sha256Hex(canonicalize(proof.payload));
  if (recomputedFinal !== proof.final_proof_hash) {
    die(
      `final_proof_hash mismatch.\n` +
        `  file: ${proof.final_proof_hash}\n` +
        `  calc: ${recomputedFinal}`
    );
  }

  // 2) Verify each signer signature + hashes
  for (const s of proof.signatures) {
    if (!s.signature_bytes_base64) {
      die(`Missing signature bytes for signer ${s.signer_id}`);
    }
    if (!s.signer_public_key_pem) {
      die(`Missing signer public key PEM for signer ${s.signer_id}`);
    }
    if (!s.signing_payload) {
      die(`Missing signing_payload for signer ${s.signer_id}`);
    }

    const payloadBytes = Buffer.from(canonicalize(s.signing_payload), "utf8");
    const payloadHash = sha256Hex(payloadBytes);
    if (s.signing_payload_hash && s.signing_payload_hash !== payloadHash) {
      die(
        `signing_payload_hash mismatch for signer ${s.signer_id}\n` +
          `  file: ${s.signing_payload_hash}\n` +
          `  calc: ${payloadHash}`
      );
    }

    const sigBytes = Buffer.from(s.signature_bytes_base64, "base64");
    const sigHash = sha256Hex(sigBytes);
    if (s.signature_hash && s.signature_hash !== sigHash) {
      die(
        `signature_hash mismatch for signer ${s.signer_id}\n` +
          `  file: ${s.signature_hash}\n` +
          `  calc: ${sigHash}`
      );
    }

    const fp = sha256Hex(Buffer.from(s.signer_public_key_pem, "utf8"));
    if (s.signer_key_fingerprint && s.signer_key_fingerprint !== fp) {
      die(
        `signer_key_fingerprint mismatch for signer ${s.signer_id}\n` +
          `  file: ${s.signer_key_fingerprint}\n` +
          `  calc: ${fp}`
      );
    }

    const ok = verifyEd25519Signature(
      s.signer_public_key_pem,
      payloadBytes,
      sigBytes
    );
    if (!ok) die(`Signature verification FAILED for signer ${s.signer_id}`);
  }

  // 3) Optional: compare anchor receipt hash if present
  if (proof.anchor?.final_proof_hash) {
    if (proof.anchor.final_proof_hash !== proof.final_proof_hash) {
      die(
        `anchor.final_proof_hash mismatch.\n` +
          `  anchor: ${proof.anchor.final_proof_hash}\n` +
          `  proof:  ${proof.final_proof_hash}`
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log("OK: proof verified locally.");
}

main();

