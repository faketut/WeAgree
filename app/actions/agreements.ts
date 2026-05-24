"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { canonicalize } from "@/lib/signing/json-canonical";
import { kmsEncryptAgreementContent, kmsSign } from "@/lib/signing/kms-client";
import { decryptPrivateKeyPem, signWithEd25519Pem } from "@/lib/signing/user-keypair";
import { ensureProfile, ensureUserKeypair } from "@/lib/account/provision";
import { countSignatureSlots } from "@/lib/signaturePlaceholders";
import crypto from "node:crypto";
import {
  sendSignatureRequestEmail,
  sendAgreementFinalizedEmail,
} from "@/lib/email/email-utils";
import type { AgreementStatus } from "@/lib/types/database";
import { passkeySigningRequired } from "@/lib/passkey/rp";
import { verifyPasskeyAssertionForUser } from "@/app/actions/passkeys";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import {
  computeFinalProofHash,
  computeSignerListHash,
  type FinalProofPayload,
  type FinalProofSignerEntry,
} from "@/lib/anchoring/final-proof";
import { submitFinalProofHash } from "@/lib/anchoring/chain";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { getDisplayName } from "@/lib/account/displayName";
import { sha256Hex } from "@/lib/utils/sha256";
import { validateSignatureDisplay } from "@/lib/signing/signature-validation";
import { log, errCtx } from "@/lib/log";

function contentHashForFingerprint(publicKeyPem: string): Buffer {
  return Buffer.from(publicKeyPem, "utf8");
}

async function syncAgreementMirror(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agreementId: string,
  patch: {
    title: string;
    content: string;
    content_hash: string;
    required_signatures: number;
  }
) {
  await supabase
    .from("agreements")
    .update({
      title: patch.title,
      content: patch.content,
      content_hash: patch.content_hash,
      required_signatures: patch.required_signatures,
    })
    .eq("id", agreementId);
}

async function countSignaturesOnVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  versionId: string
): Promise<number> {
  const { count } = await supabase
    .from("signatures")
    .select("id", { count: "exact", head: true })
    .eq("agreement_version_id", versionId);
  return typeof count === "number" ? count : 0;
}

type CreateMode = "publish" | "draft";

async function createAgreementInternal(formData: FormData, mode: CreateMode) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await ensureProfile(supabase, user);

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!title) return { error: "Title is required" };
  if (!content) return { error: "Content is required" };

  const slotCount = countSignatureSlots(content);
  if (slotCount <= 0) {
    return {
      error:
        "Content must include at least one {{signature}} placeholder to indicate where signers should sign.",
    };
  }

  const contentHash = await sha256Hex(content);
  const agreementStatus: AgreementStatus = mode === "publish" ? "pending" : "draft";
  const versionStatus = mode === "publish" ? "open_for_signing" : "draft";

  const { data: root, error: rootErr } = await supabase
    .from("agreements")
    .insert({
      creator_id: user.id,
      title,
      content,
      content_hash: contentHash,
      status: agreementStatus,
      required_signatures: slotCount,
    })
    .select("id")
    .single();

  if (rootErr || !root) return { error: rootErr?.message ?? "Insert failed" };

  const { data: ver, error: verErr } = await supabase
    .from("agreement_versions")
    .insert({
      agreement_id: root.id,
      version_number: 1,
      title,
      content,
      content_hash: contentHash,
      status: versionStatus,
      required_signatures: slotCount,
      ...(mode === "publish" ? { published_at: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();

  if (verErr || !ver) {
    await supabase.from("agreements").delete().eq("id", root.id);
    return { error: verErr?.message ?? "Version insert failed" };
  }

  await supabase
    .from("agreements")
    .update({ current_version_id: ver.id })
    .eq("id", root.id);

  revalidatePath("/dashboard");
  return { success: true, id: root.id };
}

export async function createAgreement(formData: FormData) {
  return createAgreementInternal(formData, "publish");
}

export async function createDraftAgreement(formData: FormData) {
  return createAgreementInternal(formData, "draft");
}

export async function publishAgreement(agreementId: string, inviteEmail?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: row, error: fetchError } = await supabase
    .from("agreements")
    .select("id, status, current_version_id, title")
    .eq("id", agreementId)
    .eq("creator_id", user.id)
    .single();

  if (fetchError || !row?.current_version_id) return { error: "Agreement not found" };
  if (row.status !== "draft") return { error: "Only drafts can be published" };

  const { data: ver, error: vErr } = await supabase
    .from("agreement_versions")
    .select("id, content, title, content_hash")
    .eq("id", row.current_version_id)
    .single();

  if (vErr || !ver) return { error: "Version not found" };

  const slotCount = countSignatureSlots(ver.content as string);
  if (slotCount <= 0) {
    return {
      error:
        "Draft content must include at least one {{signature}} placeholder before publishing.",
    };
  }

  const { error: vUp } = await supabase
    .from("agreement_versions")
    .update({
      status: "open_for_signing",
      required_signatures: slotCount,
      published_at: new Date().toISOString(),
    })
    .eq("id", ver.id);

  if (vUp) return { error: vUp.message };

  const { error: updateError } = await supabase
    .from("agreements")
    .update({
      status: "pending",
      required_signatures: slotCount,
      title: ver.title,
      content: ver.content,
      content_hash: ver.content_hash,
    })
    .eq("id", agreementId)
    .eq("creator_id", user.id);

  if (updateError) return { error: updateError.message };

  const baseUrl = getBaseUrl();

  if (inviteEmail) {
    await sendSignatureRequestEmail({
      to: inviteEmail,
      agreementTitle: row.title as string,
      creatorName: getDisplayName(user),
      actionUrl: `${baseUrl}/sign/${agreementId}`,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${agreementId}`);
  return { success: true, id: agreementId };
}

export async function sendSignatureRequest(agreementId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: agreement, error } = await supabase
    .from("agreements")
    .select("title")
    .eq("id", agreementId)
    .eq("creator_id", user.id)
    .single();

  if (error || !agreement) return { error: "Agreement not found" };

  const baseUrl = getBaseUrl();

  const result = await sendSignatureRequestEmail({
    to: email,
    agreementTitle: agreement.title,
    creatorName: getDisplayName(user),
    actionUrl: `${baseUrl}/sign/${agreementId}`,
  });

  return result;
}

export async function updateDraftAgreement(
  agreementId: string,
  payload: { title?: string; content?: string; required_signatures?: number }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: row, error: fetchError } = await supabase
    .from("agreements")
    .select("id, status, current_version_id")
    .eq("id", agreementId)
    .eq("creator_id", user.id)
    .single();

  if (fetchError || !row?.current_version_id) return { error: "Agreement not found" };

  if (row.status === "draft") {
    const { data: ver, error: vErr } = await supabase
      .from("agreement_versions")
      .select("id, content, title, status")
      .eq("id", row.current_version_id)
      .single();
    if (vErr || !ver || ver.status !== "draft") {
      return { error: "Only draft versions can be updated here." };
    }

    const nextTitle =
      payload.title !== undefined ? payload.title.trim() : (ver.title as string);
    const nextContent =
      payload.content !== undefined
        ? payload.content.trim()
        : (ver.content as string);

    const slotCount = countSignatureSlots(nextContent);
    if (slotCount <= 0) {
      return {
        error:
          "Content must include at least one {{signature}} placeholder to indicate where signers should sign.",
      };
    }

    const contentHash = await sha256Hex(nextContent);

    const { error: vUp } = await supabase
      .from("agreement_versions")
      .update({
        title: nextTitle,
        content: nextContent,
        content_hash: contentHash,
        required_signatures: slotCount,
      })
      .eq("id", ver.id);

    if (vUp) return { error: vUp.message };

    await syncAgreementMirror(supabase, agreementId, {
      title: nextTitle,
      content: nextContent,
      content_hash: contentHash,
      required_signatures: slotCount,
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${agreementId}`);
    revalidatePath(`/dashboard/${agreementId}/edit`);
    return { success: true };
  }

  if (row.status === "pending") {
    return updatePendingAgreementContent(supabase, user.id, agreementId, row.current_version_id, payload);
  }

  return { error: "Only draft or pending agreements can be updated." };
}

async function updatePendingAgreementContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorId: string,
  agreementId: string,
  currentVersionId: string,
  payload: { title?: string; content?: string; required_signatures?: number }
) {
  const { data: ver, error: vErr } = await supabase
    .from("agreement_versions")
    .select("id, agreement_id, version_number, content, title, status")
    .eq("id", currentVersionId)
    .single();

  if (vErr || !ver || ver.status !== "open_for_signing") {
    return { error: "This version is not open for editing." };
  }

  const sigCount = await countSignaturesOnVersion(supabase, ver.id as string);

  const nextTitle =
    payload.title !== undefined ? payload.title.trim() : (ver.title as string);
  const nextContent =
    payload.content !== undefined
      ? payload.content.trim()
      : (ver.content as string);

  const slotCount = countSignatureSlots(nextContent);
  if (slotCount <= 0) {
    return {
      error:
        "Content must include at least one {{signature}} placeholder to indicate where signers should sign.",
    };
  }

  const contentHash = await sha256Hex(nextContent);

  if (sigCount === 0) {
    const { error: vUp } = await supabase
      .from("agreement_versions")
      .update({
        title: nextTitle,
        content: nextContent,
        content_hash: contentHash,
        required_signatures: slotCount,
      })
      .eq("id", ver.id);

    if (vUp) return { error: vUp.message };

    await syncAgreementMirror(supabase, agreementId, {
      title: nextTitle,
      content: nextContent,
      content_hash: contentHash,
      required_signatures: slotCount,
    });
  } else {
    const nextNum = (ver.version_number as number) + 1;
    const { error: oldErr } = await supabase
      .from("agreement_versions")
      .update({ status: "superseded" })
      .eq("id", ver.id);
    if (oldErr) return { error: oldErr.message };

    const { data: newVer, error: insErr } = await supabase
      .from("agreement_versions")
      .insert({
        agreement_id: agreementId,
        version_number: nextNum,
        title: nextTitle,
        content: nextContent,
        content_hash: contentHash,
        status: "open_for_signing",
        required_signatures: slotCount,
        published_at: new Date().toISOString(),
        supersedes_version_id: ver.id,
      })
      .select("id")
      .single();

    if (insErr || !newVer) return { error: insErr?.message ?? "Failed to create new version" };

    await supabase
      .from("agreements")
      .update({
        current_version_id: newVer.id,
        required_signatures: slotCount,
        title: nextTitle,
        content: nextContent,
        content_hash: contentHash,
      })
      .eq("id", agreementId)
      .eq("creator_id", creatorId);

    await syncAgreementMirror(supabase, agreementId, {
      title: nextTitle,
      content: nextContent,
      content_hash: contentHash,
      required_signatures: slotCount,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${agreementId}`);
  revalidatePath(`/dashboard/${agreementId}/edit`);
  return { success: true };
}

export async function deleteAgreement(agreementId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: row, error: fetchError } = await supabase
    .from("agreements")
    .select("id, status")
    .eq("id", agreementId)
    .eq("creator_id", user.id)
    .single();

  if (fetchError || !row) return { error: "Agreement not found" };
  if (row.status !== "pending" && row.status !== "draft")
    return { error: "Only draft or pending agreements can be deleted" };

  const { error: deleteError } = await supabase
    .from("agreements")
    .delete()
    .eq("id", agreementId)
    .eq("creator_id", user.id);

  if (deleteError) return { error: deleteError.message };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${agreementId}`);
  return { success: true };
}

export type PasskeySignInput = {
  challengeId: string;
  assertion: AuthenticationResponseJSON;
} | null;

export async function signAgreement(
  agreementId: string,
  annotation?: string | null,
  signatureDisplay?: string | null,
  signatureStyle?: string | null,
  slotIndex?: number | null,
  passkey: PasskeySignInput = null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (signatureDisplay) {
    const v = validateSignatureDisplay(signatureDisplay);
    if (!v.ok) return { error: v.error };
  }

  await ensureProfile(supabase, user);
  // Ensure every account has a signing keypair (custodial; encrypted at rest).
  const kp = await ensureUserKeypair(supabase, user.id);
  if (!kp.ok) return { error: kp.error };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const signerName = getDisplayName(user, profile);

  const { data: agreementRow } = await supabase
    .from("agreements")
    .select("id, status, current_version_id, creator_id")
    .eq("id", agreementId)
    .in("status", ["pending", "signed"])
    .maybeSingle();

  if (!agreementRow?.current_version_id) {
    return { error: "Agreement not found or not available for signing." };
  }

  const { data: versionRow } = await supabase
    .from("agreement_versions")
    .select(
      "id, agreement_id, version_number, content_hash, required_signatures, status"
    )
    .eq("id", agreementRow.current_version_id)
    .maybeSingle();

  if (!versionRow || versionRow.status !== "open_for_signing") {
    return { error: "This agreement version is not open for signing." };
  }

  const requiredSignatures = Number(versionRow.required_signatures) || 1;
  let webauthnCredentialId: string | null = null;
  let passkeyVerified = false;

  const normalizedSlotIndex =
    typeof slotIndex === "number" && Number.isInteger(slotIndex)
      ? slotIndex
      : null;

  const sigCountBefore = await countSignaturesOnVersion(
    supabase,
    versionRow.id as string
  );
  const isCreatorFirstSlot =
    normalizedSlotIndex === 0 &&
    user.id === (agreementRow as { creator_id: string }).creator_id &&
    sigCountBefore === 0;

  if (passkeySigningRequired() && !isCreatorFirstSlot) {
    if (!passkey?.challengeId || !passkey.assertion) {
      return { error: "Passkey confirmation is required to sign." };
    }
    const v = await verifyPasskeyAssertionForUser(passkey.challengeId, passkey.assertion);
    if ("error" in v) return { error: v.error };
    webauthnCredentialId = v.credentialId;
    passkeyVerified = true;
  }

  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const signingPayload = {
    agreement_id: agreementId,
    agreement_version_id: versionRow.id as string,
    version_number: versionRow.version_number as number,
    contract_hash: versionRow.content_hash as string,
    signer_id: user.id,
    timestamp,
    nonce,
  };

  const now = Date.now();
  const ts = Date.parse(signingPayload.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
    return { error: "Signature timestamp is outside allowed window." };
  }

  const canonicalJson = canonicalize(signingPayload);
  const dataBytes = Buffer.from(canonicalJson, "utf8");
  const signingPayloadHash = sha256Hex(dataBytes);
  const signerKeyFingerprint = sha256Hex(
    contentHashForFingerprint(kp.publicKeyPem)
  );

  let signatureBytes: Buffer | null = null;
  let kmsKeyId: string | null = null;

  if (passkeyVerified) {
    // Passkey is strong authentication only; signing is still done by user keypair.
    kmsKeyId = "user-ed25519+passkey";
  } else {
    try {
      const privPem = decryptPrivateKeyPem(kp.encryptedPrivateKey);
      signatureBytes = signWithEd25519Pem(privPem, dataBytes);
      kmsKeyId = "user-ed25519";
    } catch (e) {
      // Fallback to global KMS signer if user-key signing is unavailable.
      log.warn("user-key signing failed; falling back to KMS signer", errCtx(e));
      const { signature, keyId } = await kmsSign(dataBytes);
      signatureBytes = signature;
      kmsKeyId = keyId;
    }
  }
  if (!signatureBytes) return { error: "Signature generation failed." };
  const signatureHash = sha256Hex(signatureBytes);

  const { data: existingSig } = await supabase
    .from("signatures")
    .select("id")
    .eq("agreement_version_id", versionRow.id as string)
    .eq("signer_id", user.id)
    .maybeSingle();

  if (existingSig) return { error: "You have already signed." };

  if (
    normalizedSlotIndex == null ||
    normalizedSlotIndex < 0 ||
    normalizedSlotIndex >= requiredSignatures
  ) {
    return { error: "Please choose a valid signature spot." };
  }

  const { data: existingSlot } = await supabase
    .from("signatures")
    .select("id")
    .eq("agreement_version_id", versionRow.id as string)
    .eq("slot_index", normalizedSlotIndex)
    .maybeSingle();

  if (existingSlot) {
    return {
      error:
        "That signature spot has already been used. Please choose another one.",
    };
  }

  const { error: insertError } = await supabase.from("signatures").insert({
    agreement_id: agreementId,
    agreement_version_id: versionRow.id as string,
    signer_id: user.id,
    signer_name: signerName,
    kms_key_id: kmsKeyId,
    signature_bytes: signatureBytes,
    signing_payload_hash: signingPayloadHash,
    signature_hash: signatureHash,
    signer_key_fingerprint: signerKeyFingerprint,
    signer_key_version: kp.keyVersion,
    signing_payload: signingPayload,
    signing_timestamp: timestamp,
    signing_nonce: nonce,
    signature_display: signatureDisplay?.trim() || null,
    signature_style: signatureStyle || null,
    slot_index: normalizedSlotIndex,
    webauthn_credential_id: webauthnCredentialId,
    passkey_verified: passkeyVerified,
    passkey_assertion: passkeyVerified
      ? (passkey!.assertion as unknown as Record<string, unknown>)
      : null,
    ...(annotation != null &&
      annotation.trim() !== "" && { annotation: annotation.trim() }),
  });

  if (insertError) return { error: insertError.message };

  try {
    const { data: agreementAfter } = await supabase
      .from("agreements")
      .select(
        "id, title, creator_id, status, current_version_id, required_signatures, is_encrypted, encrypted_content, encryption_kms_key_id"
      )
      .eq("id", agreementId)
      .maybeSingle();

    if (!agreementAfter || agreementAfter.status !== "signed") {
      revalidatePath("/dashboard");
      revalidatePath(`/sign/${agreementId}`);
      return { success: true };
    }

    const versionId = agreementAfter.current_version_id as string;
    const { data: verAfter } = await supabase
      .from("agreement_versions")
      .select(
        "id, content, content_hash, required_signatures, is_encrypted, version_number"
      )
      .eq("id", versionId)
      .maybeSingle();

    if (
      verAfter &&
      !(verAfter as { is_encrypted?: boolean }).is_encrypted &&
      typeof agreementAfter.required_signatures === "number"
    ) {
      const plaintext = Buffer.from(
        (verAfter as { content: string }).content,
        "utf8"
      );
      const { blob, keyId } = await kmsEncryptAgreementContent(plaintext);

      await supabase
        .from("agreement_versions")
        .update({
          encrypted_content: blob,
          encryption_kms_key_id: keyId,
          is_encrypted: true,
        })
        .eq("id", versionId);

      await supabase
        .from("agreements")
        .update({
          encrypted_content: blob,
          encryption_kms_key_id: keyId,
          is_encrypted: true,
        })
        .eq("id", agreementId);

      const { data: sigRows } = await supabase
        .from("signatures")
        .select(
          "signer_id, slot_index, signing_timestamp, signing_payload_hash, signature_hash, signer_key_fingerprint, signer_key_version, webauthn_credential_id"
        )
        .eq("agreement_version_id", versionId)
        .order("signed_at", { ascending: true });

      const signers: FinalProofSignerEntry[] = (sigRows ?? []).map((s) => ({
        signer_id: s.signer_id as string,
        slot_index: typeof s.slot_index === "number" ? s.slot_index : null,
        signing_timestamp: (s.signing_timestamp as string) ?? null,
        signing_payload_hash: (s.signing_payload_hash as string) ?? null,
        signature_hash: (s.signature_hash as string) ?? null,
        key_fingerprint: (s.signer_key_fingerprint as string) ?? null,
        key_version:
          typeof s.signer_key_version === "number"
            ? (s.signer_key_version as number)
            : null,
        passkey_credential_id: (s.webauthn_credential_id as string) ?? null,
      }));

      const signedAt =
        (await supabase
          .from("agreements")
          .select("signed_at")
          .eq("id", agreementId)
          .single()
          .then((r) => r.data?.signed_at as string)) ?? new Date().toISOString();

      const proofPayload: FinalProofPayload = {
        agreement_id: agreementId,
        version_id: versionId,
        version_number: (verAfter as { version_number: number }).version_number,
        content_hash: (verAfter as { content_hash: string }).content_hash,
        signers,
        signed_at: signedAt,
      };

      const finalProofHash = computeFinalProofHash(proofPayload);
      const signerListHash = computeSignerListHash(signers);

      let chain: { chainName: string; transactionHash: string; blockNumber: number | null; anchoredAt: string } | null =
        null;
      let anchorError: string | null = null;
      try {
        chain = await submitFinalProofHash(finalProofHash);
      } catch (e) {
        anchorError = e instanceof Error ? e.message : "Anchor failed";
      }

      try {
        const admin = createAdminClient();
        const baseRow = {
          agreement_id: agreementId,
          agreement_version_id: versionId,
          chain_name:
            chain?.chainName ?? process.env.BLOCKCHAIN_CHAIN_NAME ?? "unknown",
          final_proof_hash: finalProofHash,
          content_hash: proofPayload.content_hash,
          signer_list_hash: signerListHash,
          transaction_hash: chain?.transactionHash ?? null,
          block_number: chain?.blockNumber ?? null,
          anchor_status: chain ? "confirmed" : "failed",
          anchored_at: chain?.anchoredAt ?? null,
          submission_payload: proofPayload as unknown as Record<string, unknown>,
          receipt_payload: chain
            ? (chain as unknown as Record<string, unknown>)
            : ({ error: anchorError } as unknown as Record<string, unknown>),
          updated_at: new Date().toISOString(),
        };
        const { error: insA } = await admin
          .from("agreement_version_anchors")
          .insert(baseRow);
        if (insA?.code === "23505") {
          await admin
            .from("agreement_version_anchors")
            .update({
              chain_name: baseRow.chain_name,
              final_proof_hash: baseRow.final_proof_hash,
              content_hash: baseRow.content_hash,
              signer_list_hash: baseRow.signer_list_hash,
              transaction_hash: baseRow.transaction_hash,
              block_number: baseRow.block_number,
              anchor_status: baseRow.anchor_status,
              anchored_at: baseRow.anchored_at,
              submission_payload: baseRow.submission_payload,
              receipt_payload: baseRow.receipt_payload,
              updated_at: baseRow.updated_at,
            })
            .eq("agreement_version_id", versionId);
        }
      } catch (e) {
        // Best-effort anchor persistence (requires service role)
        log.warn("anchor persistence failed", errCtx(e));
      }

      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", agreementAfter.creator_id)
        .single();

      if (creatorProfile?.email) {
        const baseUrl = getBaseUrl();
        await sendAgreementFinalizedEmail({
          to: creatorProfile.email,
          agreementTitle: agreementAfter.title as string,
          actionUrl: `${baseUrl}/dashboard/${agreementId}`,
        });
      }
    }
  } catch (e) {
    // Best-effort finalize side effects
    log.warn("finalize side effects failed", errCtx(e));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/sign/${agreementId}`);
  return { success: true };
}
