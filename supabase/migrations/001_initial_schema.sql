-- Secure Digital Agreement Platform – Initial Schema
-- Ensures immutability and data integrity for agreements and signatures.

-- =============================================================================
-- 1. PROFILES (extends auth.users)
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  wechat_openid text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. TEMPLATES
-- =============================================================================
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  content text not null default '',
  created_at timestamptz default now() not null
);

alter table public.templates enable row level security;

create policy "Users can read own templates"
  on public.templates for select
  using (auth.uid() = user_id);

create policy "Users can insert own templates"
  on public.templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update own templates"
  on public.templates for update
  using (auth.uid() = user_id);

create policy "Users can delete own templates"
  on public.templates for delete
  using (auth.uid() = user_id);

create index idx_templates_user_id on public.templates (user_id);

-- =============================================================================
-- 3. AGREEMENTS (content and content_hash immutable once pending/signed)
-- =============================================================================
create type public.agreement_status as enum ('draft', 'pending', 'signed', 'voided');

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  content text not null,
  content_hash text not null,
  status public.agreement_status not null default 'draft',
  created_at timestamptz default now() not null,
  signed_at timestamptz
);

alter table public.agreements enable row level security;

-- Immutability: once status is 'pending' or 'signed', content and content_hash cannot change
create or replace function public.agreements_immutable_content()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('pending', 'signed') and (
    new.content is distinct from old.content or new.content_hash is distinct from old.content_hash
  ) then
    raise exception 'Agreement content and content_hash are immutable when status is pending or signed.';
  end if;
  return new;
end;
$$;

create trigger agreements_immutable_content_trigger
  before update on public.agreements
  for each row execute function public.agreements_immutable_content();

create policy "Creators can manage own agreements"
  on public.agreements for all
  using (auth.uid() = creator_id);

create policy "Signed agreements are readable by signers"
  on public.agreements for select
  using (
    auth.uid() = creator_id
    or exists (
      select 1 from public.signatures s where s.agreement_id = agreements.id and s.signer_id = auth.uid()
    )
  );

create index idx_agreements_creator_id on public.agreements (creator_id);
create index idx_agreements_status on public.agreements (status);
create index idx_agreements_created_at on public.agreements (created_at desc);

-- =============================================================================
-- 4. SIGNATURES (one signature per user per agreement)
-- =============================================================================
create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  signer_id uuid not null references public.profiles (id) on delete restrict,
  signer_name text not null,
  signed_at timestamptz default now() not null,
  signature_image_url text,
  constraint signatures_agreement_signer_unique unique (agreement_id, signer_id)
);

alter table public.signatures enable row level security;

create policy "Signers can insert own signature"
  on public.signatures for insert
  with check (auth.uid() = signer_id);

create policy "Agreement creator and signers can read signatures"
  on public.signatures for select
  using (
    auth.uid() = signer_id
    or exists (
      select 1 from public.agreements a where a.id = signatures.agreement_id and a.creator_id = auth.uid()
    )
  );

create index idx_signatures_agreement_id on public.signatures (agreement_id);
create index idx_signatures_signer_id on public.signatures (signer_id);

-- =============================================================================
-- 5. HELPER: Update agreement signed_at when first signature is added
-- =============================================================================
create or replace function public.set_agreement_signed_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.agreements
  set status = 'signed', signed_at = now()
  where id = new.agreement_id and status = 'pending' and signed_at is null;
  return new;
end;
$$;

create trigger on_signature_created
  after insert on public.signatures
  for each row execute function public.set_agreement_signed_at();
