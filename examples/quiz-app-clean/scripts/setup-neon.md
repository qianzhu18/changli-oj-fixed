# Neon Postgres 数据库设置指南

## 1. 创建 Neon 账户和数据库

### 步骤 1: 注册 Neon 账户
1. 访问 [https://neon.tech](https://neon.tech)
2. 点击 "Sign up" 注册账户
3. 可以使用 GitHub 账户快速注册

### 步骤 2: 创建新项目
1. 登录后点击 "Create Project"
2. 项目名称：`quiz-app-production`
3. 数据库名称：`quiz_db`
4. 区域选择：`Asia Pacific (Singapore)` (最接近中国)
5. Postgres 版本：选择最新版本

### 步骤 3: 获取连接字符串
创建完成后，Neon 会提供连接字符串，格式如下：
```
postgresql://username:password@hostname.neon.tech:5432/quiz_db?sslmode=require
```

## 2. 配置环境变量

### 本地开发环境
在 `.env` 文件中：
```bash
# 开发环境继续使用本地 Prisma Postgres
DATABASE_URL="prisma+postgres://localhost:51213/?api_key=..."
```

### Vercel 生产环境
在 Vercel 项目设置中添加环境变量：
```bash
DATABASE_URL="postgresql://username:password@hostname.neon.tech:5432/quiz_db?sslmode=require"
AI_API_KEY="AIzaSyCdyP3JwJ_sBD5kMp9LROlm3HyT3ym1S1I"
AI_PROVIDER="gemini"
AI_MODEL="gemini-1.5-flash-8b"
NEXTAUTH_SECRET="your-random-secret-key"
NEXTAUTH_URL="https://your-app.vercel.app"
```

## 3. 数据库迁移

### 首次部署
```bash
# 在 Vercel 部署时会自动运行
npm run postinstall  # 生成 Prisma Client
npm run db:push      # 推送 schema 到数据库
```

### 后续更新
```bash
# 本地测试迁移
npx prisma migrate dev --name init

# 生产环境部署
npm run db:migrate
```

## 4. 验证连接

### 本地测试生产数据库
```bash
# 临时设置生产数据库 URL
DATABASE_URL="postgresql://..." npx prisma studio
```

### 检查数据库状态
```bash
npx prisma db pull  # 从数据库拉取 schema
npx prisma validate # 验证 schema 有效性
```

## 5. 安全注意事项

1. **连接字符串安全**：
   - 不要在代码中硬编码数据库连接字符串
   - 使用 Vercel 环境变量管理敏感信息

2. **访问控制**：
   - Neon 默认启用 SSL 连接
   - 可以配置 IP 白名单（可选）

3. **备份策略**：
   - Neon 免费版提供 7 天备份
   - 重要数据建议定期导出

## 6. 免费额度限制

Neon 免费版限制：
- 存储：500 MB
- 计算时间：100 小时/月
- 连接数：100 并发连接

对于开发和小规模应用完全足够。

## 7. 故障排除

### 常见问题
1. **连接超时**：检查网络和防火墙设置
2. **SSL 错误**：确保连接字符串包含 `?sslmode=require`
3. **权限错误**：检查用户名和密码是否正确

### 调试命令
```bash
# 测试数据库连接
npx prisma db pull

# 查看生成的 SQL
npx prisma migrate diff --preview-feature
```
