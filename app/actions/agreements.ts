"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}

export async function createAndPublishAgreement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "User";

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

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
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true, id: agreement.id };
}

export async function signAgreement(agreementId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "User";

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const signerName =
    (profile?.full_name as string) ||
    (user.user_metadata?.full_name as string) ||
    (user.email ?? "Signer");

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
  });

  if (insertError) return { error: insertError.message };

  revalidatePath("/dashboard");
  revalidatePath(`/sign/${agreementId}`);
  return { success: true };
}
