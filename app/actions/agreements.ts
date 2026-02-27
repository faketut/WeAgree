"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canonicalize } from "@/lib/signing/json-canonical";
import {
  kmsSign,
  kmsEncryptAgreementContent,
} from "@/lib/signing/kms-client";
import { countSignatureSlots } from "@/lib/signaturePlaceholders";
import crypto from "node:crypto";
import {
  sendSignatureRequestEmail,
  sendAgreementFinalizedEmail,
} from "@/lib/email/email-utils";
import type { Agreement, Signature, AgreementStatus, Profile } from "@/lib/types/database";

function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}

function ensureProfile(supabase: Awaited<ReturnType<typeof createClient>>, user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "User";
  return supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

export async function createAgreement(formData: FormData) {
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

  const { data: agreement, error } = await supabase
    .from("agreements")
    .insert({
      creator_id: user.id,
      title,
      content,
      content_hash: contentHash,
      status: "pending",
      required_signatures: slotCount,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Auto-sign as the creator in the first available slot (index 0).
  const autoSignResult = await signAgreement(
    agreement.id,
    null,
    null,
    null,
    0
  );
  if (
    autoSignResult?.error &&
    !autoSignResult.error.toLowerCase().includes("already signed") &&
    !autoSignResult.error.toLowerCase().includes("signature spot has already been used")
  ) {
    return { error: autoSignResult.error };
  }

  revalidatePath("/dashboard");
  return { success: true, id: agreement.id };
}

export async function createDraftAgreement(formData: FormData) {
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

  const contentHash = await sha256Hex(content);

  const { data: agreement, error } = await supabase
    .from("agreements")
    .insert({
      creator_id: user.id,
      title,
      content,
      content_hash: contentHash,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true, id: agreement.id };
}

export async function publishAgreement(agreementId: string, inviteEmail?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: row, error: fetchError } = await supabase
    .from("agreements")
    .select("id, status, content, required_signatures, title")
    .eq("id", agreementId)
    .eq("creator_id", user.id)
    .single();

  if (fetchError || !row) return { error: "Agreement not found" };
  if (row.status !== "draft") return { error: "Only drafts can be published" };

  const slotCount = countSignatureSlots(row.content as string);
  if (slotCount <= 0) {
    return {
      error:
        "Draft content must include at least one {{signature}} placeholder before publishing.",
    };
  }

  const { error: updateError } = await supabase
    .from("agreements")
    .update({
      status: "pending",
      required_signatures: slotCount,
    })
    .eq("id", agreementId)
    .eq("creator_id", user.id);

  if (updateError) return { error: updateError.message };

  const autoSignResult = await signAgreement(agreementId, null, null, null, 0);
  if (autoSignResult.error) return { error: autoSignResult.error };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (inviteEmail) {
    const creatorName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split("@")[0] ||
      "User";

    await sendSignatureRequestEmail({
      to: inviteEmail,
      agreementTitle: row.title,
      creatorName,
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

  const creatorName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "User";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const result = await sendSignatureRequestEmail({
    to: email,
    agreementTitle: agreement.title,
    creatorName,
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
    .select("id, status, content")
    .eq("id", agreementId)
    .eq("creator_id", user.id)
    .single();

  if (fetchError || !row) return { error: "Agreement not found" };
  if (row.status !== "draft") return { error: "Only drafts can be updated" };

  const updates: {
    title?: string;
    content?: string;
    content_hash?: string;
    required_signatures?: number;
  } = {};
  if (payload.title !== undefined) updates.title = payload.title.trim();

  const nextContent =
    payload.content !== undefined ? payload.content.trim() : (row.content as string);

  const slotCount = countSignatureSlots(nextContent);
  if (slotCount <= 0) {
    return {
      error:
        "Content must include at least one {{signature}} placeholder to indicate where signers should sign.",
    };
  }

  if (payload.content !== undefined) {
    updates.content = nextContent;
    updates.content_hash = await sha256Hex(nextContent);
  }
  updates.required_signatures = slotCount;
  if (Object.keys(updates).length === 0) return { success: true };

  const { error: updateError } = await supabase
    .from("agreements")
    .update(updates)
    .eq("id", agreementId)
    .eq("creator_id", user.id);

  if (updateError) return { error: updateError.message };

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
  if (row.status !== "pending" && row.status !== "draft") return { error: "Only draft or pending agreements can be deleted" };

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

export async function signAgreement(
  agreementId: string,
  annotation?: string | null,
  signatureDisplay?: string | null,
  signatureStyle?: string | null,
  slotIndex?: number | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await ensureProfile(supabase, user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const signerName =
    (profile?.full_name as string) ||
    (user.user_metadata?.full_name as string) ||
    (user.email ?? "Signer");

  // Only pending or signed agreements can be signed (idempotent view: signers never see draft/voided)
  const { data: agreementRow } = await supabase
    .from("agreements")
    .select("id, status, content_hash, required_signatures")
    .eq("id", agreementId)
    .in("status", ["pending", "signed"])
    .maybeSingle();
  if (!agreementRow)
    return { error: "Agreement not found or not available for signing." };

  const requiredSignatures = (agreementRow as Agreement).required_signatures || 1;

  // Build signing payload for KMS
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const signingPayload = {
    contract_hash: agreementRow.content_hash as string,
    signer_id: user.id,
    timestamp,
    nonce,
  };

  // Timestamp window check (5 minutes)
  const now = Date.now();
  const ts = Date.parse(signingPayload.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
    return { error: "Signature timestamp is outside allowed window." };
  }

  const canonicalJson = canonicalize(signingPayload);
  const dataBytes = Buffer.from(canonicalJson, "utf8");

  const { signature, keyId } = await kmsSign(dataBytes);

  const { data: existingSig } = await supabase
    .from("signatures")
    .select("id")
    .eq("agreement_id", agreementId)
    .eq("signer_id", user.id)
    .maybeSingle();

  if (existingSig) return { error: "You have already signed." };

  const normalizedSlotIndex =
    typeof slotIndex === "number" && Number.isInteger(slotIndex)
      ? slotIndex
      : null;
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
    .eq("agreement_id", agreementId)
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
    signer_id: user.id,
    signer_name: signerName,
    kms_key_id: keyId,
    signature_bytes: signature,
    signing_payload: signingPayload,
    signing_timestamp: timestamp,
    signing_nonce: nonce,
    signature_display: signatureDisplay?.trim() || null,
    signature_style: signatureStyle || null,
    slot_index: normalizedSlotIndex,
    ...(annotation != null && annotation.trim() !== "" && { annotation: annotation.trim() }),
  });

  if (insertError) return { error: insertError.message };

  // If this signature completes the agreement, encrypt the content at rest.
  try {
    const { data: agreementAfter } = await supabase
      .from("agreements")
      .select(
        "id, title, creator_id, content, required_signatures, is_encrypted, encrypted_content, encryption_kms_key_id"
      )
      .eq("id", agreementId)
      .maybeSingle();

    if (
      agreementAfter &&
      !(agreementAfter as Agreement).is_encrypted &&
      typeof (agreementAfter as Agreement).required_signatures === "number"
    ) {
      const required = (agreementAfter as Agreement).required_signatures;
      const { count } = await supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("agreement_id", agreementId);

      if (typeof count === "number" && count >= required) {
        const plaintext = Buffer.from(
          (agreementAfter as Agreement).content,
          "utf8"
        );
        const { blob, keyId } = await kmsEncryptAgreementContent(
          plaintext
        );
        await supabase
          .from("agreements")
          .update({
            encrypted_content: blob,
            encryption_kms_key_id: keyId,
            is_encrypted: true,
          })
          .eq("id", agreementId);

        // Send email to creator
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", agreementAfter.creator_id)
          .single();

        if (creatorProfile?.email) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          await sendAgreementFinalizedEmail({
            to: creatorProfile.email,
            agreementTitle: agreementAfter.title,
            actionUrl: `${baseUrl}/dashboard/${agreementId}`,
          });
        }
      }
    }
  } catch {
    // Best-effort encryption: signing should still succeed even if encryption fails.
  }

  // Revalidate sign page so every signer (on next load or refresh) sees the latest signed agreement
  revalidatePath("/dashboard");
  revalidatePath(`/sign/${agreementId}`);
  return { success: true };
}
