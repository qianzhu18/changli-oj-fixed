#!/bin/bash

# 智能题库系统 - Vercel 部署脚本
# 用于自动化部署准备

set -e

echo "🚀 智能题库系统 - Vercel 部署准备"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要工具
check_tools() {
    echo -e "${BLUE}🔍 检查必要工具...${NC}"
    
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git 未安装${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 工具检查完成${NC}"
}

# 检查项目状态
check_project() {
    echo -e "${BLUE}📋 检查项目状态...${NC}"
    
    if [ ! -f "study-app/package.json" ]; then
        echo -e "${RED}❌ study-app/package.json 不存在${NC}"
        exit 1
    fi
    
    if [ ! -f "study-app/vercel.json" ]; then
        echo -e "${RED}❌ study-app/vercel.json 不存在${NC}"
        exit 1
    fi
    
    if [ ! -f "study-app/prisma/schema.prisma" ]; then
        echo -e "${RED}❌ Prisma schema 不存在${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 项目文件检查完成${NC}"
}

# 本地构建测试
test_build() {
    echo -e "${BLUE}🔧 执行本地构建测试...${NC}"
    
    cd study-app
    
    # 安装依赖
    echo "📦 安装依赖..."
    npm install
    
    # 生成 Prisma Client
    echo "🗄️ 生成 Prisma Client..."
    npx prisma generate
    
    # 构建项目
    echo "🏗️ 构建项目..."
    npm run build
    
    cd ..
    
    echo -e "${GREEN}✅ 本地构建测试通过${NC}"
}

# 提交代码
commit_changes() {
    echo -e "${BLUE}📝 提交最新更改...${NC}"
    
    git add .
    
    if git diff --staged --quiet; then
        echo -e "${YELLOW}⚠️ 没有新的更改需要提交${NC}"
    else
        git commit -m "feat: ready for production deployment

🚀 部署准备完成：
- 技术栈迁移完成 (Express → Next.js)
- Serverless 架构配置完成
- 生产环境优化完成
- 监控和健康检查就绪

📋 部署清单：
- [x] 代码构建测试通过
- [x] Vercel 配置完成
- [x] 环境变量模板准备
- [x] 部署文档完整
- [ ] GitHub 仓库推送
- [ ] Vercel 项目配置
- [ ] 生产数据库设置"
        
        echo -e "${GREEN}✅ 代码提交完成${NC}"
    fi
}

# 显示部署指南
show_deployment_guide() {
    echo -e "${BLUE}📚 部署指南${NC}"
    echo "=================================="
    echo ""
    echo -e "${YELLOW}接下来请手动完成以下步骤：${NC}"
    echo ""
    echo "1. 📁 创建 GitHub 私有仓库："
    echo "   - 访问: https://github.com/new"
    echo "   - 仓库名: quiz-app"
    echo "   - 设为私有仓库"
    echo ""
    echo "2. 📤 推送代码到 GitHub："
    echo "   git remote add origin https://github.com/YOUR_USERNAME/quiz-app.git"
    echo "   git push -u origin main"
    echo ""
    echo "3. 🗄️ 创建 Neon 数据库："
    echo "   - 访问: https://neon.tech"
    echo "   - 创建项目: quiz-app-production"
    echo "   - 获取连接字符串"
    echo ""
    echo "4. ☁️ 配置 Vercel 项目："
    echo "   - 访问: https://vercel.com"
    echo "   - 连接 GitHub 仓库"
    echo "   - Root Directory: study-app"
    echo "   - 设置环境变量"
    echo ""
    echo "5. 🔍 验证部署："
    echo "   - 访问: https://your-app.vercel.app/api/health"
    echo "   - 测试题库解析功能"
    echo ""
    echo -e "${GREEN}📖 详细步骤请参考: READY_TO_DEPLOY.md${NC}"
}

# 主函数
main() {
    echo "开始执行部署准备..."
    echo ""
    
    check_tools
    echo ""
    
    check_project
    echo ""
    
    test_build
    echo ""
    
    commit_changes
    echo ""
    
    show_deployment_guide
    echo ""
    
    echo -e "${GREEN}🎉 部署准备完成！${NC}"
    echo -e "${BLUE}💡 提示: 请按照上述指南完成手动部署步骤${NC}"
}

# 执行主函数
main
