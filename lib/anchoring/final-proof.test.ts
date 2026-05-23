import {
    computeFinalProofHash,
    computeSignerListHash,
    sha256HexUtf8,
    type FinalProofPayload,
    type FinalProofSignerEntry,
} from "./final-proof";

const signer = (id: string, slot: number): FinalProofSignerEntry => ({
    signer_id: id,
    slot_index: slot,
    signing_timestamp: "2024-01-01T00:00:00Z",
    signing_payload_hash: "00".repeat(32),
    signature_hash: "11".repeat(32),
    key_fingerprint: "22".repeat(32),
    key_version: 1,
    passkey_credential_id: null,
});

const payload = (signers: FinalProofSignerEntry[]): FinalProofPayload => ({
    agreement_id: "agreement-1",
    version_id: "version-1",
    version_number: 1,
    content_hash: "ff".repeat(32),
    signers,
    signed_at: "2024-01-02T00:00:00Z",
});

describe("final-proof", () => {
    it("sha256HexUtf8 returns 64-char hex", () => {
        const h = sha256HexUtf8("hello");
        expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it("computeFinalProofHash is deterministic", () => {
        const p1 = payload([signer("a", 0), signer("b", 1)]);
        const p2 = payload([signer("a", 0), signer("b", 1)]);
        expect(computeFinalProofHash(p1)).toBe(computeFinalProofHash(p2));
    });

    it("computeFinalProofHash changes when content_hash changes", () => {
        const p = payload([signer("a", 0)]);
        const h1 = computeFinalProofHash(p);
        const h2 = computeFinalProofHash({ ...p, content_hash: "aa".repeat(32) });
        expect(h1).not.toBe(h2);
    });

    it("computeSignerListHash is independent of input order", () => {
        const a = signer("a", 0);
        const b = signer("b", 1);
        expect(computeSignerListHash([a, b])).toBe(computeSignerListHash([b, a]));
    });

    it("computeSignerListHash separates same-id different slot signers", () => {
        const a0 = signer("a", 0);
        const a1 = signer("a", 1);
        expect(computeSignerListHash([a0, a1])).not.toBe(computeSignerListHash([a0]));
    });
});
