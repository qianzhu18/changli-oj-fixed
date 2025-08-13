# 智能题库系统 - Vercel 部署指南

## 🚀 快速部署

### 前置条件
- [x] GitHub 账户
- [x] Vercel 账户
- [x] Neon Postgres 数据库
- [x] Google Gemini API Key

## 📋 部署步骤

### Step 1: 准备 GitHub 仓库

1. **创建 GitHub 私有仓库**
   ```bash
   # 在 GitHub 上创建新的私有仓库：quiz-app
   ```

2. **推送代码到 GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/quiz-app.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: 配置 Vercel 项目

1. **连接 GitHub 仓库**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 选择 GitHub 仓库 `quiz-app`
   - Framework: `Next.js`
   - Root Directory: `study-app`

2. **配置环境变量**
   在 Vercel 项目设置中添加以下环境变量：

   ```bash
   # 数据库配置
   DATABASE_URL=postgresql://username:password@hostname.neon.tech:5432/quiz_db?sslmode=require
   
   # AI 配置
   AI_API_KEY=AIzaSyCdyP3JwJ_sBD5kMp9LROlm3HyT3ym1S1I
   AI_PROVIDER=gemini
   AI_MODEL=gemini-1.5-flash-8b
   
   # 认证配置
   NEXTAUTH_SECRET=your-random-secret-key-here
   NEXTAUTH_URL=https://your-app.vercel.app
   
   # 应用配置
   NODE_ENV=production
   ```

### Step 3: 数据库设置

1. **创建 Neon 数据库**
   - 参考 `scripts/setup-neon.md` 详细指南
   - 获取 PostgreSQL 连接字符串

2. **数据库迁移**
   ```bash
   # Vercel 部署时会自动运行
   npm run postinstall  # 生成 Prisma Client
   npm run db:push      # 推送 schema 到数据库
   ```

### Step 4: 部署验证

1. **首次部署**
   - Vercel 会自动触发部署
   - 等待构建完成（约 2-3 分钟）

2. **功能测试**
   ```bash
   # 测试 API Key 验证
   curl "https://your-app.vercel.app/api/ai/validate-key?apiKey=YOUR_API_KEY"
   
   # 测试题库解析
   curl -X POST "https://your-app.vercel.app/api/ai/parse-quiz" \
     -H "Content-Type: application/json" \
     -d '{"content":"测试题目","aiConfig":{"apiKey":"YOUR_API_KEY"}}'
   ```

## 🔧 配置详解

### 环境变量说明

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | Neon Postgres 连接字符串 | `postgresql://user:pass@host:5432/db` |
| `AI_API_KEY` | Google Gemini API 密钥 | `AIzaSy...` |
| `AI_PROVIDER` | AI 服务提供商 | `gemini` |
| `AI_MODEL` | AI 模型名称 | `gemini-1.5-flash-8b` |
| `NEXTAUTH_SECRET` | 认证密钥 | 随机生成的字符串 |
| `NEXTAUTH_URL` | 应用域名 | `https://your-app.vercel.app` |

### 构建配置

Vercel 会自动检测 Next.js 项目并使用以下配置：
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Root Directory**: `study-app`

## 🚨 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 检查依赖安装
   npm install
   
   # 本地构建测试
   npm run build
   ```

2. **数据库连接错误**
   ```bash
   # 验证连接字符串
   npx prisma db pull
   
   # 检查环境变量
   echo $DATABASE_URL
   ```

3. **API 调用失败**
   ```bash
   # 检查 API Key 有效性
   curl "https://your-app.vercel.app/api/ai/validate-key?apiKey=YOUR_KEY"
   ```

### 调试工具

1. **Vercel 日志**
   - 在 Vercel Dashboard 查看部署日志
   - 使用 `vercel logs` 命令查看运行时日志

2. **本地调试**
   ```bash
   # 使用生产环境变量本地测试
   vercel env pull .env.local
   npm run dev
   ```

## 📊 性能优化

### Serverless 函数优化
- API 超时时间：60 秒
- 内存限制：1024 MB
- 区域：Asia Pacific (Singapore)

### 缓存策略
- 静态资源：CDN 缓存
- API 响应：适当的 Cache-Control 头
- 数据库连接：连接池优化

## 🔒 安全配置

1. **环境变量安全**
   - 所有敏感信息使用 Vercel 环境变量
   - 不在代码中硬编码密钥

2. **API 安全**
   - 输入验证和清理
   - 速率限制（如需要）
   - CORS 配置

3. **数据库安全**
   - SSL 连接强制启用
   - 最小权限原则
   - 定期备份

## 📈 监控和维护

1. **性能监控**
   - Vercel Analytics
   - 错误追踪
   - 响应时间监控

2. **定期维护**
   - 依赖更新
   - 安全补丁
   - 数据库优化

---

## 🎯 部署检查清单

- [ ] GitHub 仓库创建并推送代码
- [ ] Vercel 项目配置完成
- [ ] Neon 数据库创建并连接
- [ ] 环境变量正确设置
- [ ] 首次部署成功
- [ ] API 功能验证通过
- [ ] 前端界面正常显示
- [ ] 题库生成功能正常

完成以上步骤后，您的智能题库系统就可以在 Vercel 上稳定运行了！
