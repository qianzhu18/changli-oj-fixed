# PRD（MVP 摘要版）

本文件用于补充工程落地信息。产品“唯一原始需求文档”以 `产品复盘以及项目迁移.md` 为准。

## 核心使命
帮助驾考与各类突击考试的自学者，将杂乱题库快速转换成可持续刷题的高质量网页体验，并记录解析与学习历程。

## MVP 功能闭环
1. 邮箱注册/登录（JWT 会话）。
2. 上传题库（MVP 先支持 TXT/MD；后端文件解析已支持 docx/xlsx/pdf/csv 等，但可按产品节奏逐步开放）。
3. BullMQ 队列 + Worker 异步解析并生成 HTML。
4. 前端轮询任务状态，展示进度与失败原因。
5. 题库列表与单页刷题（HTML iframe/预览）。

## 关键业务规则
1. 每次上传创建 `quiz` + `job`，状态流转：`pending → processing → completed/failed`。
2. Worker 失败必须写入 `job.error` 并标记 `quiz.status=failed`。
3. 仅登录用户可上传/刷题。

## 数据契约（当前实现）
- `users(id, email, password, name, isActive, createdAt, updatedAt)`
- `quizzes(id, userId, title, description, orderMode, status, html, filePath, errorMsg, createdAt, updatedAt)`
- `jobs(id, userId, quizId, type, status, progress, data, result, error, createdAt, updatedAt)`

## 关键代码入口
- 后端入口：`backend/src/app-v2.ts`
- 认证路由：`backend/src/routes/v2/auth.ts`
- 上传入队：`backend/src/routes/v2/upload.ts`
- Worker：`backend/src/workers/quizWorker.ts`
- HTML 生成（可选 Gemini，默认本地兜底）：`backend/src/services/gemini.ts`
- 前端登录注册 UI：`study-app/components/ink-wash-login.tsx`
