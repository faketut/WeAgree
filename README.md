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

3. Run the database migration:

   - In Supabase: **SQL Editor** → New query → paste contents of `supabase/migrations/001_initial_schema.sql` → Run.

   Or with Supabase CLI:

   ```bash
   supabase db push
   ```

### 3. Set up Authing (GitHub 登录)

1. 在 [GitHub Developer Settings](https://github.com/settings/developers) 创建 OAuth App，获取 **Client ID** 和 **Client Secret**。Authorization callback URL 填 Authing 提供的回调地址（或在 Authing 控制台查看）。
2. 在 [Authing 控制台](https://console.authing.cn) → **社会化登录** → **GitHub**，填入 Client ID、Client Secret 及回调配置。
3. 在 **应用** 中获取应用的 **应用 ID**，填入 `.env.local`：`NEXT_PUBLIC_AUTHING_APP_ID=你的应用ID`
4. 在应用的 **注册登录** → **社会化登录** 中开启「GitHub」并保存。

**若出现「core.authing.cn is currently unable to handle the login request: HTTP ERROR 500」**：多为 Authing 端或配置问题。请确认：① 控制台 GitHub 社会化登录已开启且 Client ID/Secret 正确；② GitHub OAuth App 的 Authorization callback URL 与 Authing 提供的完全一致；③ 稍后重试或联系 [Authing 支持](https://forum.authing.cn/)。

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login: [http://localhost:3000/login](http://localhost:3000/login)（GitHub 登录）.

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

- **Auth:** [Authing](https://authing.cn) GitHub 登录（弹窗模式）；登录态存于 `authing_session` Cookie。Middleware 保护 `/dashboard`、`/create` 等，未登录跳转 `/login`。
- **Create agreement:** Editor with optional `{{Name}}` / `{{Date}}` variables; system computes content hash and stores with status `pending`; QR code links to `/sign/[id]`.
- **Sign:** `/sign/[id]` shows agreement, verifies hash, records signature and updates agreement to `signed`.
- **Dashboard:** Tabs for My Drafts, Pending Signatures, Signed by Me.

## License

Private / use as needed.
