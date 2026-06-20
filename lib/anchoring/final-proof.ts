import { canonicalize } from "@/lib/signing/json-canonical";
import crypto from "node:crypto";

export type FinalProofSignerEntry = {
  signer_id: string;
  slot_index: number | null;
  signing_timestamp: string | null;
  signing_payload_hash: string | null;
  signature_hash: string | null;
  key_fingerprint: string | null;
  key_version: number | null;
  passkey_credential_id: string | null;
};

export type FinalProofPayload = {
  agreement_id: string;
  version_id: string;
  version_number: number;
  content_hash: string;
  signers: FinalProofSignerEntry[];
  signed_at: string;
};

export function sha256HexUtf8(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Deterministic ordering of signers used by both `computeFinalProofHash` and
 * `computeSignerListHash`. We sort by `(slot_index, signer_id)` so that two
 * callers producing the same logical set of signers always hash to the same
 * value, regardless of insertion order or `signed_at` resolution.
 */
function sortSigners(signers: FinalProofSignerEntry[]): FinalProofSignerEntry[] {
  return [...signers].sort((a, b) => {
    const ai = a.slot_index ?? 0;
    const bi = b.slot_index ?? 0;
    if (ai !== bi) return ai - bi;
    if (a.signer_id < b.signer_id) return -1;
    if (a.signer_id > b.signer_id) return 1;
    return 0;
  });
}

/** Deterministic final proof hash for on-chain anchoring. */
export function computeFinalProofHash(payload: FinalProofPayload): string {
  const normalized: FinalProofPayload = {
    ...payload,
    signers: sortSigners(payload.signers),
  };
  const canonical = canonicalize(normalized);
  return sha256HexUtf8(canonical);
}

export function computeSignerListHash(signers: FinalProofSignerEntry[]): string {
  return sha256HexUtf8(canonicalize(sortSigners(signers)));
}
