-- =============================================================================
-- Fix infinite recursion: agreements policy reads signatures, signatures policy
-- reads agreements. Use SECURITY DEFINER helper so signatures policy doesn't
-- trigger RLS on agreements.
-- =============================================================================

create or replace function public.is_agreement_creator(p_agreement_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.agreements
    where id = p_agreement_id and creator_id = auth.uid()
  );
$$;

drop policy if exists "Agreement creator and signers can read signatures" on public.signatures;

create policy "Agreement creator and signers can read signatures"
  on public.signatures for select
  using (
    auth.uid() = signer_id
    or public.is_agreement_creator(agreement_id)
  );
