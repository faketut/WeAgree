/**
 * Database types for Supabase (align with migrations).
 * Regenerate from Supabase CLI if you use supabase gen types.
 */

export type AgreementStatus = "draft" | "pending" | "signed" | "voided";

export type AgreementVersionStatus =
  | "draft"
  | "open_for_signing"
  | "superseded"
  | "finalized";

export type AnchorStatus = "pending" | "submitted" | "confirmed" | "failed";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  wechat_openid: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface Agreement {
  id: string;
  creator_id: string;
  title: string;
  content: string;
  content_hash: string;
  status: AgreementStatus;
  created_at: string;
  signed_at: string | null;
  required_signatures: number;
  is_encrypted: boolean;
  encrypted_content: string | null;
  encryption_kms_key_id: string | null;
  current_version_id?: string | null;
  finalized_version_id?: string | null;
  finalized_at?: string | null;
}

export interface AgreementVersion {
  id: string;
  agreement_id: string;
  version_number: number;
  title: string;
  content: string;
  content_hash: string;
  status: AgreementVersionStatus;
  required_signatures: number;
  published_at: string | null;
  supersedes_version_id: string | null;
  created_at: string;
  finalized_at: string | null;
  encrypted_content: string | null;
  encryption_kms_key_id: string | null;
  is_encrypted: boolean;
}

export interface Signature {
  id: string;
  agreement_id: string;
  agreement_version_id: string;
  signer_id: string;
  signer_name: string;
  signed_at: string;
  signature_image_url: string | null;
  slot_index: number | null;
  annotation: string | null;
  signature_display: string | null;
  signature_style: string | null;
  kms_key_id: string | null;
  signature_bytes: string | null;
  signing_payload: unknown | null;
  signing_timestamp: string | null;
  signing_nonce: string | null;
  webauthn_credential_id: string | null;
  passkey_verified: boolean;
}

export interface SigningKey {
  id: string;
  kms_key_id: string;
  algorithm: string;
  status: "active" | "retired" | "revoked";
  created_at: string;
  rotated_at: string | null;
}

export interface UserSigningCredential {
  id: string;
  user_id: string;
  credential_id: string;
  counter: number;
  transports: string[];
  attestation_format: string | null;
  nickname: string | null;
  status: "active" | "revoked" | "replaced";
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface AgreementVersionAnchor {
  id: string;
  agreement_id: string;
  agreement_version_id: string;
  chain_name: string;
  final_proof_hash: string;
  content_hash: string;
  signer_list_hash: string | null;
  transaction_hash: string | null;
  block_number: number | null;
  anchor_status: AnchorStatus;
  anchored_at: string | null;
  submission_payload: unknown | null;
  receipt_payload: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface UserKeypair {
  user_id: string;
  algorithm: "ed25519";
  public_key_pem: string;
  encrypted_private_key: string;
  key_version: number;
  created_at: string;
}
