# Google Gemini API 本地与服务器端完整配置 / 排障手册（v2）
> 更新时间：2025-07-25  
> 适用环境：macOS + Node 18 + Express (本地开发)  
> 针对日志中出现的 **模型 404 / generateContent TS 报错 / 端口占用 / Nodemailer EAUTH / Mongo & Redis 连接失败** 等多重问题，给出**最小可行**的修复流程。  
> **目标**：启动一个 _仅依赖 Gemini API_ 的精简后端，先跑通 `validate-key` / `parse-quiz`，其余功能后续再逐步恢复。

---
## 🗺️ 总览
| 分类 | 症状 | 根因 | 修复优先级 |
| --- | --- | --- | --- |
| **P0** | `404 models/gemini-x` / `GoogleGenerativeAIError` | 使用了 **付费专属 / 预览** 模型；免费 key 不支持 | ★★★★☆ |
| **P0** | `TS2339: generateContent` 编译失败 | IAiProvider 无此方法；测试用辅助函数仍引用 | ★★★★☆ |
| **P0** | `EADDRINUSE 3001` | 进程异常退出后端口未释放 | ★★★☆☆ |
| **P1** | `EAUTH 535` (Nodemailer) | `.env` 中 SMTP 凭证无效 | ★★☆☆☆ |
| **P1** | `ECONNREFUSED 127.0.0.1:27017` | 本地未启动 MongoDB | ★★☆☆☆ |
| **P1** | `redisClient.setex is not a function` | 升级到 @redis/client v4，API 变更 | ★★☆☆☆ |
| **P2** | `Duplicate schema index` 警告 | Mongoose index 重复定义 | ★☆☆☆☆ |

---
## 🔧 步骤化修复方案（本地）
### Step 0 ⚠️ 一次性停止所有进程
```bash
# 终止占用 3001 的旧进程
tl -i :3001 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null || true
# 停止 pnpm / npm 并关掉 nodemon, next dev 等
pkill -f "npm run dev" || true
```

### Step 1 ✅ 锁定**可免费使用**的 Gemini 模型
1. 临时脚本列出模型：
   ```bash
   node -e "const k='YOUR_KEY';fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':k}}).then(r=>r.json()).then(d=>console.log(d.models.map(m=>m.name)))"
   ```
2. 在 2025-07 免费 key 通常 **仅允许**：
   - `gemini-pro`  _(主力)_  
   - `gemini-pro-vision`  _(图片)_  
   - `gemini-1.5-flash`  _(快速)_
3. 选用 `gemini-pro`（稳定） 或 `gemini-1.5-flash`，**不要**写 `-latest / -preview / 2.x`。
4. 修改统一默认：
   * `backend/src/config/settings.ts`
   * `backend/src/providers/GeminiProvider.ts`
   * `backend/src/providers/AiProviderFactory.ts`
   将 `'gemini-*'` 全部替换为 `gemini-pro`。

### Step 2 ✅ 修复 TypeScript 编译
1. 错误位置：`aiController-v2.ts` line ≈400 仍调用 `generateContent`。
2. 改为：
   ```ts
   const result = await provider.generateQuizHtml({ ... });
   ```
3. 同理，`aiService.ts`, `utils/configValidator.ts`, **测试文件** `services/__tests__/gemini.spec.ts` 中也需要替换或移除测试桩。
4. 重新 `npx tsc --noEmit`，确保零错误。

### Step 3 ✅ 临时关闭 **可选外部服务**（邮件 / DB / Redis）
在 `.env.development` 追加：
```env
# 跳过 Nodemailer
EMAIL_DISABLED=true
# 跳过 Mongo (用内存)
MONGO_DISABLED=true
# 跳过 Redis
REDIS_DISABLED=true
```
并在对应 `emailService.ts`、`database.ts`、`queue.ts` 中加守卫：`if (process.env.EMAIL_DISABLED==='true') return;`
> **目的**：先保证后端不崩溃，只跑核心 AI 路由。

### Step 4 ✅ 修复 Redis v4 API 变更
如果后续要启用 Redis，将 `redisClient.setex` ➜ `redisClient.setEx`，`get`/`del` 均使用 **await**。

### Step 5 ✅ 新增 NPM 脚本，拆分前后端
`backend/package.json`
```json
"scripts": {
  "dev": "nodemon --exec ts-node -r tsconfig-paths/register src/index.ts",
  "dev:api": "npm run --workspace backend dev",
  "dev:ui": "npm run --workspace study-app dev"
}
```
最小化启动：
```bash
npm run dev:api
```

### Step 6 ✅ 验证
```bash
# 1. 后端
curl -s "http://localhost:3001/health" && echo OK
# 2. Key 验证
curl -s "http://localhost:3001/api/v2/ai/validate-key?apiKey=YOUR_KEY" | jq
# 3. 解析
curl -s -X POST http://localhost:3001/api/v2/ai/parse-quiz \
  -H 'Content-Type: application/json' \
  -d '{"content":"1. JS 是什么语言?\nA. 脚本\n答案:A","aiConfig":{"apiKey":"YOUR_KEY","provider":"gemini","model":"gemini-pro"}}' | jq
```
预期返回 `success: true` 且含 `html`。

---
## 🛠️ 常见错误对照表
| 日志关键字 | 含义 | 立即处理 |
| ---------- | ---- | -------- |
| `404 models/...` | 模型名错误 / 不支持 | 按 **Step 1** 换成 `gemini-pro` |
| `TS2339 generateContent` | 调用不存在方法 | 按 **Step 2** 修改为 `generateQuizHtml` |
| `EAUTH 535` | 邮件登录失败 | 暂时 `EMAIL_DISABLED=true` |
| `ECONNREFUSED 27017` | Mongo 未启动 | `MONGO_DISABLED=true` 或 `brew services start mongodb-community@6.0` |
| `setex is not a function` | Redis v4 API 变更 | 改用 `setEx` 或锁定 `redis@3` |
| `EADDRINUSE 3001` | 端口被占 | `lsof -i :3001 | awk '{print $2}' | xargs kill -9` |

---
## 🚀 下一步（服务器部署）
1. **Docker**：编写 `docker-compose.yml` 启动 Mongo、Redis、backend、frontend。
2. **生产模型**：若购买了付费套餐，再改回 `gemini-2.5-pro`。
3. **开启邮件**：配置真实 SMTP (`smtp.qq.com`, `app password`)。
4. **启用缓存**：升级 Redis API + Sentinel 高可用。

---
## ✅ Checklist
- [ ] 修改所有默认模型为 `gemini-pro`
- [ ] 修复所有 `generateContent` 引用
- [ ] `.env.development` 加入 *DISABLED* 开关
- [ ] `npm run dev:api` 启动成功且无崩溃
- [ ] `validate-key` 与 `parse-quiz` 均返回 200

完成以上步骤后，再逐个打开 Email / Mongo / Redis 即可。

---
> **备注**：如需进一步自动化，请让 Claude 逐条执行本手册中的 shell 命令并提交对应代码改动。
