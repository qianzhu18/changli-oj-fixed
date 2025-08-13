# 🚀 智能题库系统 - Docker 一键部署指南

## 📋 部署前准备

### 系统要求
- **操作系统**: Linux/macOS/Windows (支持Docker)
- **内存**: 最低 4GB，推荐 8GB
- **磁盘空间**: 最低 10GB 可用空间
- **网络**: 稳定的互联网连接

### 必需软件
- Docker (版本 20.10+)
- Docker Compose (版本 2.0+)

## 🛠️ 安装 Docker 和 Docker Compose

### Ubuntu/Debian
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker
```

### CentOS/RHEL
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### macOS
```bash
# 使用 Homebrew
brew install docker docker-compose

# 或下载 Docker Desktop
# https://www.docker.com/products/docker-desktop/
```

## 🚀 一键部署步骤

### 1. 克隆项目
```bash
git clone <your-repository-url> quiz-system
cd quiz-system
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用你喜欢的编辑器
```

**重要配置项**:
- `AI_API_KEY`: 填入你的 Gemini API Key ([获取地址](https://aistudio.google.com/app/apikey))
- `JWT_SECRET`: 生成一个安全的随机字符串
- `MONGO_INITDB_ROOT_PASSWORD`: 设置 MongoDB 密码
- `REDIS_PASSWORD`: 设置 Redis 密码

### 3. 执行一键部署
```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 启动生产环境
./deploy.sh start prod
```

### 4. 验证部署
部署完成后，访问以下地址验证服务：

- **主应用**: http://localhost
- **前端**: http://localhost:3000
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/health

## 📊 部署脚本使用指南

### 基本命令
```bash
# 启动生产环境
./deploy.sh start prod

# 启动开发环境 (仅数据库)
./deploy.sh start dev

# 停止所有服务
./deploy.sh stop

# 重启服务
./deploy.sh restart prod

# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs
./deploy.sh logs backend  # 查看特定服务日志

# 构建镜像
./deploy.sh build

# 清理资源
./deploy.sh cleanup
```

### 服务管理
```bash
# Docker Compose 原生命令
docker-compose ps                    # 查看服务状态
docker-compose logs -f frontend      # 实时查看前端日志
docker-compose logs -f backend       # 实时查看后端日志
docker-compose restart nginx         # 重启 Nginx
docker-compose down                  # 停止所有服务
docker-compose up -d                 # 启动所有服务
```

## 🔧 配置说明

### 服务端口分配
| 服务 | 内部端口 | 外部端口 | 说明 |
|------|----------|----------|------|
| Nginx | 80/443 | 80/443 | 反向代理 |
| Frontend | 3000 | 3000 | Next.js 前端 |
| Backend | 3001 | 3001 | Node.js API |
| MongoDB | 27017 | 27017 | 数据库 |
| Redis | 6379 | 6379 | 缓存 |

### 数据持久化
```bash
# 数据卷位置
docker volume ls | grep quiz
quiz-system_mongo_data    # MongoDB 数据
quiz-system_redis_data    # Redis 数据
```

### 日志查看
```bash
# 应用日志
docker-compose logs -f --tail=100 backend
docker-compose logs -f --tail=100 frontend

# Nginx 日志
docker-compose exec nginx tail -f /var/log/nginx/access.log
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

## 🛡️ 安全配置

### 防火墙设置
```bash
# Ubuntu/Debian
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### SSL 证书配置 (可选)
```bash
# 安装 Certbot
sudo apt install certbot  # Ubuntu/Debian
sudo yum install certbot  # CentOS/RHEL

# 生成证书
sudo certbot certonly --standalone -d your-domain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 重启 Nginx
docker-compose restart nginx
```

## 📊 监控和维护

### 健康检查
```bash
# 检查服务健康状态
curl http://localhost:3001/health

# 预期响应
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai": "available"
  }
}
```

### 性能监控
```bash
# 查看容器资源使用
docker stats

# 查看服务状态
docker-compose top
```

### 数据备份
```bash
# MongoDB 备份
docker-compose exec mongo mongodump --host localhost --port 27017 --db quiz-system --out /backup

# Redis 备份
docker-compose exec redis redis-cli SAVE
```

## 🔄 更新和升级

### 应用更新
```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
./deploy.sh build
./deploy.sh restart prod
```

### 配置更新
```bash
# 修改环境变量后
nano .env

# 重启相关服务
docker-compose restart backend frontend
```

## 🚨 故障排除

### 常见问题

**1. 服务启动失败**
```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs frontend

# 检查端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001
```

**2. 数据库连接失败**
```bash
# 检查 MongoDB 状态
docker-compose exec mongo mongo --eval "db.runCommand('ping')"

# 查看 MongoDB 日志
docker-compose logs mongo
```

**3. AI API 调用失败**
```bash
# 验证 API Key
curl -H "x-goog-api-key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
```

**4. 内存不足**
```bash
# 增加 Docker 内存限制
# 在 docker-compose.yml 中添加:
# mem_limit: 512m
# memswap_limit: 1g
```

### 完全重置
```bash
# 停止所有服务并清理
./deploy.sh cleanup

# 删除所有数据 (⚠️ 谨慎操作)
docker-compose down -v
docker system prune -af
```

## 📞 技术支持

如遇到问题，请：

1. 查看日志: `./deploy.sh logs`
2. 检查服务状态: `./deploy.sh status`
3. 查看 GitHub Issues
4. 联系技术支持

---

🎉 **部署成功后，你将拥有一个功能完整的智能题库系统！**