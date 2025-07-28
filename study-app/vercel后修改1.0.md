# 智能题库系统 – Vercel 部署后修改说明 v1.0

> 本文档面向负责继续接手本项目的 AI（Claude）。内容涵盖：
> 1. 当前项目进度与已完成事项
> 2. 现存关键问题与复现方式
> 3. 逐项解决方案（含代码文件路径）
> 4. 必需的 Vercel 与环境变量配置
> 5. 建议的后续优化方向

---

## 一、项目概览

| 模块 | 位置 | 技术栈 |
|------|------|--------|
| 前端 / API Routes | `quiz-app-clean/` (生产) / `study-app/` (墨隐侠踪主题) | Next.js 15 / React 19 / TypeScript / TailwindCSS |
| 数据库 | `prisma/` | PostgreSQL (Neon) + Prisma 6 |
| AI 服务 | `server/providers/GeminiProvider.ts` | Google Gemini |
| CI/CD | `.github/workflows/ci.yml` | GitHub Actions ▶ Vercel 自动部署 |

仓库根目录即为 Next.js 项目，无需再指定子目录。Vercel **Root Directory 留空即可**。

---

## 二、当前进度

1. **技术栈迁移完成** （Express ➜ Next.js API Routes，详见 `MIGRATION_COMPLETE.md`）
2. **CI/CD 流水线可用** （`M2_COMPLETION_REPORT.md`）
3. **Vercel 已成功构建前端** – 主页 & 开屏动画可访问
4. **Prisma 模型 / Neon 数据库创建完毕** – 但未执行 `migrate deploy`

---

## 三、已知问题与复现

| # | 问题 | 复现路径 | 日志表现 |
|---|------|---------|---------|
| 1 | **Gemini API Key 无法验证** | 主页 → API 配置弹窗「保存」 | Vercel Log: `405 Method Not Allowed` 或 `500 Validation failed` |
| 2 | **题库解析失败** | 智能解析页点击「开始解析」 | Log: `content is required` / `parse-quiz 400` |
| 3 | **用户注册 / 登录无后端实现** | 登录页提交表单 | 前端直接跳转 Dashboard，无实际鉴权 |
| 4 | **环境变量缺失或填错** | 调用 `/api/health` | `database: unhealthy` / `ai: unhealthy` |

---

## 四、逐项解决方案

### 4.1 修复 Gemini API Key 验证

- **症结**：前端使用 `POST /api/ai/validate-key`，而后端仅实现 `GET`。
- **简易修复 (前端)**：`components/api-key-dialog.tsx` 改为 GET 查询参数：
  ```ts
  const res = await fetch(`/api/ai/validate-key?apiKey=${apiKey.trim()}`)
  ```
- **推荐修复 (后端增强)**：在 `app/api/ai/validate-key/route.ts` 追加 `export async function POST()`，逻辑复用 GET。

### 4.2 修复题库解析接口

- **症结**：字段名不统一；文件上传分支遗漏 `aiConfig`。
- **后端** `app/api/ai/parse-quiz/route.ts`：允许 `content | fileContent`，并从 `aiConfig.apiKey` 提取 Key。
- **前端** `components/smart-parsing-page.tsx`：发送字段改为 `content`；FormData 同步调整。

### 4.3 实现用户注册 / 登录

1. **数据库**：`prisma/schema.prisma` 已含 `User` 表，无需变更。
2. **API Routes**（新增文件）：
   - `app/api/auth/register/route.ts` (POST)
   - `app/api/auth/login/route.ts` (POST)
   - `app/api/auth/me/route.ts`    (GET，需 JWT 鉴权)
3. **依赖**：`bcrypt` `jsonwebtoken` + 对应 @types。
4. **环境变量**：`JWT_SECRET` 随机 32+ 字符。
5. **前端**：
   - `InkWashLogin` 调用 `api.auth.login / register`（位于 `lib/api.ts`）。
   - 登录成功后 `ApiClient.setToken()` 已自动写入 `Authorization` header。

### 4.4 环境变量汇总

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon 连接串，必须带 `sslmode=require` |
| `GOOGLE_GEMINI_KEY` | （可选）全局默认 Gemini Key |
| `AI_PROVIDER` | 默认 `gemini` |
| `AI_MODEL` | 默认 `gemini-1.5-flash-8b` |
| `JWT_SECRET` | 鉴权用随机密钥 |

在 Vercel → **Settings / Environment Variables** 添加 / 更新后，点击 **Redeploy** 生效。

---

## 五、操作步骤（推荐流程）

1. **本地开发**
   ```bash
   cd quiz-app-clean
   npm i bcrypt jsonwebtoken @types/bcrypt @types/jsonwebtoken
   # 开发环境直接运行
   npm run dev
   ```
2. **实现并测试上述文件改动**（见 4.1~4.3）。
3. **Prisma 迁移（仅生产首次）**
   ```bash
   npx prisma migrate deploy --schema=prisma/schema.prisma
   ```
4. **提交代码到 GitHub ➜ Vercel 自动部署**
5. **验证**
   - `/api/health` 返回 `status: healthy`
   - `/api/ai/validate-key?apiKey=...` 返回 `valid: true`
   - 登录 / 注册正常获取 `token`
   - 智能解析可生成 HTML

---

## 六、后续优化建议

1. **提升测试覆盖率** – Jest 覆盖核心业务逻辑到 ≥60%（见 `M2_COMPLETION_REPORT.md`）
2. **E2E 测试** – Playwright 脚本验证用户流程和解析结果
3. **错误监控** – 集成 Sentry；API 层统一错误包装
4. **性能优化** – Prisma Accelerate / Edge Functions
5. **国际化** – i18n 支持，扩大用户群体

---

### 结语

以上为截至 2025-07-28 的完整进度与问题清单，按章节执行即可恢复后端功能并完成正式上线。如有新问题，请在 Vercel Logs 或 GitHub Actions 日志中搜索关键字并在此文档追加记录。祝一切顺利。
