# Changli OJ × MiaowTest DevSpec（启动版）

更新时间：2026-03-01
适用仓库：`/Users/mac/Downloads/code/changli-oj-fixed/MiaowTest`

## 1. 改造策略
采用“双轨迁移”：
1. 保留 `uniappAPI/*` 保障现有端能力。
2. 新增 `api/v1/*` 承载 Web First 与后续多端统一。
3. 所有新增能力优先写在 v1，再逐步回收旧路由。

## 2. 当前已落地（M0）

### 2.1 安全与认证
1. 新增密码工具：`node/helpers/passwordHelper.js`
2. 用户注册/登录：改为 bcrypt 哈希 + 明文兼容升级
3. 后台管理员登录/创建：改为 bcrypt 哈希 + 明文兼容升级
4. 初始化脚本：`init-database.js` 创建管理员时写入哈希密码

### 2.2 Web First API 基线
1. 新增路由：`node/routes/web/V1Router.js`
2. 新增控制器：`node/controllers/web/V1Controller.js`
3. 在 `node/app.js` 注册路由
4. 已开放接口：
   - `POST /api/v1/auth/register`
   - `POST /api/v1/auth/login`
   - `GET /api/v1/auth/me`
   - `GET /api/v1/quizzes`
   - `GET /api/v1/quizzes/hot`
   - `GET /api/v1/quizzes/:id/types`

## 3. 二改实施清单（M1-M3）

### M1（1 周）
1. v1 统一响应体（code/success/message/data）
2. v1 错误码标准化
3. 登录、注册、题库浏览冒烟测试脚本

### M2（1-2 周）
1. 新增 `progress` 与 `wrong-questions` 的 v1 接口
2. 后台题库发布态与前台可见性校验
3. 补齐导入任务状态查询接口（最小版）

### M3（1-2 周）
1. H5 页面全面切到 `api/v1`
2. 老接口调用点收敛并建立迁移映射表
3. 线上灰度：老接口与新接口并行观测

## 4. 爆改实施清单（M4+）

### M4（2-3 周）
1. 领域模块拆分：auth/quiz/learning/import/admin
2. Service 层去控制器耦合，统一 DTO

### M5（2-3 周）
1. 导入流水线：sync-clean-validate-import-publish
2. BullMQ + Redis 接入
3. 失败回放与部分重试

### M6（2-3 周）
1. 可观测性：请求日志、任务日志、关键指标
2. 权限细化：RBAC + 审计日志
3. AI explain 网关（缓存优先）

## 5. 需求台账（Requirements Ledger）

| 功能 | 用户故事 | 验收标准 | 影响模块 | 阶段 |
|---|---|---|---|---|
| Web 注册登录 | 作为学生，我想网页直接登录刷题 | `api/v1/auth/*` 可用，老账号可登录 | `services/user` `routes/web` | M0 |
| 密码安全 | 作为系统，我要避免明文密码风险 | 新密码哈希存储，老密码自动升级 | `helpers/passwordHelper` `services/*/UserService` | M0 |
| 题库浏览 | 作为学生，我想在网页浏览题库 | `api/v1/quizzes` 返回发布题库列表 | `controllers/web/V1Controller` `services/user/ExamService` | M0 |
| 进度闭环 | 作为学生，我想继续上次练习 | v1 进度接口可查可写 | `services/user/ExamService` 新 v1 路由 | M2 |
| 导入任务可观测 | 作为运营，我想看到导入状态 | 有任务状态与失败明细 | import 任务模块（新增） | M2-M5 |
| 多端统一 | 作为团队，我想维护一套核心 API | H5/小程序共用 v1，旧接口逐步下线 | 路由层 + 前端 API 层 | M3+ |

## 6. 回滚与兼容策略
1. 任何 v1 回归问题可临时回切 `uniappAPI`。
2. 密码升级是惰性升级，不依赖全量脚本，不阻塞发布。
3. 不删除旧字段/旧路由，待观测稳定后再下线。

## 7. 下一批立即执行任务（本周）
1. 完成 v1 的 `progress` / `wrong-questions` 接口。
2. 给 `api/v1/auth/*` 加基本限流。
3. 补 6 条 API 冒烟脚本（注册、登录、me、quizzes、hot、types）。
