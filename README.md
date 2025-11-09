# SPages

SPages 是一个自托管的轻量级静态/前端站点自动部署与管理平台（类似 Vercel / Cloudflare Pages 的简化版），专注于让你可以使用多个 GitHub 账号快速地拉取、构建并在本地/宿主机上托管前端项目。

简要功能
- 管理多个 GitHub 账号并通过 OAuth/GitHub App 授权仓库访问
- 自动克隆、构建并部署前端项目（可设置端口），支持项目的启动/停止/删除
- Web UI 管理面板（基于 Vue 3）用于查看项目状态、部署日志与操作
- 使用 JSON 文件作为轻量配置持久化（位于 `data/`）以便快速上手
- 支持多语言（简体中文 / English）

技术栈
- 前端：Vue 3 + Vite + Vue Router + vue-i18n
- 后端：Node.js (ES Modules) + Express
- 辅助库：axios, simple-git, adm-zip, jsonwebtoken, bcryptjs

重要提示
- 本项目用 JSON 文件保存运行时数据（`data/`），这些文件通常在 `.gitignore` 中以避免将凭证或敏感信息提交到仓库。
- README 中的默认管理账户（仅用于快速本地体验）请在生产环境立即修改。

快速开始（Windows - cmd.exe）
请确保你的 Node.js 版本满足 package.json 中 `engines.node` 的最低要求（当前项目指定 >= 24.11.0）。

在项目根目录执行：

```cmd
npm install
```

开发模式（仅前端）

```cmd
npm run dev
```

仅启动后端开发服务器

```cmd
npm run dev:server
```

同时启动前端和后端（开发）

```cmd
npm run dev:all
```

构建与预览

```cmd
# 构建前端
npm run build

# 预览（vite）
npm run preview

# 如果要在 production 模式下用内置后端静态服务预览（先构建）：
npm run preview:server
# 或同时预览前后端：
npm run preview:all
```

项目结构（核心目录）
```
SPages/
├─ src/              # 前端源码（Vue）
├─ server/           # 后端（Express）
│  ├─ routes/        # API 路由（auth, github, projects 等）
│  └─ services/      # 部署、项目管理、node 版本管理逻辑
├─ data/             # 运行时配置与数据（admin、projects、github accounts）
├─ projects/         # 被部署的项目目录（运行时生成）
├─ scripts/          # 构建、迁移等脚本
└─ package.json
```

默认账号与配置
- 默认管理用户名：`admin`
- 默认密码：如果你尚未修改，README 原文档提示为 `admin`/`admin`；实际密码保存于 `data/config.json`（bcrypt hash）。请在首次运行后尽快修改管理员密码。

核心后端 API（摘要）
- POST /api/auth/login — 登录，返回 JWT
- GET /api/auth/verify — 校验 token
- /api/github/* — GitHub App / OAuth / 账号 / 仓库 / 分支相关 API
- /api/projects/* — 项目增删改查、部署、停止、查看日志、端口/名称校验等
- GET /api/health — 健康检查

GitHub App / OAuth 注意事项
- GitHub App 的创建与安装流程依赖一个可以被 GitHub 回调访问的 BASE_URL（默认 `http://localhost:3000`）。在本地调试时，若需要完成安装/回调流程，请使用像 ngrok 之类的隧道工具将本地端口暴露到公网，然后将 BASE_URL 设置为你的公网地址。
- 当前代码在创建 manifest 时会使用短期全局存储（例如 `global.pendingManifests`）做临时保存，这在生产环境中应替换为 Redis 或数据库并加上过期策略来提高安全性与可靠性。

安全提醒
- 请不要在公共仓库中提交 `data/` 目录下的文件或其他凭证
- 在生产部署时请使用安全的 JWT secret、将 GitHub client secret 等凭据放到环境变量或 secret 管理服务
- 强烈建议首次运行后修改默认管理员用户名/密码并限制对管理控制台的访问（通过防火墙或身份验证代理）

运维建议
- 对构建与运行日志做轮转（避免日志无限增长）
- 对构建产物实施清理策略（仓库中的 `settings.cleanupOldBuilds` 控制项可用于配置此类行为）
- 在 Linux 服务器上部署时，建议使用 systemd / pm2 或容器化（Docker）来管理后端服务与子进程生命周期

开发与贡献
欢迎提交 issues 或 PR。代码风格与模块划分已在 `src/` 与 `server/` 中有较清晰的分层，贡献前请先在本地运行并确保主要流程（登录、连接 GitHub、添加项目、触发部署）可复现。

英文摘要（Quick summary）

SPages is a lightweight self-hosted static/frontend site deployment manager inspired by hosted providers such as Vercel and Cloudflare Pages. It provides a Vue 3-based UI to manage GitHub accounts, select repositories/branches, and automate clone, build, and serve workflows for multiple projects. The backend is implemented with Node.js + Express and uses JSON files in `data/` for persistence to keep setup simple for local usage. For production, secure secrets and consider switching to a database and robust process manager.

---

如果你希望我：
- 把 README 翻成完整英文版；
- 或把安装 / 部署示例扩展为 Docker / systemd / nginx 反向代理 的具体步骤；
- 或为 README 自动生成一份 `SECURITY.md` 或 `DEPLOYMENT.md`；

告诉我你优先需要的内容，我会继续为你补充并直接写入文件。
