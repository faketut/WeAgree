# MVP 测试检查清单

按 mvp.md §2–§3 顺序执行，本地和生产各跑一轮（生产至少一次）。通过打 ✅，不通过记现象并修完再补测。

---

## 1. Authentication (2.1)

| # | 用例 | 步骤 | 预期 | 本地 | 生产 |
|---|------|------|------|------|------|
| A1 | 未登录访问受保护路由 | 未登录打开 `/dashboard` 或 `/create` | 重定向到 `/login?redirectTo=...` | ☐ | ☐ |
| A2 | GitHub 登录 | 在 `/login` 点「Sign in with GitHub」 | 跳 GitHub → 授权后回到 `redirectTo` 或 `/dashboard` | ☐ | ☐ |
| A3 | 已登录时打开登录页 | 已登录状态下打开 `/login` | 重定向到 `/dashboard`（或 `redirectTo`） | ☐ | ☐ |
| A4 | 登出 | 在 Dashboard 点登出 | 会话清除；重定向到首页 | ☐ | ☐ |
| A5 | 签约页 → 登录 → 回签约页 | 打开 `/sign/[id]` → 点「Sign in to sign」→ 完成 GitHub 登录 | 回到同一 `/sign/[id]` 且可签约 | ☐ | ☐ |

---

## 2. Create & Publish (2.2)

| # | 用例 | 步骤 | 预期 | 本地 | 生产 |
|---|------|------|------|------|------|
| C1 | 创建协议（正常） | 登录 → Create → 填标题+内容 →「Create & Publish」 | 重定向到 `/dashboard/[id]`；status=pending；content_hash 已存 | ☐ | ☐ |
| C2 | 校验 | 提交空标题或空内容 | 报错提示，不跳转 | ☐ | ☐ |
| C3 | 分享页内容 | 在 `/dashboard/[id]` 查看 pending 协议 | 标题、内容、签约 URL、QR、Copy link 正常 | ☐ | ☐ |

---

## 3. Sign Flow (2.3)

| # | 用例 | 步骤 | 预期 | 本地 | 生产 |
|---|------|------|------|------|------|
| S1 | 签约者查看 pending 协议 | 隐身/另一账号打开签约链接 | 协议标题和内容可见；完整性校验执行 | ☐ | ☐ |
| S2 | 完整性通过 | 打开未篡改协议的签约链接 | 显示「Content integrity verified」等 | ☐ | ☐ |
| S3 | 未登录时签约 | 签约页点「Sign in to sign」 | 跳登录且 `redirectTo=/sign/[id]`；登录后回到签约页 | ☐ | ☐ |
| S4 | 已登录签约 | 已登录打开签约链接 → 点「Sign this agreement」 | 显示「Signed successfully」；signatures 一行；status=signed | ☐ | ☐ |
| S5 | 重复签约 | 同一用户对同一协议再点签约 | 提示「You have already signed」；无重复签名 | ☐ | ☐ |
| S6 | 篡改提示（可选） | 在 DB 改该协议 content、不改 content_hash，刷新签约页 | 完整性失败；篡改提示；签约按钮禁用或弱化 | ☐ | ☐ |

---

## 4. Dashboard (2.4)

| # | 用例 | 步骤 | 预期 | 本地 | 生产 |
|---|------|------|------|------|------|
| D1 | 按状态分组 | 登录为 creator，有 pending/signed/draft | 分区：Pending、Signed、Drafts；每项有标题、状态、日期 | ☐ | ☐ |
| D2 | 打开协议详情 | 点某协议卡片 | 进入 `/dashboard/[id]`；标题和内容正确 | ☐ | ☐ |
| D3 | 仅 pending 显示分享 | 分别打开 pending 与 signed 的详情 | 仅 pending 显示分享区块（链接+QR） | ☐ | ☐ |

---

## 5. Security & RLS (2.5)

| # | 用例 | 步骤 | 预期 | 本地 | 生产 |
|---|------|------|------|------|------|
| R1 | 仅看自己的协议 | 用户 A 创建协议；换用户 B 登录 | B 的 Dashboard 不显示 A 的协议 | ☐ | ☐ |
| R2 | 签约者通过链接可读 | 用户 B 打开 A 的签约链接（正确 UUID） | B 能加载协议并签约，无 403 | ☐ | ☐ |
| R3 | 签约链接不可猜 | 访问 `/sign/[随机错误 UUID]` | 404 或空，非 500 | ☐ | ☐ |

---

## 6. Regression / Sanity (2.6)

| # | 用例 | 步骤 | 预期 | 本地 | 生产 |
|---|------|------|------|------|------|
| X1 | 首页与导航 | `/` → Login → Dashboard → Back to home | 链接正常，无控制台报错 | ☐ | ☐ |
| X2 | 复制链接 | 分享页点「Copy link」 | 剪贴板为完整签约 URL | ☐ | ☐ |
| X3 | QR 码 | 分享页展示的 QR | 扫码解码为同一签约 URL | ☐ | ☐ |

---

## 备注

- **S6**：在 Supabase SQL Editor 中改 `agreements.content`，保持 `content_hash` 不变，再刷新签约页。
- **R1/R2**：用两个 GitHub 账号，或本机 + 隐身另一账号。
- 不通过项：在对应格写简短现象或单号，修完再打 ✅。
