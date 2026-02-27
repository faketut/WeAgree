-- KMS-backed signatures: add audit fields and key metadata

create table if not exists public.signing_keys (
  id uuid primary key default gen_random_uuid(),
  kms_key_id text not null unique,
  algorithm text not null default 'RSA-PSS-SHA256',
  status text not null default 'active' check (status in ('active', 'retired', 'revoked')),
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

alter table public.signatures
  add column if not exists kms_key_id text,
  add column if not exists signature_bytes bytea,
  add column if not exists signing_payload jsonb,
  add column if not exists signing_timestamp timestamptz,
  add column if not exists signing_nonce text;

create index if not exists idx_signatures_kms_key_id on public.signatures (kms_key_id);
create index if not exists idx_signatures_signing_timestamp on public.signatures (signing_timestamp desc);

