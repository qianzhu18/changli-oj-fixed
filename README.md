# 智能题库系统（MVP）

目标：把题库文件快速变成可刷题的网页，并保留题库与解析结果。

## 架构（单一技术路线）

- 前端：`study-app/`（Next.js）
- 后端：`backend/`（Express + Prisma）
- 队列：BullMQ（Redis）
- 数据库：Postgres（本地 Docker / Supabase）
- AI：Gemini（可选；无 Key 自动回退本地解析器）

详细说明见：

- `产品复盘以及项目迁移.md`（唯一原始需求文档）
- `docs/ARCHITECTURE.md`
- `docs/SETUP.md`

## 启动方式（推荐）

```bash
# 1) 启动 Redis（和可选前端容器）
npm run docker:up

# 2) 启动后端（本地 Node，直连 Supabase）
npm run dev:backend

# 3) 启动前端（本地 Node）
npm run dev:frontend
```

访问：

- 前端：`http://localhost:3002`
- 后端：`http://localhost:3004`
- 后端健康检查：`http://localhost:3004/health`

停止 Docker 资源：

```bash
npm run docker:down
```

## Supabase 接入

后端只需要 `DATABASE_URL`（Supabase Postgres 连接串）。

示例：

```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?schema=public&sslmode=require
```

说明：

- 项目不再依赖本地 Postgres。
- `docker-compose.yml` 默认不启动后端容器（后端容器在 Docker Desktop 下可能受 Supabase IPv6 直连限制）。
- 首次接入已有 Supabase 项目后，执行：
  `cd backend && npm run db:bootstrap:supabase`
