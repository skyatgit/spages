# SPages Backend

SPages 后端服务 - 提供项目管理、GitHub 集成、自动部署等 API 服务

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发模式
npm start

# 启动生产模式
npm run start:prod
```

## 📋 API 端点

### 认证相关
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/verify` - 验证 token

### 项目管理
- `GET /api/projects` - 获取所有项目
- `GET /api/projects/:id` - 获取单个项目
- `POST /api/projects` - 创建项目
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目
- `POST /api/projects/:id/deploy` - 部署项目
- `POST /api/projects/:id/start` - 启动项目
- `POST /api/projects/:id/stop` - 停止项目
- `POST /api/projects/:id/mode` - 切换模式（dev/prod）
- `POST /api/projects/:id/restart` - 重启项目

### GitHub 相关
- `GET /api/github/accounts` - 获取 GitHub 账号列表
- `POST /api/github/accounts` - 添加 GitHub 账号
- `GET /api/github/repositories/:accountId` - 获取仓库列表
- `GET /api/github/branches/:accountId/:owner/:repo` - 获取分支列表

### 系统相关
- `GET /api/system/network-interfaces` - 获取网络接口列表
- `GET /api/health` - 健康检查

## 🔧 环境变量

- `NODE_ENV` - 运行环境（development/production）
- `PORT` - 服务端口（默认 3000）
- `HOST` - 监听地址（默认 localhost）

## 📁 目录结构

```
server/
├── index.js           # 入口文件
├── routes/           # API 路由
│   ├── auth.js      # 认证路由
│   ├── github.js    # GitHub 路由
│   ├── projects-v3.js # 项目管理路由
│   └── system.js    # 系统路由
├── services/        # 核心服务
│   ├── deployment-v3.js      # 部署服务
│   ├── framework-detector.js # 框架检测
│   ├── node-manager.js       # Node 版本管理
│   └── project-manager.js    # 项目管理
└── utils/           # 工具函数
    ├── auth.js      # 认证工具
    ├── config.js    # 配置管理
    ├── init.js      # 初始化
    └── logger.js    # 日志工具
```

## 🔐 认证

使用 JWT 进行认证。客户端需要在请求头中携带 token：

```
Authorization: Bearer <token>
```

## 📝 日志

日志存储在 `projects/{projectName}/.spages/logs/` 目录下。

## 🐛 调试

```bash
# 查看日志
tail -f projects/*/. spages/logs/*.log

# 检查端口占用
netstat -ano | findstr ":3000"
```

## 📂 数据目录

- `data/` - 配置和索引数据
- `projects/` - 已部署的项目
- `runtime/` - Node.js 版本等运行时数据

所有数据目录都在 `backend/` 下，便于统一管理和备份。
