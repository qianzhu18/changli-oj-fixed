# 开发规格（DevSpec）- 客户端（study-app）

## 1. 当前版本定位

- 文档版本：v2.0（2026-02-11）
- 目标：用现有 `study-app` 前端打通 MVP 闭环，不再追求一次性做完 V2 功能
- 技术路线：`study-app`（Next.js）+ `backend`（Express/Prisma）+ Supabase Postgres + Redis

MVP 闭环：注册/登录 → 上传题库（TXT/MD）→ 解析任务轮询 → 生成 HTML → 历史题库查看/预览

## 2. 页面与模块

### 2.1 登录/注册页（`components/ink-wash-login.tsx`）

功能要求：
- 支持邮箱注册：`POST /api/auth/register`
- 支持邮箱登录：`POST /api/auth/login`
- 成功后将 token 存入 `localStorage.auth_token`
- 失败时显示后端返回的可读错误（不再统一显示“服务器内部错误”）

字段规则：
- 邮箱：合法邮箱格式
- 密码：至少 6 位
- 注册确认密码：前端校验一致

### 2.2 主控制台（`components/main-dashboard.tsx`）

功能要求：
- 登录后进入主面板
- 支持切换“智能解析”“题库库”视图
- 退出登录后清理本地 token 并回到登录页

### 2.3 智能解析页（`components/smart-parsing-page.tsx`）

功能要求：
- 支持文件上传（优先 TXT/MD，其他格式后续逐步恢复）
- 支持粘贴文本提交流程
- 上传接口：`POST /api/upload` 或 `POST /api/upload/text`
- 轮询任务接口：`GET /api/job/:id`
- 拉取题库详情：`GET /api/quiz/:id`
- 解析成功后显示 HTML 预览

鉴权要求：
- 所有上传/任务/题库接口必须携带 `Authorization: Bearer <token>`
- 未登录状态下禁止提交解析

### 2.4 题库库页（`components/quiz-library.tsx`）

功能要求：
- 获取当前用户题库列表：`GET /api/quiz`
- 支持查看状态（pending/processing/completed/failed）
- 支持删除题库：`DELETE /api/quiz/:id`
- 对 completed 题库支持预览与下载 HTML

## 3. 接口契约（客户端依赖）

### 3.1 Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

返回格式：
```json
{
  "success": true,
  "message": "...",
  "data": {
    "user": { "id": "...", "email": "..." },
    "token": "..."
  }
}
```

### 3.2 Upload / Job / Quiz
- `POST /api/upload`
- `POST /api/upload/text`
- `GET /api/job/:id`
- `GET /api/quiz/:id`
- `GET /api/quiz`
- `DELETE /api/quiz/:id`

## 4. 环境变量（客户端）

必须：
- `NEXT_PUBLIC_API_URL=http://localhost:3004`

可选（当前前端未直连 Supabase，可先保留）：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

## 5. 验收标准（MVP）

1. 新用户可以成功注册并自动登录进入主界面。
2. 已注册用户可登录，错误密码返回明确提示。
3. 上传 TXT/MD 后能拿到 job 并轮询到 `completed`。
4. 生成 HTML 可在前端预览并下载。
5. 题库库能看到历史记录并执行删除。

## 6. 明确不在本轮范围

- 错题本
- 学习进度统计
- AI 追问对话
- 多角色权限与完整管理后台

以上能力全部放入后续迭代，不得阻塞 MVP 上线。
