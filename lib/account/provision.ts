import { createClient } from "@/lib/supabase/server";
import {
  encryptPrivateKeyPem,
  generateEd25519KeypairPem,
} from "@/lib/signing/user-keypair";
import { getDisplayName } from "@/lib/account/displayName";

export async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
) {
  const fullName = getDisplayName(user);
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

export async function ensureUserKeypair(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<
  | {
      ok: true;
      algorithm: "ed25519";
      publicKeyPem: string;
      encryptedPrivateKey: string;
      keyVersion: number;
    }
  | { ok: false; error: string }
> {
  const { data: existing, error } = await supabase
    .from("user_keypairs")
    .select("algorithm, public_key_pem, encrypted_private_key, key_version")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (existing?.public_key_pem && existing?.encrypted_private_key) {
    return {
      ok: true,
      algorithm: "ed25519",
      publicKeyPem: existing.public_key_pem as string,
      encryptedPrivateKey: existing.encrypted_private_key as string,
      keyVersion: Number(existing.key_version ?? 1),
    };
  }

  try {
    const kp = generateEd25519KeypairPem();
    const enc = encryptPrivateKeyPem(kp.privateKeyPem);
    const keyVersion = 1;
    const { error: insErr } = await supabase.from("user_keypairs").insert({
      user_id: userId,
      algorithm: "ed25519",
      public_key_pem: kp.publicKeyPem,
      encrypted_private_key: enc,
      key_version: keyVersion,
    });
    if (insErr) return { ok: false, error: insErr.message };
    return {
      ok: true,
      algorithm: "ed25519",
      publicKeyPem: kp.publicKeyPem,
      encryptedPrivateKey: enc,
      keyVersion,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Keypair init failed",
    };
  }
}

