# 本地启动与配置

## 推荐启动方式（当前可用基线）

当前默认采用：

- 前端：`study-app`（本地 Node）
- 后端：`backend`（本地 Node，直连 Supabase）
- Redis：Docker 容器
- 数据库：Supabase Postgres（不启本地 Postgres）

启动步骤：

```bash
# 1) 仅启动基础设施（Redis + 前端容器可选）
npm run docker:up

# 2) 启动后端（本地）
npm run dev:backend

# 3) 启动前端（本地）
npm run dev:frontend
```

访问：

- 前端（study-app）：`http://localhost:3002`
- 后端（API）：`http://localhost:3004`
- 健康检查：`http://localhost:3004/health`

停止：

```bash
npm run docker:down
```

## Supabase 数据库接入

后端使用 Prisma 连接 Supabase Postgres。配置 `backend/.env`：

```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?schema=public&sslmode=require
```

首次接入已有 Supabase 项目时，先执行一次引导脚本：

```bash
cd backend
npm run db:bootstrap:supabase
```

## Docker 说明（重要）

- `docker-compose.yml` 已移除本地 Postgres。
- `backend` 容器改为可选 profile（`--profile backend`），默认不启动。
- 在 Docker Desktop 场景下，`db.<PROJECT_REF>.supabase.co` 常见为 IPv6-only，容器可能无法直连；因此默认推荐“后端本地运行”。

## Gemini（可选）

- 不配置 `GEMINI_API_KEY`：自动回退本地解析器，仍可完成 TXT/MD 解析与 HTML 生成。
- 配置后：优先使用 Gemini 提升解析质量。
