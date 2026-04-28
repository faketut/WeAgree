import { canonicalize } from "@/lib/signing/json-canonical";
import crypto from "node:crypto";

export type FinalProofSignerEntry = {
  signer_id: string;
  slot_index: number | null;
  signing_timestamp: string | null;
  credential_id: string | null;
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

/** Deterministic final proof hash for on-chain anchoring. */
export function computeFinalProofHash(payload: FinalProofPayload): string {
  const canonical = canonicalize(payload);
  return sha256HexUtf8(canonical);
}

export function computeSignerListHash(signers: FinalProofSignerEntry[]): string {
  const ordered = [...signers].sort((a, b) => {
    const sa = a.signer_id;
    const sb = b.signer_id;
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return (a.slot_index ?? 0) - (b.slot_index ?? 0);
  });
  return sha256HexUtf8(canonicalize(ordered));
}
