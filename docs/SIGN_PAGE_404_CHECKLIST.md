# 签约页本地正常、生产 404 的排查清单

签约页会按顺序用两种方式拉取协议：

1. **RPC `get_agreement_for_signing`**（只用 publishable key，不依赖 secret key）
2. **Admin 客户端**（需要 `SUPABASE_SECRET_KEY`，绕过 RLS）

本地能打开、生产 404，说明在生产环境里**两种方式都没拿到数据**。按下面逐项检查。

---

## 1. 生产是否连的是「同一个」Supabase 项目？

- 本地：`.env.local` 里的 `NEXT_PUBLIC_SUPABASE_URL`
- 生产：Vercel 环境变量里的 `NEXT_PUBLIC_SUPABASE_URL`

两者必须**完全一致**（同一项目）。  
若生产指向另一个项目，而协议数据只在当前项目里，就会只有本地能打开、生产 404。

---

## 2. 生产库是否跑过迁移（含 RPC）？

RPC 依赖迁移里创建的函数和权限。

- 打开**生产用的**那个 Supabase 项目 → **SQL Editor**
- 执行：

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_agreement_for_signing';
```

- 若没有结果，说明**生产库没跑过包含该函数的迁移**。  
  解决：在生产库里执行 `supabase/migrations/001_initial_schema.sql`（或 `supabase db push` 指向生产）。

---

## 3. RPC 是否对 anon 开放？

签约链接可能是未登录用户打开的，会走 anon 权限。

在**生产** Supabase 的 SQL Editor 里执行：

```sql
SELECT has_function_privilege('anon', 'public.get_agreement_for_signing(uuid)', 'EXECUTE');
```

- 若为 `false`，执行：

```sql
GRANT EXECUTE ON FUNCTION public.get_agreement_for_signing(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_agreement_for_signing(uuid) TO authenticated;
```

---

## 4. 生产环境变量是否完整、正确？

在 Vercel → 项目 → Settings → Environment Variables，确认**生产**环境有：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 生产用 Supabase 项目 URL，无尾部斜杠，如 `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 或 `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 该项目的 publishable/anon key |
| `SUPABASE_SECRET_KEY` 或 `SUPABASE_SERVICE_ROLE_KEY` | 可选，用于 RPC 失败时的 admin 兜底 |

改完环境变量后需要**重新部署**一次。

---

## 5. 协议是否真的在生产库里且可被 RPC 查到？

在生产 Supabase 的 SQL Editor 里：

```sql
SELECT id, status
FROM public.agreements
WHERE id = '4bd5a67d-51c0-4f4b-affa-1e33397d574c';
```

- 若没有行：协议不在**生产**库里（例如只在本地库），生产签约链接会 404。
- 若有行但 `status` 不是 `pending` 或 `signed`：RPC 按设计只返回这两种状态，也会表现为 404。

再直接测 RPC（生产库）：

```sql
SELECT * FROM get_agreement_for_signing('4bd5a67d-51c0-4f4b-affa-1e33397d574c'::uuid);
```

- 若这里能查到一行，但线上仍 404，多半是**环境变量或部署**（见上面 1、4）问题。

---

## 代码上的改动（已做）

签约页已改为**先调 RPC，再兜底 admin**。这样只要生产库里有 RPC 且对 anon 授权，即使用户未登录、或没配 secret key，也有机会打开签约页。  
若 RPC 在生产库不存在或未授权，就会继续 404，需要按上面 2、3 处理。
