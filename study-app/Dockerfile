# 前端 Dockerfile
FROM node:22-slim AS base

# 使用国内镜像降低依赖下载失败率
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

# 安装依赖阶段
FROM base AS deps
WORKDIR /app

# 复制package文件
COPY package*.json ./
RUN npm config set registry "$NPM_CONFIG_REGISTRY" \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --omit=dev --legacy-peer-deps

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建应用
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/public ./public

# 设置正确的权限
RUN mkdir .next
RUN chown node:node .next

# 复制构建产物
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3002

ENV PORT 3002
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
