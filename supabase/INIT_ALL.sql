-- =============================================================================
-- WeAgree – Supabase consolidated init schema (001..008)
-- Purpose:
--   - Fresh database bootstrap in ONE SQL script.
--   - Includes: profiles, templates, agreements, signatures, versioned agreements,
--     passkeys (WebAuthn), and blockchain anchor receipts.
--
-- Notes:
--   - This file is a consolidation of:
--     supabase/migrations/001_initial_schema.sql
--     supabase/migrations/002_signatures_annotation.sql
--     supabase/migrations/003_required_signatures.sql
--     supabase/migrations/005_kms_signatures.sql
--     supabase/migrations/006_signature_display.sql
--     supabase/migrations/007_signature_slots_and_encryption.sql
--     supabase/migrations/008_versioned_agreements_passkeys_anchors.sql
--   - The old APPLY_003_required_signatures.sql is redundant when running this file.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  wechat_openid text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'User'
    ),
    new.email
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. TEMPLATES
-- -----------------------------------------------------------------------------
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  content text not null default '',
  created_at timestamptz default now() not null
);

alter table public.templates enable row level security;

drop policy if exists "templates_select_own" on public.templates;
create policy "templates_select_own"
  on public.templates for select using (auth.uid() = user_id);
drop policy if exists "templates_insert_own" on public.templates;
create policy "templates_insert_own"
  on public.templates for insert with check (auth.uid() = user_id);
drop policy if exists "templates_update_own" on public.templates;
create policy "templates_update_own"
  on public.templates for update using (auth.uid() = user_id);
drop policy if exists "templates_delete_own" on public.templates;
create policy "templates_delete_own"
  on public.templates for delete using (auth.uid() = user_id);

create index if not exists idx_templates_user_id on public.templates (user_id);

-- -----------------------------------------------------------------------------
-- 3. AGREEMENTS (root record)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'agreement_status' and n.nspname = 'public'
  ) then
    create type public.agreement_status as enum ('draft', 'pending', 'signed', 'voided');
  end if;
end;
$$;

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  content text not null,
  content_hash text not null,
  status public.agreement_status not null default 'draft',
  created_at timestamptz default now() not null,
  signed_at timestamptz,
  required_signatures int not null default 1 check (required_signatures >= 1),
  encrypted_content text,
  encryption_kms_key_id text,
  is_encrypted boolean not null default false,
  current_version_id uuid,
  finalized_version_id uuid,
  finalized_at timestamptz
);

alter table public.agreements enable row level security;

drop policy if exists "agreements_all_creator" on public.agreements;
create policy "agreements_all_creator"
  on public.agreements for all using (auth.uid() = creator_id);

create index if not exists idx_agreements_creator_id on public.agreements (creator_id);
create index if not exists idx_agreements_status on public.agreements (status);
create index if not exists idx_agreements_created_at on public.agreements (created_at desc);

-- Agreement content immutability:
--   - In the consolidated (versioned) model, pending agreements may change content
--     via creating/editing versions; the root record is only immutable after signed.
create or replace function public.agreements_immutable_content()
returns trigger language plpgsql
as $$
begin
  if old.status = 'signed' and (
    new.content is distinct from old.content or new.content_hash is distinct from old.content_hash
  ) then
    raise exception 'Signed agreement content and content_hash are immutable.';
  end if;
  if old.status = 'signed' and new.status != 'signed' then
    raise exception 'Signed agreements cannot be modified or reverted.';
  end if;
  if old.status = 'pending' and new.status = 'draft' then
    raise exception 'Cannot revert pending agreement to draft.';
  end if;
  return new;
end;
$$;

drop trigger if exists agreements_immutable_content_trigger on public.agreements;
create trigger agreements_immutable_content_trigger
  before update on public.agreements
  for each row execute function public.agreements_immutable_content();

-- -----------------------------------------------------------------------------
-- 4. SIGNATURES (base table, later made version-bound)
-- -----------------------------------------------------------------------------
create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  signer_id uuid not null references public.profiles (id) on delete restrict,
  signer_name text not null,
  signed_at timestamptz default now() not null,
  signature_image_url text,
  annotation text,
  signature_display text,
  signature_style text,
  kms_key_id text,
  signature_bytes bytea,
  signing_payload jsonb,
  signing_timestamp timestamptz,
  signing_nonce text,
  slot_index integer check (slot_index >= 0),
  agreement_version_id uuid,
  webauthn_credential_id text,
  passkey_verified boolean not null default false
);

alter table public.signatures enable row level security;

drop policy if exists "agreements_select_creator_pending_signer" on public.agreements;
create policy "agreements_select_creator_pending_signer"
  on public.agreements for select
  using (
    auth.uid() = creator_id
    or status = 'pending'::public.agreement_status
    or exists (
      select 1 from public.signatures s
      where s.agreement_id = agreements.id and s.signer_id = auth.uid()
    )
  );

drop policy if exists "signatures_insert_own" on public.signatures;
create policy "signatures_insert_own"
  on public.signatures for insert with check (auth.uid() = signer_id);

-- Helper: avoid RLS recursion
create or replace function public.is_agreement_creator(p_agreement_id uuid)
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.agreements
    where id = p_agreement_id and creator_id = auth.uid()
  );
$$;

drop policy if exists "signatures_select_creator_or_signer" on public.signatures;
create policy "signatures_select_creator_or_signer"
  on public.signatures for select
  using (auth.uid() = signer_id or public.is_agreement_creator(agreement_id));

create index if not exists idx_signatures_agreement_id on public.signatures (agreement_id);
create index if not exists idx_signatures_signer_id on public.signatures (signer_id);
create index if not exists idx_signatures_kms_key_id on public.signatures (kms_key_id);
create index if not exists idx_signatures_signing_timestamp on public.signatures (signing_timestamp desc);

create or replace function public.fill_signer_name()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.signer_name is null or trim(new.signer_name) = '' then
    select coalesce(nullif(trim(full_name), ''), 'Signer')
      into new.signer_name from public.profiles where id = new.signer_id;
    if new.signer_name is null then new.signer_name := 'Signer'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_signature_insert_fill_name on public.signatures;
create trigger on_signature_insert_fill_name
  before insert on public.signatures
  for each row execute function public.fill_signer_name();

-- -----------------------------------------------------------------------------
-- 5. Signing key metadata (legacy KMS table; kept for audit)
-- -----------------------------------------------------------------------------
create table if not exists public.signing_keys (
  id uuid primary key default gen_random_uuid(),
  kms_key_id text not null unique,
  algorithm text not null default 'RSA-PSS-SHA256',
  status text not null default 'active' check (status in ('active', 'retired', 'revoked')),
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

alter table public.signing_keys enable row level security;

-- -----------------------------------------------------------------------------
-- 6. VERSIONED AGREEMENTS + PASSKEYS + ANCHORS (008)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'agreement_version_status' and n.nspname = 'public'
  ) then
    create type public.agreement_version_status as enum (
      'draft',
      'open_for_signing',
      'superseded',
      'finalized'
    );
  end if;
end;
$$;

create table if not exists public.agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  version_number int not null check (version_number >= 1),
  title text not null,
  content text not null,
  content_hash text not null,
  status public.agreement_version_status not null default 'draft',
  required_signatures int not null default 1 check (required_signatures >= 1),
  published_at timestamptz,
  supersedes_version_id uuid references public.agreement_versions (id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  encrypted_content text,
  encryption_kms_key_id text,
  is_encrypted boolean not null default false,
  unique (agreement_id, version_number)
);

create index if not exists idx_agreement_versions_agreement_id
  on public.agreement_versions (agreement_id);
create index if not exists idx_agreement_versions_status
  on public.agreement_versions (status);

alter table public.agreement_versions enable row level security;

drop policy if exists "agreement_versions_select" on public.agreement_versions;
create policy "agreement_versions_select"
  on public.agreement_versions for select
  using (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_versions.agreement_id
        and (
          a.creator_id = auth.uid()
          or a.status = 'pending'::public.agreement_status
          or exists (
            select 1 from public.signatures s
            where s.agreement_id = a.id and s.signer_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "agreement_versions_all_creator" on public.agreement_versions;
create policy "agreement_versions_all_creator"
  on public.agreement_versions for all
  using (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_versions.agreement_id and a.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_versions.agreement_id and a.creator_id = auth.uid()
    )
  );

-- Link agreements -> versions (FKs)
alter table public.agreements
  drop constraint if exists agreements_current_version_id_fkey,
  drop constraint if exists agreements_finalized_version_id_fkey;
alter table public.agreements
  add constraint agreements_current_version_id_fkey
    foreign key (current_version_id) references public.agreement_versions (id),
  add constraint agreements_finalized_version_id_fkey
    foreign key (finalized_version_id) references public.agreement_versions (id);

-- Signatures -> versions (FK + uniqueness by version)
alter table public.signatures
  drop constraint if exists signatures_agreement_version_id_fkey;
alter table public.signatures
  add constraint signatures_agreement_version_id_fkey
    foreign key (agreement_version_id) references public.agreement_versions (id) on delete cascade;

-- Ensure agreement_version_id is required in the versioned system
alter table public.signatures
  alter column agreement_version_id set not null;

-- Drop old agreement-level uniqueness (from 001) if present
alter table public.signatures drop constraint if exists signatures_agreement_signer_unique;

create unique index if not exists signatures_version_signer_unique
  on public.signatures (agreement_version_id, signer_id);

drop index if exists signatures_agreement_slot_unique;
create unique index if not exists signatures_version_slot_unique
  on public.signatures (agreement_version_id, slot_index)
  where slot_index is not null;

create index if not exists idx_signatures_agreement_version_id
  on public.signatures (agreement_version_id);

-- Passkey credentials
create table if not exists public.user_signing_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  credential_id text not null,
  public_key_cose bytea not null,
  counter bigint not null default 0,
  transports text[] default '{}',
  attestation_format text,
  nickname text,
  status text not null default 'active' check (status in ('active', 'revoked', 'replaced')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  unique (user_id, credential_id)
);

create index if not exists idx_user_signing_credentials_user_id
  on public.user_signing_credentials (user_id);

alter table public.user_signing_credentials enable row level security;

drop policy if exists "user_signing_credentials_select_own" on public.user_signing_credentials;
create policy "user_signing_credentials_select_own"
  on public.user_signing_credentials for select using (auth.uid() = user_id);
drop policy if exists "user_signing_credentials_insert_own" on public.user_signing_credentials;
create policy "user_signing_credentials_insert_own"
  on public.user_signing_credentials for insert with check (auth.uid() = user_id);
drop policy if exists "user_signing_credentials_update_own" on public.user_signing_credentials;
create policy "user_signing_credentials_update_own"
  on public.user_signing_credentials for update using (auth.uid() = user_id);
drop policy if exists "user_signing_credentials_delete_own" on public.user_signing_credentials;
create policy "user_signing_credentials_delete_own"
  on public.user_signing_credentials for delete using (auth.uid() = user_id);

-- WebAuthn challenges (server stored)
create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge text not null,
  kind text not null check (kind in ('registration', 'authentication')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists idx_webauthn_challenges_user_expires
  on public.webauthn_challenges (user_id, expires_at);

alter table public.webauthn_challenges enable row level security;

drop policy if exists "webauthn_challenges_own" on public.webauthn_challenges;
create policy "webauthn_challenges_own"
  on public.webauthn_challenges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Blockchain anchor receipts
create table if not exists public.agreement_version_anchors (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  agreement_version_id uuid not null references public.agreement_versions (id) on delete cascade,
  chain_name text not null,
  final_proof_hash text not null,
  content_hash text not null,
  signer_list_hash text,
  transaction_hash text,
  block_number bigint,
  anchor_status text not null default 'pending'
    check (anchor_status in ('pending', 'submitted', 'confirmed', 'failed')),
  anchored_at timestamptz,
  submission_payload jsonb,
  receipt_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_version_id)
);

create index if not exists idx_agreement_version_anchors_agreement_id
  on public.agreement_version_anchors (agreement_id);

alter table public.agreement_version_anchors enable row level security;

drop policy if exists "anchors_select_visible" on public.agreement_version_anchors;
create policy "anchors_select_visible"
  on public.agreement_version_anchors for select
  using (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_version_anchors.agreement_id
        and (
          a.creator_id = auth.uid()
          or a.status = 'pending'::public.agreement_status
          or exists (
            select 1 from public.signatures s
            where s.agreement_id = a.id and s.signer_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "anchors_insert_participants" on public.agreement_version_anchors;
create policy "anchors_insert_participants"
  on public.agreement_version_anchors for insert
  with check (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_version_anchors.agreement_id
        and (a.creator_id = auth.uid() or exists (
          select 1 from public.signatures s
          where s.agreement_id = a.id and s.signer_id = auth.uid()
        ))
    )
  );

drop policy if exists "anchors_update_participants" on public.agreement_version_anchors;
create policy "anchors_update_participants"
  on public.agreement_version_anchors for update
  using (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_version_anchors.agreement_id
        and (a.creator_id = auth.uid() or exists (
          select 1 from public.signatures s
          where s.agreement_id = a.id and s.signer_id = auth.uid()
        ))
    )
  );

-- Version immutability (finalized/superseded): allow encryption fields after finalize
create or replace function public.agreement_versions_immutable()
returns trigger language plpgsql
as $$
begin
  if old.status in ('finalized', 'superseded') then
    if new.title is distinct from old.title
      or new.content is distinct from old.content
      or new.content_hash is distinct from old.content_hash
      or new.required_signatures is distinct from old.required_signatures
      or new.status is distinct from old.status
      or new.version_number is distinct from old.version_number
      or new.published_at is distinct from old.published_at
      or new.supersedes_version_id is distinct from old.supersedes_version_id
      or new.finalized_at is distinct from old.finalized_at
    then
      raise exception 'Finalized or superseded agreement versions cannot be modified.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists agreement_versions_immutable_trigger on public.agreement_versions;
create trigger agreement_versions_immutable_trigger
  before update on public.agreement_versions
  for each row execute function public.agreement_versions_immutable();

-- Finalization trigger: version-based signature count
create or replace function public.set_agreement_signed_at()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  required int;
  current_count int;
  aid uuid;
  vid uuid;
begin
  vid := new.agreement_version_id;
  select v.required_signatures, v.agreement_id into required, aid
  from public.agreement_versions v
  where v.id = vid;

  select count(*)::int into current_count
  from public.signatures s
  where s.agreement_version_id = vid;

  if current_count >= required then
    update public.agreement_versions
    set status = 'finalized', finalized_at = coalesce(finalized_at, now())
    where id = vid and status = 'open_for_signing';

    update public.agreements
    set
      status = 'signed',
      signed_at = coalesce(signed_at, now()),
      finalized_version_id = vid,
      finalized_at = coalesce(finalized_at, now())
    where id = aid and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists on_signature_created on public.signatures;
create trigger on_signature_created
  after insert on public.signatures
  for each row execute function public.set_agreement_signed_at();

-- Sign page RPC: return current version for signing (pending/signed only)
drop function if exists public.get_agreement_for_signing(uuid);
create or replace function public.get_agreement_for_signing(p_id uuid)
returns table (
  id uuid,
  agreement_version_id uuid,
  version_number int,
  title text,
  content text,
  content_hash text,
  status public.agreement_status,
  required_signatures int
)
language sql security definer set search_path = public stable
as $$
  select
    a.id,
    v.id as agreement_version_id,
    v.version_number,
    v.title,
    v.content,
    v.content_hash,
    a.status,
    v.required_signatures
  from public.agreements a
  join public.agreement_versions v on v.id = a.current_version_id
  where a.id = p_id and a.status in ('pending', 'signed');
$$;

grant execute on function public.get_agreement_for_signing(uuid) to anon;
grant execute on function public.get_agreement_for_signing(uuid) to authenticated;

