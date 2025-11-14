# SPages

简单的静态页面托管系统 - 支持从 GitHub 自动部署和管理多个前端项目

## 📁 项目结构

```
spages/
├── backend/              # 后端服务（完整的后端应用）
│   ├── server/          # 服务器代码
│   ├── data/           # 数据存储
│   ├── projects/       # 已部署的项目
│   ├── runtime/        # 运行时数据（Node.js 版本等）
│   └── package.json    # 后端依赖
│
├── frontend/            # 前端应用（完整的前端应用）
│   ├── src/            # 源码
│   ├── public/         # 静态资源
│   └── package.json    # 前端依赖
│
└── .ai/                # 文档目录
```

**说明**：
- `backend/` 包含所有后端相关内容（代码 + 数据）
- `frontend/` 包含所有前端相关内容
- 根目录保持简洁，只有文档

## 🚀 快速开始

### 开发环境

```bash
# 终端 1 - 启动后端
cd backend
npm install  # 首次需要
npm start

# 终端 2 - 启动前端
cd frontend
npm install  # 首次需要
npm run dev
```

**端口**：
- 后端：`http://localhost:3000`
- 前端：`http://localhost:5173`

**访问**：打开浏览器访问 `http://localhost:5173`

### 生产部署

```bash
# 1. 构建前端
cd frontend
npm install
npm run build

# 2. 启动后端（生产模式）
cd ../backend
npm install --production
npm run start:prod
```

## 📋 可用脚本

### 后端脚本（在 backend/ 目录）

| 命令 | 说明 |
|------|------|
| `npm start` | 启动后端（自动启动前端） |
| `npm run start:prod` | 启动生产环境 |
| `npm run build:frontend` | 手动构建前端 |

### 前端脚本（在 frontend/ 目录）

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建结果 |

## ✨ 核心功能

- 🔐 **GitHub 集成**：支持通过 GitHub App 或 Personal Access Token 授权
- 📦 **自动部署**：从 GitHub 仓库拉取代码并自动构建部署
- 🎯 **多项目管理**：统一管理多个前端项目
- 🔄 **实时状态**：SSE 实时推送项目状态和日志
- 🛠️ **框架检测**：自动识别 Vue、React、Vite 等框架
- 🔧 **Node 版本管理**：自动下载和管理所需的 Node.js 版本
- 🌍 **多语言支持**：中文/英文界面

## 🏗️ 技术栈

**前端**：
- Vue 3 + Vue Router
- Vite
- Axios
- Vue I18n（国际化）

**后端**：
- Node.js + Express
- Simple Git（Git 操作）
- JWT（认证）
- SSE（实时通信）

## 🔧 首次使用

1. 启动后端：`cd backend && npm install && npm start`
2. 启动前端：`cd frontend && npm install && npm run dev`（新终端）
3. 访问：`http://localhost:5173`
4. 登录：用户名 `admin`，密码 `admin`
5. **修改默认密码**（在设置页面）
6. 绑定 GitHub 账号
7. 开始部署项目

## 🔐 GitHub 授权

支持两种方式：

### 方式 1：GitHub App（推荐）

1. 在 GitHub 创建 GitHub App
2. 在 SPages 设置页面注册 App
3. 用户授权安装

### 方式 2：Personal Access Token

1. 在 GitHub 生成 PAT（需要 `repo` 权限）
2. 在 SPages 添加账号时填入 Token

## 📊 项目管理

### 添加项目

1. 选择 GitHub 账号
2. 选择仓库和分支
3. 配置端口和构建命令
4. 点击部署

### 项目操作

- **部署**：重新从 GitHub 拉取并构建
- **启动**：启动已构建的项目
- **停止**：停止运行中的项目
- **查看日志**：实时查看部署和运行日志
- **环境变量**：配置项目环境变量
- **删除**：移除项目

## 🐛 故障排查

### 端口被占用

```bash
# Windows
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5173"
taskkill /F /PID <进程ID>

# Linux/Mac
lsof -i :3000
lsof -i :5173
kill -9 <PID>
```

### 依赖安装失败

```bash
# 后端
cd backend
rm -rf node_modules package-lock.json
npm install

# 前端
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### API 连接失败

检查 `frontend/vite.config.js` 中的代理配置：

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

## 🚀 生产部署

### 方式 1：单机部署

```bash
# 1. 构建前端
cd frontend
npm run build

# 2. 使用 PM2 启动后端
cd ../backend
npm install -g pm2
pm2 start npm --name spages --  run start:prod

# 3. 管理
pm2 status
pm2 logs spages
pm2 stop spages
pm2 restart spages
```

### 方式 2：前后端分离部署

**后端（服务器）**：
```bash
cd backend
npm install --production
npm run start:prod
```

**前端（CDN/Nginx）**：
```bash
cd frontend
npm install
npm run build
# 将 dist/ 部署到 CDN 或 Nginx
```

### Docker 部署

```dockerfile
FROM node:24

WORKDIR /app
COPY . .

# 安装后端依赖
WORKDIR /app/backend
RUN npm install --production

# 构建前端
WORKDIR /app/frontend
RUN npm install && npm run build

# 启动后端
WORKDIR /app/backend
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

```bash
docker build -t spages .
docker run -d -p 3000:3000 --name spages spages
```

## 📚 详细文档

- 📖 [使用指南](.ai/使用指南.md) - 完整的使用教程
- 📖 [后端文档](backend/README.md) - 后端 API 文档
- 📖 [前端文档](frontend/README.md) - 前端开发文档

## 🌟 特性亮点

1. **前后端完全分离** - 清晰的项目结构，易于维护
2. **自动化部署** - 从 GitHub 拉取代码到运行，全自动
3. **实时状态监控** - 通过 SSE 实时推送项目状态
4. **多项目管理** - 在一个系统中管理多个前端项目
5. **智能框架检测** - 自动识别项目框架并配置
6. **Node 版本管理** - 为不同项目使用不同的 Node 版本

## 📝 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**快速开始**：
```bash
cd backend && npm install && npm start
cd frontend && npm install && npm run dev  # 新终端
```

**访问**：`http://localhost:5173`
