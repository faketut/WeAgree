"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canonicalize } from "@/lib/signing/json-canonical";
import { kmsSign } from "@/lib/signing/kms-client";
import crypto from "node:crypto";

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
  const requiredSignaturesRaw = formData.get("required_signatures");
  const requiredSignatures =
    requiredSignaturesRaw != null
      ? Math.max(1, parseInt(String(requiredSignaturesRaw), 10) || 1)
      : 1;
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
      status: "pending",
      required_signatures: requiredSignatures,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true, id: agreement.id };
}

export async function publishAgreement(agreementId: string) {
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
  if (row.status !== "draft") return { error: "Only drafts can be published" };

  const { error: updateError } = await supabase
    .from("agreements")
    .update({ status: "pending" })
    .eq("id", agreementId)
    .eq("creator_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${agreementId}`);
  return { success: true };
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
    .select("id, status")
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
  if (payload.content !== undefined) updates.content = payload.content.trim();
  if (payload.required_signatures !== undefined)
    updates.required_signatures = Math.max(1, payload.required_signatures);

  if (updates.content !== undefined) {
    updates.content_hash = await sha256Hex(updates.content);
  }
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
  if (row.status !== "pending") return { error: "Only pending agreements can be deleted" };

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
  signatureStyle?: string | null
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
    .select("id, status, content_hash")
    .eq("id", agreementId)
    .in("status", ["pending", "signed"])
    .maybeSingle();
  if (!agreementRow) return { error: "Agreement not found or not available for signing." };

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
    ...(annotation != null && annotation.trim() !== "" && { annotation: annotation.trim() }),
  });

  if (insertError) return { error: insertError.message };

  // Revalidate sign page so every signer (on next load or refresh) sees the latest signed agreement
  revalidatePath("/dashboard");
  revalidatePath(`/sign/${agreementId}`);
  return { success: true };
}
