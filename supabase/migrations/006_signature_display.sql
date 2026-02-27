alter table public.signatures
  add column if not exists signature_display text,
  add column if not exists signature_style text;

