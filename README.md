# Secure Digital Agreement Platform

A micro-SaaS web app for creating, editing, and digitally signing agreements with **trust and immutability**. Create agreements, bind identity via social login, generate a QR code for others to scan and sign. Signed content cannot be tampered with.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn/UI
- **Backend & DB:** Supabase (PostgreSQL, Auth, Storage)
- **Icons:** Lucide React
- **QR Code:** qrcode.react

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [Supabase](https://app.supabase.com).
2. Copy `.env.example` to `.env.local` and fill in:

   - `NEXT_PUBLIC_SUPABASE_URL` – Project URL (Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anon/public key (Settings → API)

3. Enable GitHub login: In **Supabase** → **Authentication → Providers → GitHub**, add your GitHub OAuth app **Client ID** and **Client Secret**. In **Authentication → URL Configuration**, add your app’s callback to **Redirect URLs** (e.g. `https://we-agree.vercel.app/auth/callback` and `http://localhost:3000/auth/callback` for local dev). In your **GitHub OAuth app** settings, set the **Authorization callback URL** to the value Supabase shows (e.g. `https://<project-ref>.supabase.co/auth/v1/callback`).

4. Run the database migration:

   - In Supabase: **SQL Editor** → New query → paste contents of `supabase/migrations/001_initial_schema.sql` → Run.

   Or with Supabase CLI:

   ```bash
   supabase db push
   ```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

- `app/` – Next.js App Router pages and layouts
- `components/` – React components (including `ui/` for Shadcn)
- `lib/` – Supabase client, utils
- `supabase/migrations/` – SQL schema and migrations

## Database Schema (Summary)

- **profiles** – Extends `auth.users`; RLS: users read/update own profile
- **templates** – User-owned agreement templates; RLS: own templates only
- **agreements** – Title, content, SHA-256 `content_hash`, status (`draft` | `pending` | `signed` | `voided`). Content and hash are immutable once status is `pending` or `signed`
- **signatures** – One row per signer per agreement; unique `(agreement_id, signer_id)`

## Core Flows

- **Auth:** Supabase Auth with **GitHub OAuth**. Login page `/login` → “Sign in with GitHub” → redirects to GitHub then back to `/auth/callback`, which exchanges the code for a session. Middleware protects `/dashboard`, `/create`, etc.
- **Create agreement:** Editor with optional `{{Name}}` / `{{Date}}` variables; system computes content hash and stores with status `pending`; QR code links to `/sign/[id]`.
- **Sign:** `/sign/[id]` shows agreement, verifies hash, records signature and updates agreement to `signed`.
- **Dashboard:** Tabs for My Drafts, Pending Signatures, Signed by Me.

## License

Private / use as needed.
