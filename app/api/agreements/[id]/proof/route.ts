import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeFinalProofHash,
  computeSignerListHash,
  type FinalProofPayload,
  type FinalProofSignerEntry,
} from "@/lib/anchoring/final-proof";
import { decodeByteaField } from "@/lib/passkey/bytea";

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return jsonError(400, "Invalid id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "Not authenticated");

  const { data: agreement, error: aErr } = await supabase
    .from("agreements")
    .select("id, creator_id, status, signed_at, finalized_version_id, current_version_id")
    .eq("id", id)
    .maybeSingle();
  if (aErr || !agreement) return jsonError(404, "Agreement not found");
  if (agreement.status !== "signed") return jsonError(400, "Not finalized");

  // Access: creator or a signer
  let isSigner = false;
  if (agreement.creator_id !== user.id) {
    const { data: sig } = await supabase
      .from("signatures")
      .select("id")
      .eq("agreement_id", id)
      .eq("signer_id", user.id)
      .maybeSingle();
    isSigner = !!sig;
    if (!isSigner) return jsonError(403, "Forbidden");
  }

  const versionId =
    (agreement.finalized_version_id as string | null) ??
    (agreement.current_version_id as string | null);
  if (!versionId) return jsonError(500, "Missing finalized version");

  const { data: ver, error: vErr } = await supabase
    .from("agreement_versions")
    .select("id, version_number, content_hash")
    .eq("id", versionId)
    .maybeSingle();
  if (vErr || !ver) return jsonError(500, "Missing version");

  const { data: sigRows, error: sErr } = await supabase
    .from("signatures")
    .select(
      "signer_id, slot_index, signing_timestamp, signing_payload, signing_payload_hash, signature_bytes, signature_hash, signer_key_fingerprint, signer_key_version, webauthn_credential_id, passkey_verified"
    )
    .eq("agreement_version_id", versionId)
    .order("signed_at", { ascending: true });

  if (sErr) return jsonError(500, sErr.message);

  const signers: FinalProofSignerEntry[] = (sigRows ?? []).map((s: any) => ({
    signer_id: s.signer_id,
    slot_index: typeof s.slot_index === "number" ? s.slot_index : null,
    signing_timestamp: s.signing_timestamp ?? null,
    signing_payload_hash: s.signing_payload_hash ?? null,
    signature_hash: s.signature_hash ?? null,
    key_fingerprint: s.signer_key_fingerprint ?? null,
    key_version: typeof s.signer_key_version === "number" ? s.signer_key_version : null,
    passkey_credential_id: s.webauthn_credential_id ?? null,
  }));

  const signedAt = (agreement.signed_at as string | null) ?? new Date().toISOString();

  const payload: FinalProofPayload = {
    agreement_id: agreement.id,
    version_id: ver.id,
    version_number: Number(ver.version_number ?? 1),
    content_hash: ver.content_hash,
    signers,
    signed_at: signedAt,
  };

  const finalProofHash = computeFinalProofHash(payload);
  const signerListHash = computeSignerListHash(signers);

  // Public keys for each signer (service-role best-effort)
  let signerPublicKeys: Record<string, { public_key_pem: string; key_version: number }> = {};
  try {
    const admin = createAdminClient();
    const signerIds = Array.from(new Set((sigRows ?? []).map((s: any) => s.signer_id)));
    if (signerIds.length > 0) {
      const { data: keys } = await admin
        .from("user_keypairs")
        .select("user_id, public_key_pem, key_version")
        .in("user_id", signerIds);
      signerPublicKeys =
        keys?.reduce((acc: any, k: any) => {
          acc[k.user_id] = {
            public_key_pem: k.public_key_pem,
            key_version: Number(k.key_version ?? 1),
          };
          return acc;
        }, {}) ?? {};
    }
  } catch {
    signerPublicKeys = {};
  }

  // Anchor receipt if exists
  let anchor: any = null;
  try {
    const admin = createAdminClient();
    const { data: arow } = await admin
      .from("agreement_version_anchors")
      .select(
        "chain_name, final_proof_hash, transaction_hash, block_number, anchored_at, anchor_status"
      )
      .eq("agreement_version_id", versionId)
      .maybeSingle();
    if (arow) anchor = arow;
  } catch {
    anchor = null;
  }

  const exportJson = {
    schema: "weagree.final_proof.v1",
    agreement_id: agreement.id,
    agreement_version_id: versionId,
    final_proof_hash: finalProofHash,
    signer_list_hash: signerListHash,
    payload,
    signatures: (sigRows ?? []).map((s: any) => ({
      signer_id: s.signer_id,
      slot_index: typeof s.slot_index === "number" ? s.slot_index : null,
      passkey_verified: !!s.passkey_verified,
      passkey_credential_id: s.webauthn_credential_id ?? null,
      signing_payload: s.signing_payload ?? null,
      signing_payload_hash: s.signing_payload_hash ?? null,
      signature_hash: s.signature_hash ?? null,
      signature_bytes_base64: s.signature_bytes
        ? decodeByteaField(s.signature_bytes).toString("base64")
        : null,
      signer_key_fingerprint: s.signer_key_fingerprint ?? null,
      signer_key_version: typeof s.signer_key_version === "number" ? s.signer_key_version : null,
      signer_public_key_pem: signerPublicKeys[s.signer_id]?.public_key_pem ?? null,
    })),
    anchor,
  };

  return NextResponse.json(exportJson, {
    headers: {
      "Content-Disposition": `attachment; filename=\"weagree-proof-${agreement.id}.json\"`,
    },
  });
}
