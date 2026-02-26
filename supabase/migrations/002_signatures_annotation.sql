-- Add optional annotation/comment to signatures (displayed in agreement view)
alter table public.signatures
  add column if not exists annotation text;
