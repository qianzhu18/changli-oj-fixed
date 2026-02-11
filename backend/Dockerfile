# 使用官方 Node.js 运行时作为基础镜像
FROM node:22-slim AS base

# 设置工作目录
WORKDIR /app

# 安装 OpenSSL 以避免 Prisma 检测失败
RUN apt-get update -y && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

# 构建阶段
FROM base AS builder

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm install --legacy-peer-deps

# 复制所有文件
COPY tsconfig.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

# 生成Prisma客户端
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 移除开发依赖，便于运行阶段复用
RUN npm prune --omit=dev

# 生产阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 使用内置 node 用户，避免额外系统依赖

# 复制 package.json 和 schema
COPY package*.json ./
COPY prisma/ ./prisma/

# 复制依赖与构建产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# 生成Prisma客户端（使用已安装依赖，无需网络）
RUN npx prisma generate

# 创建必要的目录
RUN mkdir -p /app/logs /app/uploads /app/data && \
    chown -R node:node /app/logs /app/uploads /app/data

# 切换到非 root 用户
USER node

# 暴露端口
EXPOSE 3004

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# 启动前执行迁移，确保 SQLite/Postgres 表结构存在（幂等）
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app-v2.js"]
