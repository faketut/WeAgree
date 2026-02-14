# MVP: Secure Agreement Platform

## 1. Product design

### 1.1 Vision

A minimal product for **creating and signing digital agreements** with:
- **Identity**: GitHub login only.
- **Trust**: Content hash (SHA-256) so signers can verify the document wasn’t changed.
- **Flow**: One creator, one signer (1-to-1); no templates, no email, no payments.

### 1.2 Out of scope (MVP)

| Not in MVP | Reason |
|------------|--------|
| Rich-text editor | Plain text / Markdown only. |
| Multi-party signing | Only creator vs signer (1-to-1). |
| Template system | Create new agreement from scratch each time. |
| Email notifications | User checks Dashboard. |
| Paid features | Validate core flow first. |

### 1.3 User roles

- **Creator**: Logs in with GitHub, creates agreement, publishes, shares link/QR. Sees own drafts, pending, signed in Dashboard.
- **Signer**: Opens link (or scans QR), reads agreement, verifies integrity, signs with same GitHub account. No Dashboard for “agreements sent to me” in MVP.

### 1.4 Core flows

**Flow A – Creator**

1. Home → **Login** (GitHub).
2. **Dashboard** → “New Agreement” → **Create** (title + content; hint for `{{Name}}`).
3. Submit → **Create & Publish** (content hashed, status = `pending`, redirect to share page).
4. **Share** page: view agreement, copy sign link, show QR code.
5. Dashboard lists: **Pending** → **Signed** → **Drafts**.

**Flow B – Signer**

1. Opens **sign link** (or scans QR) → `/sign/[id]`.
2. Sees agreement title + content.
3. Client checks content hash vs stored `content_hash` → “Content integrity verified” or “Document may have been tampered with”.
4. If not logged in: “Sign in to sign” → GitHub login → return to same sign page.
5. Clicks **Sign** → one signature per user per agreement; agreement status → `signed`.
6. Sees “Signed successfully” and can go home.

### 1.5 Key pages

| Route | Purpose |
|-------|--------|
| `/` | Landing; link to Login. |
| `/login` | “Sign in with GitHub”; supports `redirectTo` (e.g. `/sign/[id]`). |
| `/auth/callback` | OAuth callback; redirects to `redirectTo` or `/dashboard`. |
| `/dashboard` | Creator’s list: Pending, Signed, Drafts; New Agreement; Sign out. |
| `/dashboard/[id]` | Agreement detail + share (link + QR) when status = pending. |
| `/create` | New agreement form (title, content); “Create & Publish”. |
| `/sign/[id]` | View agreement, integrity check, sign (or prompt login). |

### 1.6 Data model (summary)

- **profiles**: `id`, `full_name`, `email`, `phone`, `wechat_openid` (from auth + optional).
- **agreements**: `id`, `creator_id`, `title`, `content`, `content_hash`, `status` (draft | pending | signed | voided).
- **signatures**: `agreement_id`, `signer_id`, `signer_name`, `signed_at`; unique (agreement_id, signer_id).

Security: RLS so creator manages own agreements; anyone with link can read `pending`; signers can read agreements they signed. Content and status are protected from tampering/rollback by DB triggers.

---

## 2. Test plan

### 2.1 Authentication

| # | Case | Steps | Expected |
|---|------|--------|----------|
| A1 | Unauthenticated access to protected route | Open `/dashboard` or `/create` without login | Redirect to `/login?redirectTo=...`. |
| A2 | GitHub login | Click “Sign in with GitHub” on `/login` | Redirect to GitHub; after auth, redirect to `redirectTo` or `/dashboard`. |
| A3 | Login when already logged in | Open `/login` while signed in | Redirect to `/dashboard` (or `redirectTo`). |
| A4 | Sign out | On dashboard, trigger sign out (e.g. logout button) | Session cleared; redirect to home. |
| A5 | Sign link → login → back to sign | Open `/sign/[id]`, click “Sign in to sign”, complete GitHub login | Return to same `/sign/[id]` and can sign. |

### 2.2 Create & publish

| # | Case | Steps | Expected |
|---|------|--------|----------|
| C1 | Create agreement (happy path) | Log in → Create → fill title + content → “Create & Publish” | Redirect to `/dashboard/[id]`; agreement status = pending; content_hash stored. |
| C2 | Validation | Submit with empty title or empty content | Error message; no redirect. |
| C3 | Share page content | On `/dashboard/[id]` for a pending agreement | Title and content shown; sign URL shown; QR code present; “Copy link” works. |

### 2.3 Sign flow

| # | Case | Steps | Expected |
|---|------|--------|----------|
| S1 | View pending agreement (signer) | Open sign link in incognito (different GitHub user or anon) | Agreement title and content visible; integrity check runs. |
| S2 | Integrity verified | Open sign link for an unmodified agreement | “Content integrity verified” (or equivalent) shown. |
| S3 | Sign when not logged in | Click “Sign in to sign” on sign page | Redirect to login with `redirectTo=/sign/[id]`; after login, back to sign page. |
| S4 | Sign when logged in | Log in as signer, open sign link, click “Sign this agreement” | Success state (“Signed successfully”); one row in `signatures`; agreement status = signed. |
| S5 | Double sign | Same user signs same agreement again (e.g. refresh and click again) | Error like “You have already signed”; no duplicate signature. |
| S6 | Tamper warning (optional) | Manually change `content` in DB for a pending agreement, reload sign page | Integrity check fails; tamper warning shown; sign button disabled or discouraged. |

### 2.4 Dashboard

| # | Case | Steps | Expected |
|---|------|--------|----------|
| D1 | Lists by status | Log in as creator with mixed agreements | Sections: Pending, Signed, Drafts; each agreement has title, status badge, date. |
| D2 | Open agreement detail | Click an agreement card | Navigate to `/dashboard/[id]`; correct title and content. |
| D3 | Share only for pending | Open detail for pending vs signed | Share block (link + QR) only when status = pending. |

### 2.5 Security & RLS

| # | Case | Steps | Expected |
|---|------|--------|----------|
| R1 | Creator sees only own agreements | Log in as A; create agreement; log in as B | B’s dashboard does not show A’s agreement. |
| R2 | Signer can read pending by link | User B opens A’s sign link (correct UUID) | B can load agreement and sign (no 403). |
| R3 | Sign link is unguessable | Open `/sign/[random-uuid]` with invalid UUID | 404 or empty, not server error. |

### 2.6 Regression / sanity

| # | Case | Steps | Expected |
|---|------|--------|----------|
| X1 | Home and navigation | Open `/` → Login → Dashboard → Back to home | Links work; no console errors. |
| X2 | Copy link | On share page, click “Copy link” | Clipboard contains full sign URL. |
| X3 | QR code | On share page | QR decodes to same sign URL. |

---

## 3. Test execution notes

- Run **Authentication** and **Create & publish** first; then **Sign flow** and **Dashboard**; finish with **Security & RLS** and **Regression**.
- For S6 (tamper), use Supabase SQL Editor to change `content` for one row and leave `content_hash` unchanged.
- For R1/R2, use two different GitHub accounts (or one normal + one incognito with another account).
