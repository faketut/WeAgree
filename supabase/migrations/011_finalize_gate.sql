-- Atomic finalize gate.
--
-- The application post-signature side-effects (encrypt content, anchor on-chain,
-- send finalized-email) are not idempotent for free: two signers landing the
-- last two slots concurrently can both observe `status = 'signed'` and double-
-- execute the work, including a duplicate on-chain anchor tx.
--
-- We add a nullable claim column. Exactly one transactional UPDATE can set it
-- from NULL to NOW(); losers see no rows updated and skip the work.

alter table public.agreements
  add column if not exists finalize_started_at timestamptz;
