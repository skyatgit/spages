# SPages Frontend

SPages 前端管理界面 - 基于 Vue 3 + Vite 构建的现代化管理面板

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📁 目录结构

```
src/
├── api/              # API 接口封装
│   ├── auth.js      # 认证 API
│   ├── deploy.js    # 部署 API
│   ├── github.js    # GitHub API
│   ├── projects.js  # 项目管理 API
│   └── system.js    # 系统 API
├── assets/          # 静态资源
│   ├── base.css    # 基础样式
│   └── main.css    # 主样式
├── components/      # 通用组件
│   ├── DeleteProgressModal.vue
│   ├── EditProjectModal.vue
│   ├── LanguageSwitcher.vue
│   ├── Layout.vue
│   ├── LogViewer.vue
│   ├── Modal.vue
│   ├── ProjectCard.vue
│   ├── StatusBadge.vue
│   ├── StopProgressModal.vue
│   └── Toast.vue
├── locales/         # 国际化
│   ├── en-US.js    # 英文
│   ├── zh-CN.js    # 中文
│   └── index.js    # 配置
├── router/          # 路由配置
│   └── index.js
├── utils/           # 工具函数
│   ├── auth.js     # 认证工具
│   ├── modal.js    # 模态框工具
│   └── toast.js    # 提示工具
├── views/           # 页面组件
│   ├── AddProject.vue    # 添加项目
│   ├── Dashboard.vue     # 仪表板
│   ├── Login.vue         # 登录
│   ├── ProjectDetail.vue # 项目详情
│   └── Settings.vue      # 设置
├── App.vue          # 根组件
└── main.js          # 入口文件
```

## 🎨 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vue Router** - 官方路由管理器
- **Vite** - 下一代前端构建工具
- **Axios** - HTTP 客户端
- **Vue I18n** - 国际化插件

## 🔧 配置

### API 代理

在 `vite.config.js` 中配置了 API 代理：

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

开发模式下，所有 `/api` 请求会被代理到后端服务器。

### 环境变量

创建 `.env.local` 文件（不提交到 Git）：

```
VITE_API_BASE_URL=http://localhost:3000
```

## 🌍 国际化

支持中文和英文两种语言，可在右上角切换。

添加新语言：
1. 在 `src/locales/` 下创建新的语言文件
2. 在 `src/locales/index.js` 中注册

## 🎯 页面说明

### Dashboard（仪表板）
- 显示所有项目列表
- 实时状态更新（通过 SSE）
- 快速操作（启动、停止、删除）

### AddProject（添加项目）
- 选择 GitHub 账号
- 选择仓库和分支
- 配置端口和构建命令
- 一键部署

### ProjectDetail（项目详情）
- 查看项目信息
- 实时日志流
- 部署历史
- 环境变量管理

### Settings（设置）
- 修改管理员密码
- GitHub 账号管理
- 系统配置

## 🔐 认证

使用 localStorage 存储 JWT token：

```javascript
// 登录
localStorage.setItem('auth_token', token)

// 获取 token
const token = localStorage.getItem('auth_token')

// 登出
localStorage.removeItem('auth_token')
```

## 🐛 调试

### 开发工具

安装 Vue DevTools 浏览器扩展进行调试。

### 常见问题

**端口冲突**：
修改 `vite.config.js` 中的端口配置

**API 请求失败**：
检查后端是否启动，代理配置是否正确

**样式不生效**：
检查 CSS 导入顺序，清除浏览器缓存

## 📦 构建部署

```bash
# 构建
npm run build

# 输出到 dist/ 目录
```

构建产物可以部署到：
- Nginx
- Apache
- CDN
- 静态托管服务（Vercel、Netlify 等）

## 🎨 主题定制

主要样式变量在 `src/assets/base.css` 中定义：

```css
:root {
  --color-primary: #667eea;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  /* ... */
}
```

## 📝 代码规范

- 使用 Composition API
- 组件使用 `<script setup>` 语法
- 样式使用 scoped
- 遵循 Vue 官方风格指南
