#!/bin/bash

# 生产环境数据库迁移脚本
# 用于首次部署或更新数据库 schema

set -e

echo "🚀 开始生产环境数据库迁移..."

# 检查必要的环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: DATABASE_URL 环境变量未设置"
    exit 1
fi

echo "📊 数据库连接信息:"
echo "URL: ${DATABASE_URL:0:30}..."

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate

# 检查数据库连接
echo "🔍 检查数据库连接..."
npx prisma db pull --force || {
    echo "⚠️  数据库为空或无法连接，将推送 schema..."
    npx prisma db push --accept-data-loss
}

# 验证 schema
echo "✅ 验证数据库 schema..."
npx prisma validate

# 显示数据库状态
echo "📋 数据库表信息:"
npx prisma db pull --print

echo "🎉 数据库迁移完成!"
echo "💡 提示: 可以使用 'npx prisma studio' 查看数据库内容"
