# SPages

**SPages** - 一个类似 Vercel Pages / Cloudflare Pages 的简化版自动部署平台，专注于前端项目的快速部署。

## 项目简介

SPages 是一个自包含的部署平台，支持：
- ✅ 多 GitHub 账号管理
- ✅ 自动拉取和部署前端项目
- ✅ 项目环境隔离
- ✅ 自动 Node.js 版本管理
- ✅ 多语言支持（中文/英文）
- ✅ 完整的 Web UI 管理界面

## 技术栈

- **前端**: Vue 3 + Vite + Vue Router + Vue I18n
- **后端**: Node.js + Express
- **打包**: pkg (生成独立可执行文件)

## 开发环境设置

### 安装依赖

```sh
npm install
```

### 开发模式

```sh
# 仅启动前端
npm run dev

# 仅启动后端
npm run dev:server

# 同时启动前后端
npm run dev:all
```

### 构建生产版本

```sh
# 构建前端
npm run build

# 构建后端
npm run build:server

# 构建全部
npm run build:all
```

## 默认凭据

- 用户名: `admin`
- 密码: `admin`

登录后可在设置页面修改。

## 国际化

项目支持中英文切换：
- 默认语言：简体中文
- 切换方式：登录页右上角 / 侧边栏底部的语言切换按钮

## 项目结构

```
SPages/
├── src/              # 前端源码
│   ├── components/   # Vue 组件
│   ├── views/        # 页面
│   ├── router/       # 路由配置
│   ├── locales/      # 国际化语言包
│   └── api/          # API 调用封装
├── server/           # 后端源码
│   ├── routes/       # API 路由
│   ├── services/     # 业务逻辑
│   └── utils/        # 工具函数
├── data/             # 运行时数据（git ignored）
└── runtime/          # Node.js 版本池（git ignored）
```

## License

MIT
