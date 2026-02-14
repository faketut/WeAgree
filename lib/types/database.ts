/**
 * Database types for Supabase (align with 001_initial_schema.sql).
 * Regenerate from Supabase CLI if you use supabase gen types.
 */

export type AgreementStatus = "draft" | "pending" | "signed" | "voided";

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
}

export interface Signature {
  id: string;
  agreement_id: string;
  signer_id: string;
  signer_name: string;
  signed_at: string;
  signature_image_url: string | null;
}
