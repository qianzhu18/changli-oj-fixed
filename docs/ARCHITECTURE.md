# 架构说明（单一技术路线）

## 目标

只保留一套可运行、可部署、可演示的 MVP 架构：

- 前端：`study-app/`（Next.js）
- 后端：`backend/`（Express + Prisma）
- 异步任务：BullMQ（Redis）
- 数据库：Supabase Postgres（不再使用本地 Postgres）
- AI：Gemini（可选；无 Key 时本地解析器兜底）

## 核心链路（MVP）

注册/登录 → 上传题库 → 入队解析 → Worker 生成 HTML → 题库列表 → 单页刷题

## 关键约定

- 认证：JWT（前端存 `localStorage.auth_token`；后端中间件 `backend/src/middleware/authV2.ts` 校验）
- 数据：Prisma Schema 位于 `backend/prisma/schema.prisma`
- 迁移：本地/部署均执行 `prisma migrate deploy`
- AI：解析在 Worker 中完成（`backend/src/workers/quizWorker.ts` → `backend/src/services/gemini.ts`）。配置了 `GEMINI_API_KEY` 则使用 Gemini，否则自动回退本地解析器生成 HTML。
