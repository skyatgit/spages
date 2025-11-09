# SPages 部署指南

本文档介绍如何将 SPages 部署到公网服务器，并配置 GitHub App Webhook。

## 目录

- [环境要求](#环境要求)
- [部署步骤](#部署步骤)
- [配置 GitHub App Webhook](#配置-github-app-webhook)
- [使用 PM2 管理进程](#使用-pm2-管理进程)
- [使用 Nginx 反向代理](#使用-nginx-反向代理)
- [使用 Docker 部署](#使用-docker-部署)
- [安全建议](#安全建议)

## 环境要求

- Node.js >= 24.11.0
- npm 或 yarn
- 公网 IP 或域名
- （推荐）Nginx 作为反向代理
- （推荐）SSL 证书（Let's Encrypt）

## 部署步骤

### 1. 克隆代码到服务器

```bash
cd /var/www
# 替换为您自己的仓库地址
git clone https://github.com/your-username/your-repo-name.git spages
cd spages
```

### 2. 安装依赖

```bash
npm install
```

### 3. 构建前端

```bash
npm run build
```

### 4. 配置环境变量（可选）

创建 `.env` 文件：

```bash
# 如果您使用自定义域名
BASE_URL=https://your-domain.com

# JWT Secret（建议修改为随机字符串）
JWT_SECRET=your-random-secret-here
```

### 5. 初始化数据目录

首次运行时，系统会自动创建 `data/` 目录并初始化配置文件：

```bash
# 测试运行
npm run preview:server
```

访问 `http://your-server-ip:3000` 验证是否正常运行。

### 6. 修改默认管理员密码

1. 访问系统设置页面
2. 在"管理员凭据"部分修改用户名和密码
3. 确保使用强密码

## 配置 GitHub App Webhook

### 为什么需要 Webhook？

Webhook 可以让 GitHub 在仓库有新提交时自动通知 SPages，实现自动部署功能。但在本地开发环境中，GitHub 无法访问您的本地服务器，因此 Webhook 仅适用于公网部署。

### 配置步骤

#### 1. 创建 GitHub App

1. 访问系统设置页面
2. 点击"创建 GitHub App"按钮
3. 在新标签页中完成 GitHub App 创建流程
4. 返回系统设置页面刷新

#### 2. 添加 Webhook URL

1. 访问 GitHub App 设置页面：`https://github.com/settings/apps/your-app-name`
2. 找到"Webhook"部分
3. 添加 Webhook URL：
   - **Webhook URL**：`https://your-domain.com/api/github/webhook`
   - **Content type**：`application/json`
   - **Secret**：留空或设置一个密钥（需要在代码中相应配置）
4. 选择需要接收的事件：
   - ✅ Push
   - ✅ Pull request
   - （其他事件根据需求选择）
5. 点击"Update Webhook"保存

#### 3. 验证 Webhook

1. 在 GitHub App 设置页面找到"Recent Deliveries"
2. 点击"Redeliver"重新发送测试请求
3. 检查服务器日志，确认收到 webhook 请求

## 使用 PM2 管理进程

PM2 是 Node.js 进程管理工具，可以确保应用在崩溃后自动重启。

### 安装 PM2

```bash
npm install -g pm2
```

### 创建 PM2 配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'spages',
    script: './server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      BASE_URL: 'https://your-domain.com'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
}
```

### 启动应用

```bash
# 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs spages

# 设置开机自启
pm2 startup
pm2 save
```

## 使用 Nginx 反向代理

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 配置 Nginx

创建 `/etc/nginx/sites-available/spages`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS（配置 SSL 后启用）
    # return 301 https://$server_name$request_uri;

    # 前端静态文件
    location / {
        root /var/www/spages/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理到后端
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 启用站点

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/spages /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 配置 SSL（推荐）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 证书会自动续期
```

配置完成后，Nginx 配置会自动更新为 HTTPS。

## 使用 Docker 部署

### 创建 Dockerfile

```dockerfile
FROM node:24-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源码
COPY . .

# 构建前端
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server/index.js"]
```

### 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  spages:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./projects:/app/projects
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - BASE_URL=https://your-domain.com
      - PORT=3000
    restart: unless-stopped
```

### 启动容器

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## 安全建议

### 1. 修改默认密码

首次部署后立即修改管理员密码。

### 2. 使用 HTTPS

所有生产环境必须使用 HTTPS，保护数据传输安全。

### 3. 限制访问

使用防火墙限制只允许必要的端口访问：

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 不要直接暴露 Node.js 端口
# sudo ufw deny 3000/tcp
```

### 4. 设置环境变量

不要在代码中硬编码敏感信息，使用环境变量：

```bash
export JWT_SECRET="your-random-secret"
export GITHUB_WEBHOOK_SECRET="your-webhook-secret"
```

### 5. 定期备份

定期备份 `data/` 目录：

```bash
# 创建备份脚本
#!/bin/bash
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 添加到 crontab
0 2 * * * /path/to/backup.sh
```

### 6. 日志轮转

配置日志轮转避免日志文件过大：

```bash
# /etc/logrotate.d/spages
/var/www/spages/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

### 7. 限制文件上传大小

在 Nginx 中限制请求体大小：

```nginx
client_max_body_size 10M;
```

## 故障排查

### 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3000

# 或使用
sudo netstat -tlnp | grep 3000
```

### 权限问题

```bash
# 确保数据目录有正确的权限
sudo chown -R $USER:$USER data/
chmod 755 data/
```

### GitHub Webhook 不工作

1. 检查防火墙是否阻止了入站连接
2. 查看 GitHub App 设置中的 "Recent Deliveries"
3. 检查服务器日志：`pm2 logs spages`
4. 确认 Webhook URL 使用 HTTPS 且证书有效

## 性能优化

### 1. 使用 Nginx 缓存静态资源

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. 启用 Gzip 压缩

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### 3. 配置 PM2 集群模式

对于高负载场景，可以使用 PM2 集群模式：

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'spages',
    script: './server/index.js',
    instances: 'max', // 或指定数量，如 2
    exec_mode: 'cluster',
    // ... 其他配置
  }]
}
```

## 监控

### 使用 PM2 监控

```bash
# 安装 PM2 监控
pm2 install pm2-logrotate

# 查看实时监控
pm2 monit
```

### 设置告警

可以集成第三方监控服务如：
- UptimeRobot（网站可用性监控）
- New Relic（应用性能监控）
- Sentry（错误追踪）

---

## 相关链接

- [GitHub App 文档](https://docs.github.com/en/developers/apps)
- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

如有问题，请提交 Issue 或查看项目 Wiki。

