-- Per-user signing keypairs (custodial; private key encrypted server-side)

create table if not exists public.user_keypairs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  algorithm text not null default 'ed25519',
  public_key_pem text not null,
  encrypted_private_key text not null,
  key_version int not null default 1,
  created_at timestamptz not null default now()
);

alter table public.user_keypairs enable row level security;

create policy "user_keypairs_select_own"
  on public.user_keypairs for select using (auth.uid() = user_id);

create policy "user_keypairs_insert_own"
  on public.user_keypairs for insert with check (auth.uid() = user_id);

create policy "user_keypairs_update_own"
  on public.user_keypairs for update using (auth.uid() = user_id);

