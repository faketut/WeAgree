-- Document idempotency and signer visibility guarantees:
-- 1. Agreement (title, content, content_hash) is immutable once status is pending or signed
--    (enforced by trigger agreements_immutable_content_trigger).
-- 2. Only pending and signed agreements are viewable on the sign page (get_agreement_for_signing
--    filters by status in ('pending', 'signed')); draft and voided return no row -> 404.

comment on trigger agreements_immutable_content_trigger on public.agreements is
  'Idempotency: content and content_hash are immutable when status is pending or signed; prevents reverting signed to pending or pending to draft.';

comment on function public.get_agreement_for_signing(uuid) is
  'Returns agreement only when status is pending or signed; signers never see draft or voided.';
