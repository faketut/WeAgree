-- Signature slots and agreement encryption
-- - Adds slot_index to signatures so each {{signature}} placeholder can be occupied once
-- - Adds encrypted_content fields to agreements for KMS-backed encryption at finalization

-- -----------------------------------------------------------------------------
-- 1. SIGNATURE SLOTS
-- -----------------------------------------------------------------------------

alter table public.signatures
  add column if not exists slot_index integer
  check (slot_index >= 0);

-- Ensure that each placeholder (slot_index) on an agreement can only be signed once.
-- Use a partial unique index so existing rows with NULL slot_index are not constrained.
create unique index if not exists signatures_agreement_slot_unique
  on public.signatures (agreement_id, slot_index)
  where slot_index is not null;

comment on column public.signatures.slot_index is
  'Zero-based index of the {{signature}} placeholder this signature occupies.';

-- -----------------------------------------------------------------------------
-- 2. AGREEMENT ENCRYPTION METADATA
-- -----------------------------------------------------------------------------

alter table public.agreements
  add column if not exists encrypted_content text,
  add column if not exists encryption_kms_key_id text,
  add column if not exists is_encrypted boolean not null default false;

comment on column public.agreements.encrypted_content is
  'KMS-encrypted payload of the agreement content (envelope-encrypted JSON blob).';

comment on column public.agreements.encryption_kms_key_id is
  'Identifier of the KMS key used to encrypt encrypted_content.';

comment on column public.agreements.is_encrypted is
  'True when encrypted_content is populated and should be used instead of plaintext for storage at rest.';

