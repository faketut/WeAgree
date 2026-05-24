const fs = require("node:fs");
const crypto = require("node:crypto");

// Canonical JSON — must stay in sync with lib/signing/json-canonical.ts.
// Rejects undefined / non-finite numbers / functions / symbols / bigint /
// cyclic refs so this CLI verifier matches the server's hashing rules.
function canonicalize(value) {
  return JSON.stringify(sortValue(value, new WeakSet(), "$"));
}

function sortValue(v, seen, path) {
  if (v === undefined) {
    throw new Error(`undefined is not allowed (at ${path})`);
  }
  if (v === null) return v;
  const t = typeof v;
  if (t === "number") {
    if (!Number.isFinite(v)) {
      throw new Error(`non-finite number is not allowed (at ${path}): ${String(v)}`);
    }
    return v;
  }
  if (t === "string" || t === "boolean") return v;
  if (t === "function" || t === "symbol" || t === "bigint") {
    throw new Error(`${t} is not allowed (at ${path})`);
  }
  const obj = v;
  if (seen.has(obj)) {
    throw new Error(`cyclic reference detected (at ${path})`);
  }
  seen.add(obj);
  if (Array.isArray(v)) {
    const out = v.map((item, i) => sortValue(item, seen, `${path}[${i}]`));
    seen.delete(obj);
    return out;
  }
  const out = {};
  for (const key of Object.keys(v).sort()) {
    out[key] = sortValue(v[key], seen, `${path}.${key}`);
  }
  seen.delete(obj);
  return out;
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function verifyEd25519Signature(publicKeyPem, message, signature) {
  const keyObj = crypto.createPublicKey(publicKeyPem);
  return crypto.verify(null, message, keyObj, signature);
}

function main() {
  const file = process.argv[2];
  if (!file) die("Usage: node scripts/verify-proof.js <proof.json>");

  const raw = fs.readFileSync(file, "utf8");
  const proof = JSON.parse(raw);

  if (!proof || !proof.payload || !Array.isArray(proof.signatures)) {
    die("Invalid proof file: missing payload/signatures.");
  }

  const recomputedFinal = sha256Hex(canonicalize(proof.payload));
  if (recomputedFinal !== proof.final_proof_hash) {
    die(
      `final_proof_hash mismatch.\n` +
        `  file: ${proof.final_proof_hash}\n` +
        `  calc: ${recomputedFinal}`
    );
  }

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

    const ok = verifyEd25519Signature(s.signer_public_key_pem, payloadBytes, sigBytes);
    if (!ok) die(`Signature verification FAILED for signer ${s.signer_id}`);
  }

  if (proof.anchor && proof.anchor.final_proof_hash) {
    if (proof.anchor.final_proof_hash !== proof.final_proof_hash) {
      die(
        `anchor.final_proof_hash mismatch.\n` +
          `  anchor: ${proof.anchor.final_proof_hash}\n` +
          `  proof:  ${proof.final_proof_hash}`
      );
    }
  }

  console.log("OK: proof verified locally.");
}

main();
