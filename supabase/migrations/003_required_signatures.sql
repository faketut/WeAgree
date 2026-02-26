-- Multi-party: agreement is signed when signature count >= required_signatures
alter table public.agreements
  add column if not exists required_signatures int not null default 1
  check (required_signatures >= 1);

-- Replace trigger: set signed when count >= required_signatures
create or replace function public.set_agreement_signed_at()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  required int;
  current_count int;
begin
  select a.required_signatures into required
  from public.agreements a where a.id = new.agreement_id;
  select count(*)::int into current_count
  from public.signatures s where s.agreement_id = new.agreement_id;
  if current_count >= required then
    update public.agreements
    set status = 'signed', signed_at = now()
    where id = new.agreement_id and status = 'pending' and signed_at is null;
  end if;
  return new;
end;
$$;

-- Sign page RPC: also return required_signatures
drop function if exists public.get_agreement_for_signing(uuid);
create or replace function public.get_agreement_for_signing(p_id uuid)
returns table (
  id uuid,
  title text,
  content text,
  content_hash text,
  status public.agreement_status,
  required_signatures int
)
language sql security definer set search_path = public stable
as $$
  select a.id, a.title, a.content, a.content_hash, a.status, a.required_signatures
  from public.agreements a
  where a.id = p_id and a.status in ('pending', 'signed');
$$;

grant execute on function public.get_agreement_for_signing(uuid) to anon;
grant execute on function public.get_agreement_for_signing(uuid) to authenticated;
