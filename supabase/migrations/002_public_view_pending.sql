-- =============================================================================
-- Fix RLS and triggers (idempotent: safe after 001 for new or existing DBs)
-- =============================================================================

-- Replace old select policies with single "Agreements read access" (allows pending for signers)
drop policy if exists "Signed agreements are readable by signers" on public.agreements;
drop policy if exists "Public view pending" on public.agreements;
drop policy if exists "Agreements read access" on public.agreements;

create policy "Agreements read access"
  on public.agreements for select
  using (
    auth.uid() = creator_id
    or status = 'pending'::public.agreement_status
    or exists (
      select 1 from public.signatures s where s.agreement_id = agreements.id and s.signer_id = auth.uid()
    )
  );

-- Status regression prevention (same as 001)
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
  if old.status = 'signed' and new.status != 'signed' then
    raise exception 'Signed agreements cannot be modified or reverted.';
  end if;
  if old.status = 'pending' and new.status = 'draft' then
    raise exception 'Cannot revert pending agreement to draft.';
  end if;
  return new;
end;
$$;

-- Auto-fill signer_name from profiles (same as 001)
create or replace function public.fill_signer_name()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.signer_name is null or trim(new.signer_name) = '' then
    select coalesce(nullif(trim(full_name), ''), 'Signer')
      into new.signer_name
      from public.profiles
      where id = new.signer_id;
    if new.signer_name is null then
      new.signer_name := 'Signer';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_signature_insert_fill_name on public.signatures;
create trigger on_signature_insert_fill_name
  before insert on public.signatures
  for each row execute function public.fill_signer_name();
