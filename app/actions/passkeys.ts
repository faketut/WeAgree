"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { getWebAuthnExpectedOrigin, getWebAuthnRpId } from "@/lib/passkey/rp";
import { decodeByteaField } from "@/lib/passkey/bytea";
import { getDisplayName } from "@/lib/account/displayName";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function beginPasskeyRegistration() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const options = await generateRegistrationOptions({
    rpName: "WeAgree",
    rpID: getWebAuthnRpId(),
    userID: user.id,
    userName: user.email ?? profile?.email ?? user.id,
    userDisplayName: getDisplayName(user, profile),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const { data: ch, error } = await supabase
    .from("webauthn_challenges")
    .insert({
      user_id: user.id,
      challenge: options.challenge,
      kind: "registration",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !ch) return { error: error?.message ?? "Failed to store challenge" };

  return { options, challengeId: ch.id as string };
}

export async function completePasskeyRegistration(
  challengeId: string,
  registrationJSON: RegistrationResponseJSON
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: row, error: chErr } = await supabase
    .from("webauthn_challenges")
    .select("challenge, expires_at, kind")
    .eq("id", challengeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (chErr || !row || row.kind !== "registration") {
    return { error: "Invalid or expired challenge" };
  }
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return { error: "Challenge expired" };
  }

  const expectedChallenge = row.challenge as string;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: registrationJSON,
      expectedChallenge,
      expectedOrigin: getWebAuthnExpectedOrigin(),
      expectedRPID: getWebAuthnRpId(),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verification failed" };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: "Passkey verification failed" };
  }

  const info = verification.registrationInfo;
  // SimpleWebAuthn v9 registrationInfo shape:
  // - credentialID: Uint8Array
  // - credentialPublicKey: Uint8Array
  // - counter: number
  // - fmt: string
  // - transports?: string[]
  const credentialId = Buffer.from(info.credentialID).toString("base64url");
  const publicKey = Buffer.from(info.credentialPublicKey);

  const { error: insErr } = await supabase.from("user_signing_credentials").insert({
    user_id: user.id,
    credential_id: credentialId,
    public_key_cose: publicKey,
    counter: info.counter,
    transports: (info as { transports?: string[] }).transports ?? [],
    attestation_format: info.fmt ?? null,
    nickname: "Passkey",
    status: "active",
  });

  if (insErr) return { error: insErr.message };

  await supabase.from("webauthn_challenges").delete().eq("id", challengeId);

  return { success: true as const };
}

export async function beginPasskeySignForAgreement(agreementId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: creds, error: cErr } = await supabase
    .from("user_signing_credentials")
    .select("credential_id, transports")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (cErr || !creds?.length) {
    return { error: "No passkey registered for this account." };
  }

  const { data: agreement, error: aErr } = await supabase
    .from("agreements")
    .select("id, current_version_id, status")
    .eq("id", agreementId)
    .in("status", ["pending", "signed"])
    .maybeSingle();

  if (aErr || !agreement?.current_version_id) {
    return { error: "Agreement not found" };
  }

  const { data: ver, error: vErr } = await supabase
    .from("agreement_versions")
    .select("id, content_hash, status")
    .eq("id", agreement.current_version_id)
    .maybeSingle();

  if (vErr || !ver || ver.status !== "open_for_signing") {
    return { error: "This agreement is not open for signing." };
  }

  const allowCredentials = creds.map((c) => ({
    id: Buffer.from(c.credential_id as string, "base64url"),
    type: "public-key" as const,
  }));

  const options = await generateAuthenticationOptions({
    rpID: getWebAuthnRpId(),
    allowCredentials,
    userVerification: "preferred",
  });

  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const { data: ch, error } = await supabase
    .from("webauthn_challenges")
    .insert({
      user_id: user.id,
      challenge: options.challenge,
      kind: "authentication",
      expires_at: expiresAt,
      metadata: {
        agreement_id: agreementId,
        agreement_version_id: ver.id,
        content_hash: ver.content_hash,
      },
    })
    .select("id")
    .single();

  if (error || !ch) return { error: error?.message ?? "Failed to store challenge" };

  return { options, challengeId: ch.id as string };
}

export async function verifyPasskeyAssertionForUser(
  challengeId: string,
  assertion: AuthenticationResponseJSON
): Promise<{ ok: true; credentialId: string; newCounter: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: row, error: chErr } = await supabase
    .from("webauthn_challenges")
    .select("challenge, expires_at, kind, metadata")
    .eq("id", challengeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (chErr || !row || row.kind !== "authentication") {
    return { error: "Invalid or expired challenge" };
  }
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return { error: "Challenge expired" };
  }

  const meta = row.metadata as {
    agreement_version_id?: string;
    content_hash?: string;
  } | null;
  if (meta?.agreement_version_id && meta.content_hash) {
    const { data: live } = await supabase
      .from("agreement_versions")
      .select("id, content_hash, status")
      .eq("id", meta.agreement_version_id)
      .maybeSingle();
    if (
      !live ||
      live.status !== "open_for_signing" ||
      live.content_hash !== meta.content_hash
    ) {
      return {
        error:
          "The agreement was updated since you started signing. Refresh and try again.",
      };
    }
  }

  const expectedChallenge = row.challenge as string;

  const credentialIdB64 = assertion.id;
  const { data: cred, error: credErr } = await supabase
    .from("user_signing_credentials")
    .select("id, credential_id, public_key_cose, counter")
    .eq("user_id", user.id)
    .eq("credential_id", credentialIdB64)
    .eq("status", "active")
    .maybeSingle();

  if (credErr || !cred) return { error: "Unknown credential" };

  const publicKeyBuf = decodeByteaField(cred.public_key_cose);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: getWebAuthnExpectedOrigin(),
      expectedRPID: getWebAuthnRpId(),
      authenticator: {
        credentialID: new Uint8Array(
          Buffer.from(cred.credential_id as string, "base64url")
        ),
        credentialPublicKey: new Uint8Array(publicKeyBuf),
        counter: Number(cred.counter ?? 0),
      },
      requireUserVerification: false,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verification failed" };
  }

  if (!verification.verified) return { error: "Passkey verification failed" };

  const newCounter = verification.authenticationInfo.newCounter;
  await supabase
    .from("user_signing_credentials")
    .update({ counter: newCounter, last_used_at: new Date().toISOString() })
    .eq("id", cred.id);

  await supabase.from("webauthn_challenges").delete().eq("id", challengeId);

  return { ok: true, credentialId: cred.credential_id as string, newCounter };
}

export async function listPasskeys() {
  type CredentialRow = {
    id: string;
    nickname: string | null;
    created_at: string;
    last_used_at: string | null;
    status: string;
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, credentials: [] as CredentialRow[] };

  const { data, error } = await supabase
    .from("user_signing_credentials")
    .select("id, nickname, created_at, last_used_at, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, credentials: [] as CredentialRow[] };
  return { credentials: (data ?? []) as CredentialRow[] };
}
