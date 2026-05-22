-- Add per-signature proof fields for stronger final_proof_hash binding.

alter table public.signatures
  add column if not exists signing_payload_hash text,
  add column if not exists signature_hash text,
  add column if not exists signer_key_fingerprint text,
  add column if not exists signer_key_version int,
  add column if not exists passkey_assertion jsonb;

create index if not exists idx_signatures_payload_hash
  on public.signatures (signing_payload_hash);

