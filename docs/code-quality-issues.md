# WeAgree — Code Quality GitHub Issues

Ready-to-file GitHub issues identified from a static review of the codebase. Each item is self-contained with title, labels, context, file references, and acceptance criteria.

Suggested label set to create first: `tech-debt`, `refactor`, `security`, `performance`, `dead-code`, `dx`, `tests`, `accessibility`, `good-first-issue`.

---

## 1. Refactor: split `signAgreement` into testable helpers

**Labels:** `refactor`, `tech-debt`

**Context**
`signAgreement` in [app/actions/agreements.ts](app/actions/agreements.ts#L538-L900) is ~360 lines, handles authentication, passkey verification, payload construction, ed25519 signing, slot validation, insert, then post-finalization side effects (encryption, anchoring, persistence via admin client, email). It mixes business rules and integrations, has no unit tests, and is hard to reason about.

**Concrete pain points**
- Nested `try { ... } catch {}` blocks at [agreements.ts#L743-L900](app/actions/agreements.ts#L743-L900) silently swallow finalize/anchor/email errors.
- Two `as any` casts at [agreements.ts#L723](app/actions/agreements.ts#L723) and [agreements.ts#L799](app/actions/agreements.ts#L799).
- `kmsKeyId` string is overloaded with semantics (`"user-ed25519"` / `"user-ed25519+passkey"`).

**Acceptance criteria**
- Extract pure helpers (e.g. `buildSigningPayload`, `chooseSigningMode`, `finalizeAgreement`, `anchorFinalProof`, `recordAnchorReceipt`) into `lib/signing/*` or `lib/agreements/*`.
- `signAgreement` becomes < 80 lines, orchestrating these helpers.
- Each extracted pure helper has at least one unit test under [app/actions/agreements.test.ts](app/actions/agreements.test.ts) or alongside the helper.
- Replace empty `catch {}` with logged errors (use a small `lib/log.ts` wrapper around `console`).
- Remove `as any` casts; tighten the `passkey_assertion` insert type.

---

## 2. Refactor: deduplicate `createAgreement` / `createDraftAgreement`

**Labels:** `refactor`, `dead-code`, `good-first-issue`

**Context**
[`createAgreement`](app/actions/agreements.ts#L77-L139) and [`createDraftAgreement`](app/actions/agreements.ts#L141-L203) are ~98% identical, differing only in the `status` value (`"pending"` vs `"draft"`) and the version `status` and `published_at`.

**Acceptance criteria**
- Introduce a single private helper `createAgreementInternal(formData, { kind: "publish" | "draft" })`.
- `createAgreement` and `createDraftAgreement` become thin wrappers.
- Existing tests in [app/actions/agreements.test.ts](app/actions/agreements.test.ts) still pass; add a test for the `publish` path.

---

## 3. Security: validate `redirectTo` to prevent open redirect

**Labels:** `security`

**Context**
The `redirectTo` query parameter is accepted in multiple places and only checked with `startsWith("/")`:
- [middleware.ts#L47-L60](middleware.ts#L47-L60)
- [app/auth/callback/route.ts#L8-L27](app/auth/callback/route.ts#L8-L27)
- [app/sign/[id]/sign-view.tsx#L130-L133](app/sign/%5Bid%5D/sign-view.tsx#L130-L133)

A protocol-relative URL like `//evil.com/x` also starts with `/`, so an attacker can craft `/login?redirectTo=//evil.com` and have the post-login flow redirect off-origin. URL-encoded variants (`/%2F%2Fevil.com`) and `/\evil.com` should also be rejected.

**Acceptance criteria**
- Add a single helper `lib/utils/safeRedirect.ts` exporting `safeRelativePath(input: string | null): string` that:
  - Returns `"/dashboard"` (default) if input is missing.
  - Returns `"/"` + sanitised path only if the input is a single-slash relative path with no scheme, no second `/`, no backslash, and no `@`.
- Replace all three usages above with this helper.
- Add unit tests covering `//evil.com`, `/\evil.com`, `https://evil.com`, `///x`, `/dashboard`, `/sign/abc`.

---

## 4. Security: HTML-escape variables in email templates

**Labels:** `security`

**Context**
[lib/email/templates.ts](lib/email/templates.ts#L1-L60) interpolates user-controlled values (`agreementTitle`, `creatorName`, `actionUrl`) directly into HTML. An agreement title like `</a><script>...` will break out of the template. `actionUrl` is interpolated into `href="${actionUrl}"` with no validation; a `javascript:` URL would execute when clicked in some webmail clients.

**Acceptance criteria**
- Add a small `escapeHtml` helper and an `safeHttpUrl(url) -> string | null` helper in `lib/email/escape.ts`.
- All `${...}` interpolations in `signatureRequiredTemplate` and `agreementFinalizedTemplate` go through `escapeHtml`.
- `actionUrl` is validated to start with `http://` or `https://` before insertion; otherwise the template returns a fallback link to the site root.
- Add unit tests for both escaping and URL validation.

---

## 5. Security: enforce signature upload size/type limits

**Labels:** `security`, `bug`

**Context**
[components/signature-upload.tsx](components/signature-upload.tsx#L17-L25) advertises "PNG, JPG up to 1MB" but never enforces type or size. A large image is loaded into memory and embedded as a base64 data URI in the signature row, bloating DB rows and the proof export.

**Acceptance criteria**
- Reject files larger than 1 MB and files whose `type` is not `image/png` / `image/jpeg`. Show inline error.
- Apply the same validation server-side in [app/actions/agreements.ts#signAgreement](app/actions/agreements.ts#L538) (`signatureDisplay` data URI length cap, e.g. 1.5 MB after base64 encoding; reject other MIME prefixes).
- Add a unit test for the server-side validator.

---

## 6. Security/Performance: configure Next security headers and image config

**Labels:** `security`, `performance`

**Context**
[next.config.mjs](next.config.mjs) is empty:
```js
const nextConfig = {};
```
No CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers. `next/image` cannot be used because no `images.remotePatterns` are configured.

**Acceptance criteria**
- Add a `headers()` block in `next.config.mjs` exporting at minimum: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a strict `Content-Security-Policy` (allow `self` for scripts/styles; allow `data:` for images so signatures still render).
- Add `images: { remotePatterns: [] }` placeholder with a comment.
- Verify the app still loads end-to-end with `pnpm dev` / `next start`.

---

## 7. Refactor: consolidate `getBaseUrl()` duplication

**Labels:** `refactor`, `dead-code`

**Context**
Origin/base-URL derivation is duplicated across:
- [middleware.ts#L50-L60](middleware.ts#L50-L60)
- [app/auth/callback/route.ts#L11-L25](app/auth/callback/route.ts#L11-L25)
- [app/dashboard/[id]/page.tsx#L17-L25](app/dashboard/%5Bid%5D/page.tsx#L17-L25)
- [app/actions/agreements.ts#L270](app/actions/agreements.ts#L270), [agreements.ts#L314](app/actions/agreements.ts#L314), [agreements.ts#L887](app/actions/agreements.ts#L887)
- [lib/passkey/rp.ts#L17-L25](lib/passkey/rp.ts#L17-L25)

Each implementation has subtle differences (some honor `x-forwarded-*`, some don't; some fall back to `localhost:3000`, some to `requestOrigin`).

**Acceptance criteria**
- Create `lib/utils/baseUrl.ts` exporting `getBaseUrl(req?: Request | Headers)` and `getBaseUrlFromHeaders()`.
- All call sites use it. The legacy strings are removed.
- Add unit tests covering env override, `x-forwarded-*`, fallback to `host`, and the localhost branch.

---

## 8. Tech debt: remove `any` types across signing/canonical/passkey code

**Labels:** `tech-debt`, `refactor`

**Context**
`any` is sprinkled across the signing-critical path:
- [lib/signing/json-canonical.ts#L2-L13](lib/signing/json-canonical.ts#L2-L13)
- [scripts/verify-proof.ts#L5-L13](scripts/verify-proof.ts#L5-L13), [verify-proof.ts#L28-L31](scripts/verify-proof.ts#L28-L31)
- [lib/passkey/bytea.ts#L8-L18](lib/passkey/bytea.ts#L8-L18)
- [lib/anchoring/chain.ts#L36](lib/anchoring/chain.ts#L36)
- [app/sign/[id]/page.tsx#L142](app/sign/%5Bid%5D/page.tsx#L142)
- [app/sign/[id]/sign-view.tsx#L163](app/sign/%5Bid%5D/sign-view.tsx#L163), [sign-view.tsx#L422](app/sign/%5Bid%5D/sign-view.tsx#L422)
- [app/actions/agreements.test.ts#L12](app/actions/agreements.test.ts#L12)
- [app/actions/agreements.ts#L723](app/actions/agreements.ts#L723), [agreements.ts#L799](app/actions/agreements.ts#L799)

**Acceptance criteria**
- Replace `any` with `unknown` plus narrow type guards in `json-canonical.ts`, `bytea.ts`, and chain RPC response handling.
- Type passkey options with `PublicKeyCredentialCreationOptionsJSON` / `PublicKeyCredentialRequestOptionsJSON` from `@simplewebauthn/types`.
- Add an ESLint rule `@typescript-eslint/no-explicit-any: error` (or `warn` if too disruptive at first) and document the exception path.
- `pnpm lint` passes with zero `no-explicit-any` errors in `lib/**` and `app/actions/**`.

---

## 9. Refactor: deduplicate `STATUS_CONFIG` between dashboard pages

**Labels:** `refactor`, `dead-code`, `good-first-issue`

**Context**
The status badge map is defined twice with overlapping shape:
- [app/dashboard/page.tsx#L55-L84](app/dashboard/page.tsx#L55-L84) as `STATUS_CONFIG`
- [app/dashboard/[id]/page.tsx#L82-L114](app/dashboard/%5Bid%5D/page.tsx#L82-L114) as `STATUS_BADGE`

**Acceptance criteria**
- Move the config and the `StatusBadge` component into `components/status-badge.tsx`.
- Both dashboard pages import and use it.
- Remove the inline copies.

---

## 10. Refactor: deduplicate canonicalization between app and verifier

**Labels:** `refactor`, `tech-debt`

**Context**
[lib/signing/json-canonical.ts](lib/signing/json-canonical.ts) and [scripts/verify-proof.ts](scripts/verify-proof.ts#L1-L15) implement the same `canonicalize`/`sortValue`. The verifier script also duplicates SHA-256 / Ed25519 verification helpers.

**Acceptance criteria**
- The TypeScript verifier ([scripts/verify-proof.ts](scripts/verify-proof.ts)) imports `canonicalize` from `lib/signing/json-canonical`. (The standalone JS verifier `scripts/verify-proof.js` is intentionally portable and may keep its duplicate, but link to it from the README.)
- Add a test asserting `canonicalize` is stable and equivalent to the JS verifier's implementation.

---

## 11. Bug: `canonicalize` does not match RFC 8785 and is unsafe for special inputs

**Labels:** `bug`, `security`

**Context**
[lib/signing/json-canonical.ts](lib/signing/json-canonical.ts) uses `JSON.stringify` after key sorting, which:
- Throws on circular objects (DoS surface for any caller that accidentally passes one).
- Drops `undefined` keys silently (signer-side and verifier-side could disagree if either side ever introduces an optional field).
- Does not produce RFC 8785 JCS-compliant number formatting (e.g. `1e21`, `-0`, large integers).

Because `final_proof_hash` is anchored on-chain, any drift produces a forever-irreparable mismatch.

**Acceptance criteria**
- Document the canonical form explicitly in a top-of-file comment (only string/number/boolean/null/array/object, no `undefined`, no `NaN`/`Infinity`).
- Throw early with a descriptive error if the input contains `undefined`, `NaN`, `Infinity`, or a cycle.
- Restrict numbers to safe integers (or document that floats are not supported).
- Unit tests cover each rejected case and verify deterministic output for nested objects.

---

## 12. Performance/DX: replace `<img>` with `next/image` for signature display

**Labels:** `performance`, `dx`

**Context**
[app/sign/[id]/sign-view.tsx#L335-L342](app/sign/%5Bid%5D/sign-view.tsx#L335-L342) and [sign-view.tsx#L405-L413](app/sign/%5Bid%5D/sign-view.tsx#L405-L413) use raw `<img>` for signature data URIs and previews. This produces `@next/next/no-img-element` warnings and skips image optimisation for any non-data signatures.

**Acceptance criteria**
- For data URIs (signature previews), keep `<img>` but add an inline ESLint disable comment with a justification.
- For any non-data URL paths, use `next/image`.
- Verify `pnpm lint` produces no `no-img-element` warnings for files not touched by this issue.

---

## 13. UX: replace `alert()` with a toast/inline error

**Labels:** `dx`, `accessibility`, `good-first-issue`

**Context**
[components/pdf-download-button.tsx#L52](components/pdf-download-button.tsx#L52) uses `alert("Failed to generate PDF...")`. Browser `alert` is blocking, ugly, and not consistent with the rest of the UI which uses `<Alert>`.

**Acceptance criteria**
- Surface PDF errors via the same `<Alert>` component used elsewhere, or via the existing Tabs/inline error pattern.
- No `window.alert`/`alert(` usage remains in `app/**` or `components/**`.

---

## 14. Tech debt: stop silently swallowing errors

**Labels:** `tech-debt`, `bug`

**Context**
Empty `catch {}` blocks hide real failures and make support hard:
- [app/actions/agreements.ts#L879-L884](app/actions/agreements.ts#L879-L884) (anchor persistence)
- [app/actions/agreements.ts#L897-L899](app/actions/agreements.ts#L897-L899) (post-finalize side effects)
- [app/auth/callback/route.ts#L40-L43](app/auth/callback/route.ts#L40-L43)
- [app/sign/[id]/page.tsx#L99-L101](app/sign/%5Bid%5D/page.tsx#L99-L101), [page.tsx#L124-L126](app/sign/%5Bid%5D/page.tsx#L124-L126), [page.tsx#L170-L172](app/sign/%5Bid%5D/page.tsx#L170-L172)
- [app/dashboard/[id]/page.tsx#L73-L75](app/dashboard/%5Bid%5D/page.tsx#L73-L75)
- [middleware.ts#L66-L68](middleware.ts#L66-L68)

**Acceptance criteria**
- Introduce `lib/log.ts` with `logWarn`/`logError` (thin wrapper around `console`; pluggable later).
- Every empty `catch {}` either:
  - Logs with a stable code (e.g. `anchor.persist_failed`) and the error message, or
  - Has an inline comment explaining why the swallow is intentional (e.g. "RPC fallback only when admin client is unavailable").
- Critical anchoring/finalize errors are surfaced to the caller (return shape `{ success: true, warnings?: string[] }`).

---

## 15. Performance: avoid extra `select` round-trip in `signAgreement` finalization

**Labels:** `performance`

**Context**
After insert, [app/actions/agreements.ts#L780-L815](app/actions/agreements.ts#L780-L815) re-selects the agreement, then re-selects the version, then re-queries `signed_at`, then re-queries all signatures, then re-queries the creator profile. This is at least 5 sequential round-trips on every signing event.

**Acceptance criteria**
- Use a single Supabase RPC or a joined select that returns agreement + version + signatures in one round-trip.
- The `signed_at` lookup at [agreements.ts#L831-L836](app/actions/agreements.ts#L831-L836) is folded into the same query.
- Add a basic Jest test using a mocked Supabase client that asserts the number of `from(...)` calls per signing event has dropped to ≤ 3.

---

## 16. Tech debt: stop mirroring version fields onto the `agreements` table

**Labels:** `tech-debt`, `refactor`

**Context**
`syncAgreementMirror` in [app/actions/agreements.ts#L41-L60](app/actions/agreements.ts#L41-L60) is called from `createAgreement`, `createDraftAgreement`, `updateDraftAgreement`, `publishAgreement`, `updatePendingAgreementContent`, and `signAgreement`. Keeping `agreements.title/content/content_hash/required_signatures` in sync with the active `agreement_versions` row is fragile and a source of bugs (any new write path must remember to mirror).

**Acceptance criteria**
- Replace the mirrored columns with a Postgres view `current_agreements` joining `agreements` on `current_version_id`.
- Update read paths (dashboard, share, sign) to use the view.
- Drop the mirrored columns in a new migration `supabase/migrations/0XX_drop_agreement_mirror.sql` once read paths are migrated.
- Remove `syncAgreementMirror` calls.

---

## 17. Tests: add coverage for signing, anchoring, and verify-proof

**Labels:** `tests`

**Context**
Today only [lib/signaturePlaceholders.test.ts](lib/signaturePlaceholders.test.ts), [lib/signing/json-canonical.test.ts](lib/signing/json-canonical.test.ts), [app/actions/agreements.test.ts](app/actions/agreements.test.ts), and [app/actions/templates.test.ts](app/actions/templates.test.ts) exist. The cryptographic core has no automated test:
- `lib/anchoring/final-proof.ts` (`computeFinalProofHash`, `computeSignerListHash`)
- `lib/anchoring/chain.ts` (`submitFinalProofHash`)
- `lib/signing/user-keypair.ts` (encrypt/decrypt round-trip, sign/verify round-trip)
- `lib/signing/kms-client.ts` (envelope encrypt/decrypt round-trip)
- `scripts/verify-proof.ts` end-to-end against a recorded proof JSON

**Acceptance criteria**
- One Jest test file per module above, each with at least one success case and one tamper-detection case.
- `pnpm test` continues to pass; CI does not regress.

---

## 18. DX: clean up `STATUS_BADGE` and other dead/duplicate types

**Labels:** `dead-code`, `refactor`

**Context**
- `localhost:3000` literal is hard-coded as a fallback in [lib/passkey/rp.ts#L22](lib/passkey/rp.ts#L22) and three places in [app/actions/agreements.ts](app/actions/agreements.ts) — same default duplicated.
- `Agreement` is exported from [lib/types/database.ts](lib/types/database.ts#L29) but only re-imported as a name once; row shapes are mostly re-declared inline. Decide: either rely on `Agreement` everywhere, or remove the unused export.
- `PasskeySignInput` defined at [app/actions/agreements.ts#L529](app/actions/agreements.ts#L529) is exported but only used in one file.

**Acceptance criteria**
- Centralise `LOCAL_DEFAULT_BASE_URL = "http://localhost:3000"` in `lib/utils/baseUrl.ts` (see issue #7).
- Either delete unused exports or document them in the file header.
- `pnpm lint` passes with no `unused-vars`.

---

## 19. Security: revoke/delete passkey UX and server action missing

**Labels:** `security`, `bug`

**Context**
[app/settings/passkeys/passkey-settings-client.tsx](app/settings/passkeys/passkey-settings-client.tsx) lists passkeys and shows their `status`, but offers no way to revoke or rename them. The database schema supports `status: "active" | "revoked" | "replaced"`. Users currently cannot remove a lost device's credential.

**Acceptance criteria**
- Add a `revokePasskey(id: string)` server action in [app/actions/passkeys.ts](app/actions/passkeys.ts) that sets `status = 'revoked'` and `revoked_at = now()` for the authenticated user only.
- UI shows a "Revoke" button per passkey with a confirmation dialog.
- `beginPasskeySignForAgreement` continues to filter on `status = 'active'`.
- Add a unit test of the action verifying it cannot revoke another user's passkey.

---

## 20. DX: pin Node/package manager and enable stricter lint

**Labels:** `dx`, `tech-debt`

**Context**
- [.eslintrc.json](.eslintrc.json) only extends `next/core-web-vitals`. No `no-unused-vars`, `no-explicit-any`, or `@typescript-eslint/consistent-type-imports`.
- `package.json` declares `"engines": { "node": ">=18.17.0" }` but no `packageManager` field; the repo uses a mix of indentation (2 vs 4 spaces) across files (e.g. [components/markdown-renderer.tsx](components/markdown-renderer.tsx) uses 4 spaces, [app/actions/agreements.ts](app/actions/agreements.ts) uses 2 spaces).

**Acceptance criteria**
- Add a Prettier config (`.prettierrc.json`) standardising indentation, and run `pnpm exec prettier --write .` once with the result committed.
- Add `@typescript-eslint/no-unused-vars` and `@typescript-eslint/no-explicit-any` (warn → error after issue #8) to ESLint.
- Add `"packageManager"` to `package.json` matching the actually-used manager.
- Document the chosen manager in [README.md](README.md).

---

## 21. Tech debt: type `signaturePlaceholders.countSignatureSlots` properly

**Labels:** `good-first-issue`, `tech-debt`

**Context**
[lib/signaturePlaceholders.ts#L3](lib/signaturePlaceholders.ts#L3) accepts `string` but [the test at line 7](lib/signaturePlaceholders.test.ts#L7) passes `null as any`, indicating callers may pass nullable values. The runtime check `if (!content) return 0;` already handles it.

**Acceptance criteria**
- Change the signature to `countSignatureSlots(content: string | null | undefined): number` (same for `buildSignatureSlotMap`).
- Remove the `as any` cast in the test.

---

## 22. Tech debt: extract a single "creator display name" helper

**Labels:** `refactor`, `good-first-issue`

**Context**
The same fallback chain — `full_name || metadata.full_name || metadata.name || email.split('@')[0] || "User"` — is repeated in:
- [app/actions/agreements.ts#L274-L278](app/actions/agreements.ts#L274-L278)
- [app/actions/agreements.ts#L302-L306](app/actions/agreements.ts#L302-L306)
- [app/actions/agreements.ts#L562-L566](app/actions/agreements.ts#L562-L566)
- [lib/account/provision.ts#L10-L15](lib/account/provision.ts#L10-L15)
- [app/actions/passkeys.ts#L35-L41](app/actions/passkeys.ts#L35-L41)

**Acceptance criteria**
- Add `getDisplayName(user, profile?)` in `lib/account/displayName.ts`.
- All listed sites use it.

---

## 23. Security: document or replace placeholder KMS

**Labels:** `security`, `documentation`

**Context**
[lib/signing/kms-client.ts](lib/signing/kms-client.ts) generates an RSA keypair in-process if no env key is present, persists it nowhere, and reuses it for both signing and envelope encryption. [lib/signing/user-keypair.ts](lib/signing/user-keypair.ts) requires `USER_KEY_ENCRYPTION_KEY` (a single symmetric secret) to decrypt every user's private key on every sign — a single env value is a custodial root key.

This is acceptable for local dev but should not silently ship to production.

**Acceptance criteria**
- `getPrivateKey()` in `kms-client.ts` logs a `console.error` and throws if `NODE_ENV === 'production'` and `SIGNING_PRIVATE_KEY_PEM` is unset.
- Add a section to [README.md](README.md) under "Production checklist" listing required env vars and the threat model (encryption-at-rest secret, key rotation strategy, planned KMS integration point).
- Add an interface `KmsProvider` in `lib/signing/types.ts`; the current implementation becomes `LocalKmsProvider` so a future cloud KMS implementation can be swapped in without touching call sites.

---

## 24. Performance: avoid recomputing SHA-256 in two different ways

**Labels:** `performance`, `tech-debt`, `good-first-issue`

**Context**
[app/actions/agreements.ts#L29-L36](app/actions/agreements.ts#L29-L36) defines `sha256Hex` using `crypto.subtle.digest` (async, slower in Node) while the same file later defines `sha256HexBuf` using `crypto.createHash` (sync, native). The async variant is used for content hashing.

**Acceptance criteria**
- Replace `sha256Hex` calls on the server with `crypto.createHash("sha256").update(content).digest("hex")`.
- Keep the async TextEncoder-based version only where it is used in the browser ([app/sign/[id]/sign-view.tsx#L38-L45](app/sign/%5Bid%5D/sign-view.tsx#L38-L45)).
- Move the browser version to `lib/utils/sha256Browser.ts` and the Node version to `lib/utils/sha256.ts`.

---

## 25. Modern code structure: adopt a thin server-action result helper

**Labels:** `refactor`, `dx`

**Context**
Every server action returns ad-hoc shapes: `{ error }`, `{ success: true }`, `{ success: true, id }`, `{ ok: true, ... }`, `{ ok: false, error }`. Client code must remember which to handle (see [share-panel.tsx#L43-L52](app/dashboard/%5Bid%5D/share-panel.tsx#L43-L52), [sign-view.tsx#L181-L190](app/sign/%5Bid%5D/sign-view.tsx#L181-L190)).

**Acceptance criteria**
- Add `lib/utils/result.ts` exporting `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }` plus `ok(data)` / `fail(message)` helpers.
- New server actions use this shape; the legacy shapes are slowly migrated.
- Convert at least `signAgreement`, `createAgreement`, `createDraftAgreement`, `publishAgreement`, `deleteAgreement`, `sendSignatureRequest`, `revokePasskey` (from #19) to `ActionResult`.
- Client callers updated; tests updated.

---

### How to file these

1. Create the labels listed at the top.
2. Copy each section (heading + body) into a new GitHub issue, keeping the markdown file links — GitHub will linkify them automatically.
3. Suggested batching for a single agent run: #2, #9, #13, #21, #22, #24 are small and isolated (`good-first-issue`); tackle #1, #15, #16 as one larger refactor PR.
