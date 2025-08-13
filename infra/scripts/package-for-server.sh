#!/bin/bash

# 🚀 智能题库系统打包脚本
# 用于创建部署包，上传到服务器后一键部署

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 创建打包目录
PACKAGE_DIR="quiz-system-deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="quiz-system-${TIMESTAMP}.tar.gz"

log_info "开始创建部署包..."

# 清理之前的打包目录
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# 复制必要文件
log_info "复制项目文件..."

# 复制 Docker 配置文件
cp docker-compose.yml $PACKAGE_DIR/
cp Dockerfile $PACKAGE_DIR/
cp -r nginx $PACKAGE_DIR/

# 复制后端文件
cp -r backend $PACKAGE_DIR/
# 清理后端不需要的文件
rm -rf $PACKAGE_DIR/backend/node_modules
rm -rf $PACKAGE_DIR/backend/dist
rm -rf $PACKAGE_DIR/backend/logs/*
rm -rf $PACKAGE_DIR/backend/uploads/*

# 复制前端文件
cp -r study-app $PACKAGE_DIR/
# 清理前端不需要的文件
rm -rf $PACKAGE_DIR/study-app/node_modules
rm -rf $PACKAGE_DIR/study-app/.next
rm -rf $PACKAGE_DIR/study-app/pnpm-lock.yaml

# 复制部署脚本和配置
cp deploy.sh $PACKAGE_DIR/
cp .env.example $PACKAGE_DIR/
cp DOCKER_DEPLOYMENT.md $PACKAGE_DIR/

# 创建服务器端自动部署脚本
cat > $PACKAGE_DIR/server-deploy.sh << 'EOF'
#!/bin/bash

# 🚀 服务器端自动部署脚本
# 在服务器上解压后直接运行此脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "🚀 智能题库系统服务器端部署"
echo "================================"

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then
    log_warning "检测到您是 root 用户，建议使用普通用户部署"
fi

# 检查系统
log_info "检查系统环境..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    log_info "操作系统: $NAME $VERSION"
else
    log_error "无法检测操作系统版本"
    exit 1
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
    log_info "安装 Docker..."
    
    # 更新系统
    sudo apt update
    
    # 安装 Docker
    curl -fsSL https://get.docker.com | sh
    
    # 添加用户到 docker 组
    sudo usermod -aG docker $USER
    
    # 启动 Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    log_success "Docker 安装完成"
else
    log_success "Docker 已安装"
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_info "安装 Docker Compose..."
    
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    log_success "Docker Compose 安装完成"
else
    log_success "Docker Compose 已安装"
fi

# 配置环境变量
if [ ! -f .env ]; then
    log_info "创建环境配置文件..."
    cp .env.example .env
    
    # 生成随机密钥
    JWT_SECRET=$(openssl rand -hex 32)
    MONGO_PASSWORD=$(openssl rand -hex 16)
    REDIS_PASSWORD=$(openssl rand -hex 16)
    
    # 替换配置
    sed -i "s/change-this-to-a-secure-random-string/$JWT_SECRET/" .env
    sed -i "s/your-mongodb-password/$MONGO_PASSWORD/g" .env
    sed -i "s/your-redis-password/$REDIS_PASSWORD/g" .env
    
    log_warning "请编辑 .env 文件，填入您的 Gemini API Key:"
    log_info "nano .env"
    log_info "找到 AI_API_KEY=your-gemini-api-key-here 这一行"
    log_info "替换为您的实际 API Key"
    echo
    read -p "按回车键继续，或按 Ctrl+C 退出去配置 API Key..."
fi

# 创建必要目录
mkdir -p backend/logs backend/uploads mongo-init

# 检查防火墙
log_info "配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22   # SSH
    sudo ufw allow 80   # HTTP
    sudo ufw allow 443  # HTTPS
    sudo ufw --force enable
    log_success "防火墙配置完成"
fi

# 执行部署
log_info "开始部署服务..."
chmod +x deploy.sh

# 检查是否需要重新登录以应用 docker 组权限
if ! docker ps &> /dev/null; then
    log_warning "需要重新登录以应用 Docker 权限"
    log_info "请执行以下命令："
    echo "newgrp docker"
    echo "./deploy.sh start prod"
    exit 0
fi

# 直接部署
./deploy.sh start prod

log_success "🎉 部署完成！"
echo
echo "访问地址："
echo "- 主应用: http://$(curl -s ifconfig.me)"
echo "- 前端: http://$(curl -s ifconfig.me):3000"
echo "- 后端: http://$(curl -s ifconfig.me):3001"
echo
echo "管理命令："
echo "- 查看状态: ./deploy.sh status"
echo "- 查看日志: ./deploy.sh logs"
echo "- 停止服务: ./deploy.sh stop"
EOF

chmod +x $PACKAGE_DIR/server-deploy.sh

# 创建 README 文件
cat > $PACKAGE_DIR/README.md << 'EOF'
# 智能题库系统 - 服务器部署包

## 🚀 快速部署

1. **上传并解压**：
   ```bash
   tar -xzf quiz-system-*.tar.gz
   cd quiz-system-deploy
   ```

2. **配置 API Key**：
   ```bash
   cp .env.example .env
   nano .env  # 编辑 AI_API_KEY
   ```

3. **一键部署**：
   ```bash
   chmod +x server-deploy.sh
   ./server-deploy.sh
   ```

## 📋 包含文件

- `server-deploy.sh` - 服务器端自动部署脚本
- `deploy.sh` - 项目部署管理脚本
- `docker-compose.yml` - Docker 服务编排
- `backend/` - 后端源码
- `study-app/` - 前端源码
- `nginx/` - Nginx 配置
- `.env.example` - 环境变量模板

## 🔑 获取 Gemini API Key

访问：https://aistudio.google.com/app/apikey

## 📞 支持

如遇问题，查看日志：`./deploy.sh logs`
EOF

# 打包
log_info "创建压缩包..."
tar -czf $PACKAGE_NAME $PACKAGE_DIR

# 清理临时目录
rm -rf $PACKAGE_DIR

# 计算文件大小
SIZE=$(du -h $PACKAGE_NAME | cut -f1)

log_success "打包完成！"
echo
echo "📦 部署包信息："
echo "  文件名: $PACKAGE_NAME"
echo "  大小: $SIZE"
echo "  位置: $(pwd)/$PACKAGE_NAME"
echo
echo "🚀 上传到服务器后执行："
echo "  tar -xzf $PACKAGE_NAME"
echo "  cd quiz-system-deploy"
echo "  ./server-deploy.sh"
echo