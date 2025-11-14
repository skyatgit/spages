# 域名绑定与后端访问控制实现方案（纯 Node.js 版）

## 概览
- 目标：后端始终监听 localhost，仅允许来自“前端代理”的请求；对外只暴露前端代理绑定的 IP/域名。
- 约束：不使用 Nginx 等外部代理；采用 Node.js 纯代码实现反向代理与访问控制。

## 设计要点
- 前端代理（proxy-server.js）
  - 监听 0.0.0.0:80（或你配置的端口）
  - 提供前端 dist 静态资源
  - 将 /api/* 请求代理到 http://localhost:3000
  - 在代理请求头上附带标记 X-Proxy-By: node-proxy 与转发信息
- 后端（server/index.js）
  - 仅监听 localhost:3000
  - 中间件校验 X-Proxy-By 请求头，拒绝一切直连请求

## 目录与文件
- proxy-server.js（新增）
- server/index.js（在最顶层增加访问控制中间件）
- data/config.json：新增字段
  - boundDomain: string（对外绑定的域名或 IP，如 http://192.168.1.100）
  - enableProxyOnlyAccess: boolean（是否仅允许来自代理的访问）
  - proxyType: "node"

## proxy-server.js 示例
```js
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import { fileURLToPath } from 'url'
import { mainConfig } from './server/utils/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// 读取配置
const cfg = mainConfig.read()
const boundDomain = cfg.boundDomain || 'http://localhost'
const url = new URL(boundDomain)
const PORT = Number(url.port || 80)
const HOST = '0.0.0.0'

// 代理 /api -> http://localhost:3000
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  ws: true,
  onProxyReq(proxyReq, req) {
    proxyReq.setHeader('X-Proxy-By', 'node-proxy')
    proxyReq.setHeader('X-Forwarded-For', req.ip)
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol)
    proxyReq.setHeader('X-Forwarded-Host', req.get('host'))
  }
}))

// 静态资源
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath, { maxAge: '1y' }))

// SPA 回退
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, HOST, () => {
  console.log(`[proxy] listening at http://${HOST}:${PORT}, serving ${distPath}`)
})
```

## 后端访问控制中间件（片段）
把以下中间件放在 `server/index.js` 路由挂载之前：
```js
import { mainConfig } from './utils/config.js'

app.use((req, res, next) => {
  const cfg = mainConfig.read()
  if (!cfg.enableProxyOnlyAccess) return next()

  const via = req.get('X-Proxy-By')
  if (via !== 'node-proxy') {
    return res.status(403).json({
      error: 'Direct access forbidden',
      message: 'Please access through the configured domain/IP'
    })
  }
  next()
})
```

并确保后端仅监听 localhost：
```js
const PORT = process.env.PORT || 3000
const HOST = 'localhost' // 或 127.0.0.1
app.listen(PORT, HOST, () => console.log(`[backend] http://${HOST}:${PORT}`))
```

## data/config.json 字段
```json
{
  "boundDomain": "http://192.168.1.100",
  "enableProxyOnlyAccess": true,
  "proxyType": "node"
}
```

## 前端设置建议（不改代码时的说明）
- 在系统设置页新增“域名绑定配置”卡片：
  - 输入框：绑定域名/IP（例：http://192.168.1.100 或 https://myapp.com）
  - 勾选项：仅允许代理访问
  - 保存后提示：需要重启代理进程（proxy-server.js）以生效

## 启动方式建议
- 安装依赖：
```bash
npm i http-proxy-middleware -S
```
- 启动（Windows PowerShell）：
```powershell
$env:NODE_ENV='production'; node server/index.js
$env:NODE_ENV='production'; node proxy-server.js
```
- 使用 PM2：
```bash
pm2 start server/index.js --name spages-backend
pm2 start proxy-server.js --name spages-proxy
```

## 验证用例
- 访问 http://<你的IP>/ 可正常打开前端
- 访问 http://<你的IP>/api/system/info 可拿到数据
- 直接访问 http://localhost:3000/api/system/info 返回 403

## 注意
- 如果 80 端口被占用，可把 boundDomain 改成带端口的地址（如 http://192.168.1.100:8080），并修改 proxy-server.js 的端口。
- 启用 HTTPS 时，可把代理服务器端口切换到 443，并在代理层接入自签/正式证书（可用 httpolyglot/https 模块）。
