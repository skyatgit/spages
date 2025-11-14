# IP/域名绑定与自动跳转功能实现方案

## 📋 需求分析

### 场景
- 后端在 `0.0.0.0:3000` 启动，可通过多个 IP 访问（localhost、127.0.0.1、192.168.x.x、公网IP等）
- 希望用户访问任何 IP 时，自动跳转到管理员指定的"首选访问地址"

### 目标
- 在系统设置页面添加"首选访问地址"配置
- 用户通过非首选地址访问时，自动跳转到首选地址

---

## 🎯 实现方案

### 方案概述

**架构选择：Nginx 反向代理 + 后端访问控制**

1. **Nginx 层**：绑定域名/IP，作为前端和 API 的统一入口
2. **后端层**：只监听 localhost，验证请求来源
3. **配置层**：在设置页面配置绑定的域名/IP

### 技术栈
- **Web 服务器**：Nginx（或 Apache、Caddy）
- **反向代理**：将 `/api/*` 转发到 `localhost:3000`
- **静态文件**：Nginx 直接服务前端静态文件
- **访问控制**：后端验证 `X-Forwarded-For` 等请求头

---

## 📐 详细设计

### 方案 A：使用 Nginx 反向代理（推荐）⭐

**优点：**
- ✅ 性能最优，Nginx 专门优化过反向代理
- ✅ 成熟稳定，被广泛使用
- ✅ 支持 SSL/TLS 终止
- ✅ 可以同时处理静态文件和 API 代理
- ✅ 支持负载均衡、缓存等高级功能

**缺点：**
- ⚠️ 需要额外安装 Nginx
- ⚠️ 配置相对复杂

**架构图：**

```
[用户] http://192.168.1.100
   ↓
[Nginx :80]
   ├─ / (静态文件) → /path/to/dist/
   └─ /api/* (代理) → http://localhost:3000/api/*
       ↓
   [Express后端 :3000] (只监听 localhost)
```

---

### 方案 B：使用 Node.js Express 反向代理

**优点：**
- ✅ 不需要额外安装软件
- ✅ 纯 JavaScript，易于集成
- ✅ 配置简单

**缺点：**
- ⚠️ 性能不如 Nginx
- ⚠️ 需要运行两个 Node.js 进程

**架构图：**

```
[用户] http://192.168.1.100
   ↓
[Express代理服务器 :80]
   ├─ / (静态文件) → serve from dist/
   └─ /api/* (代理) → http://localhost:3000/api/*
       ↓
   [Express后端 :3000] (只监听 localhost)
```

---

## 🛠️ 具体实现细节

### 方案 A：Nginx 反向代理实现（推荐）

#### 1. Nginx 配置文件

**位置：** `/etc/nginx/sites-available/spages` (Linux) 或 `nginx/conf/nginx.conf` (Windows)

```nginx
# SPages 应用配置
server {
    # 监听端口（80 为 HTTP，443 为 HTTPS）
    listen 80;
    listen [::]:80;
    
    # 绑定的域名或 IP
    server_name 192.168.1.100 myapp.com www.myapp.com;
    
    # 日志文件
    access_log /var/log/nginx/spages_access.log;
    error_log /var/log/nginx/spages_error.log;
    
    # 前端静态文件
    location / {
        root /path/to/spages/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API 反向代理到后端
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # 传递真实的客户端信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 用于后端验证代理来源的标记
        proxy_set_header X-Proxy-By "nginx";
        
        # WebSocket 支持（如果需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}

# HTTPS 配置（可选）
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name myapp.com www.myapp.com;
    
    # SSL 证书
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # 其他配置同上...
    location / {
        root /path/to/spages/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3000;
        # ... 同上
    }
}
```

#### 2. 后端访问控制中间件

**文件：** `server/index.js`

```javascript
import express from 'express'
import { mainConfig } from './utils/config.js'

const app = express()

// ===== 访问控制中间件 =====
// 只允许通过 Nginx 代理访问，拒绝直接访问
app.use((req, res, next) => {
  const config = mainConfig.read()
  
  // 如果启用了访问控制
  if (config.enableProxyOnlyAccess) {
    const proxyHeader = req.get('X-Proxy-By')
    const forwardedFor = req.get('X-Forwarded-For')
    
    // 检查是否来自代理
    if (!proxyHeader || proxyHeader !== 'nginx') {
      console.warn(`[Access Denied] Direct access attempt from ${req.ip}`)
      return res.status(403).json({
        error: 'Direct access is not allowed',
        message: 'Please access through the configured domain/IP'
      })
    }
    
    console.log(`[Access Allowed] Proxied request from ${forwardedFor || req.ip}`)
  }
  
  next()
})

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api/auth', authRoutes)
// ... 其他路由

// 后端只监听 localhost
const PORT = process.env.PORT || 3000
const HOST = 'localhost' // 或 '127.0.0.1'

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
  console.log('Backend is only accessible via localhost (not exposed to network)')
  console.log('Access via configured domain/IP through Nginx proxy')
})
```

#### 3. 配置数据模型

**文件：** `data/config.json`

```json
{
  "admin": {
    "username": "admin",
    "password": "$2a$10$..."
  },
  "boundDomain": "http://192.168.1.100",
  "enableProxyOnlyAccess": true,
  "proxyType": "nginx"
}
```

**字段说明：**
- `boundDomain`: 绑定的域名或 IP（前端访问地址）
- `enableProxyOnlyAccess`: 是否启用代理访问控制
- `proxyType`: 代理类型（nginx/apache/custom）

#### 4. 后端配置 API

**文件：** `server/routes/system.js`

```javascript
/**
 * 获取域名绑定配置
 * GET /api/system/domain-config
 */
router.get('/domain-config', authMiddleware, (req, res) => {
  const config = mainConfig.read()
  res.json({
    success: true,
    data: {
      boundDomain: config.boundDomain || '',
      enableProxyOnlyAccess: config.enableProxyOnlyAccess || false,
      proxyType: config.proxyType || 'nginx',
      currentAccessUrl: `${req.protocol}://${req.get('host')}`
    }
  })
})

/**
 * 更新域名绑定配置
 * POST /api/system/domain-config
 */
router.post('/domain-config', authMiddleware, (req, res) => {
  try {
    const { boundDomain, enableProxyOnlyAccess } = req.body
    
    // 验证 URL 格式
    if (boundDomain && boundDomain.trim() !== '') {
      try {
        new URL(boundDomain)
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        })
      }
    }
    
    const config = mainConfig.read()
    config.boundDomain = boundDomain?.trim() || ''
    config.enableProxyOnlyAccess = enableProxyOnlyAccess || false
    mainConfig.write(config)
    
    res.json({
      success: true,
      message: 'Domain configuration saved. Please update Nginx config accordingly.',
      data: {
        boundDomain: config.boundDomain,
        enableProxyOnlyAccess: config.enableProxyOnlyAccess
      }
    })
  } catch (error) {
    console.error('Save domain config error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to save domain configuration'
    })
  }
})

/**
 * 生成 Nginx 配置文件
 * GET /api/system/generate-nginx-config
 */
router.get('/generate-nginx-config', authMiddleware, (req, res) => {
  const config = mainConfig.read()
  const boundDomain = config.boundDomain || 'localhost'
  const url = new URL(boundDomain)
  const domain = url.hostname
  const port = url.port || (url.protocol === 'https:' ? '443' : '80')
  const protocol = url.protocol.replace(':', '')
  
  const nginxConfig = `
# SPages Nginx Configuration
# Generated at: ${new Date().toISOString()}

server {
    listen ${port};
    server_name ${domain};
    
    # 前端静态文件
    location / {
        root ${process.cwd()}/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Proxy-By "nginx";
    }
}
`.trim()

  res.type('text/plain')
  res.send(nginxConfig)
})
```

---

### 方案 B：Node.js Express 代理实现

#### 1. 创建代理服务器

**文件：** `proxy-server.js`

```javascript
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import { fileURLToPath } from 'url'
import { mainConfig } from './server/utils/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// 读取配置
const config = mainConfig.read()
const boundDomain = config.boundDomain || 'http://localhost'
const url = new URL(boundDomain)
const PORT = url.port || 80

// API 反向代理
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // ��加代理标记
    proxyReq.setHeader('X-Proxy-By', 'express')
    proxyReq.setHeader('X-Forwarded-For', req.ip)
  }
}))

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')))

// SPA 路由支持
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// 启动代理服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on ${boundDomain}`)
  console.log(`Forwarding /api/* to http://localhost:3000`)
})
```

**安装依赖：**
```bash
npm install http-proxy-middleware
```

**启动脚本：** `package.json`
```json
{
  "scripts": {
    "start:proxy": "node proxy-server.js",
    "start:backend": "node server/index.js",
    "start:prod": "concurrently \"npm run start:backend\" \"npm run start:proxy\""
  }
}
```

---

## ⚠️ 注意事项

### 1. 重定向循环风险

**问题：**
如果配置错误，可能导致无限重定向循环。

**解决方案：**
- 严格匹配 `preferredHost`，包括协议、端口
- 添加重定向检测：
  ```javascript
  // 检测是否已经重定向过
  if (req.get('X-Redirected-From')) {
    console.warn('Redirect loop detected, skipping...')
    return next()
  }
  
  // 添加标记
  res.set('X-Redirected-From', currentHost)
  ```

### 2. 跨域问题

**问题：**
如果前后端分离部署，跳转可能导致 CORS 问题。

**解决方案：**
- API 请求必须跳过重定向逻辑
- 确保 CORS 配置正确
- 前端 API 调用使用相对路径或同域名

### 3. HTTPS 和 HTTP 混合

**问题：**
HTTPS 页面不能加载 HTTP 资源（混合内容警告）。

**解决方案：**
- 统一使用 HTTPS 或 HTTP
- 如果配置了 HTTPS，确保证书有效
- 浏览器会自动阻止不安全的请求

### 4. 开发环境处理

**问题：**
开发环境（Vite dev server）不应该被重定向。

**解决方案：**
- 添加环境检测：
  ```javascript
  if (process.env.NODE_ENV === 'development') {
    return next()
  }
  ```
- 或添加白名单：
  ```javascript
  const whitelist = ['localhost', '127.0.0.1']
  const currentHostname = req.hostname
  if (whitelist.includes(currentHostname)) {
    return next()
  }
  ```

### 5. 端口问题

**注意：**
- `preferredHost` 必须包含端口号（如果不是默认端口）
- 例如：`http://192.168.1.100:3000`（需要端口）
- 例外：`https://myapp.com`（443端口可省略）

### 6. 子路径保持

**确保：**
重定向时保持原有的路径、查询参数和哈希：
```javascript
const newUrl = preferredHost + req.originalUrl
// req.originalUrl 包含了完整的路径、查询参数
```

---

## 🔄 工作流程

### 1. 管理员配置流程

```
1. 访问系统设置页面
   ↓
2. 在"访问地址配置"卡片中
   - 填写首选访问地址：http://192.168.1.100:3000
   - 勾选"启用自动跳转"
   ↓
3. 点击"保存配置"
   ↓
4. 配置保存到 data/config.json
   ↓
5. 显示成功提示
```

### 2. 用户访问流程

```
用户通过 http://localhost:3000 访问
        ↓
后端检测到 enableHostRedirect = true
        ↓
比较当前 host 与 preferredHost
  localhost:3000 ≠ 192.168.1.100:3000
        ↓
返回 302 重定向响应
  Location: http://192.168.1.100:3000
        ↓
浏览器自动跳转到首选地址
        ↓
用户看到的地址栏变为：http://192.168.1.100:3000
```

### 3. API 请求流程

```
前端发起 API 请求：GET /api/projects
        ↓
后端中间件检测到 path 为 /api/projects
        ↓
跳过重定向逻辑 (req.path.startsWith('/api/'))
        ↓
正常处理 API 请求
        ↓
返回数据
```

---

## 📊 技术选型对比

| 方案 | 实现难度 | 可靠性 | 性能 | 用户体验 | SEO | 推荐度 |
|------|---------|--------|------|----------|-----|--------|
| 后端重定向 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 前端跳转 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 混合方案 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**推荐：混合方案**（后端重定向页面请求，跳过 API 请求）

---

## 🎨 界面设计

### 设置页面效果图

```
┌────────────────────────────────────────────────────┐
│ 访问地址配置                                          │
├────────────────────────────────────────────────────┤
│ 配置首选访问地址，其他地址访问时将自动跳转                │
│                                                    │
│ 首选访问地址                                         │
│ ┌──────────────────────────────────────────────┐   │
│ │ http://192.168.1.100:3000                   │   │
│ └──────────────────────────────────────────────┘   │
│ 完整的 URL，包含协议和端口。留空则不限制访问地址。       │
│                                                    │
│ ☑ 启用自动跳转                                      │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ ℹ️ 当前访问地址: http://localhost:3000        │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ [ 💾 保存配置 ]                                     │
└────────────────────────────────────────────────────┘
```

### 配置示例

**示例 1：局域网 IP**
- 首选访问地址：`http://192.168.1.100:3000`
- 效果：所有通过 localhost、127.0.0.1 等访问的用户会跳转到局域网 IP

**示例 2：域名**
- 首选访问地址：`https://myapp.com`
- 效果：所有通过 IP 访问的用户会跳转到域名

**示例 3：禁用跳转**
- 首选访问地址：留空
- 启用自动跳转：取消勾选
- 效果：允许通过任何地址访问

---

## 🧪 测试场景

### 测试用例 1：基本重定向

**前置条件：**
- preferredHost = `http://192.168.1.100:3000`
- enableHostRedirect = true

**测试步骤：**
1. 访问 `http://localhost:3000`
2. 观察浏览器地址栏

**预期结果：**
- 浏览器自动跳转到 `http://192.168.1.100:3000`
- 页面正常显示

### 测试用例 2：API 不受影响

**前置条件：**
- 同上

**测试步骤：**
1. 在浏览器控制台执行：
   ```javascript
   fetch('http://localhost:3000/api/system/info').then(r => r.json())
   ```

**预期结果：**
- API 请求正常返回数据
- 没有发生重定向

### 测试用例 3：禁用跳转

**前置条件：**
- preferredHost = `http://192.168.1.100:3000`
- enableHostRedirect = false

**测试步骤：**
1. 访问 `http://localhost:3000`

**预期结果：**
- 没有发生跳转
- 保持在 `http://localhost:3000`

### 测试用例 4：路径保持

**前置条件：**
- preferredHost = `http://192.168.1.100:3000`
- enableHostRedirect = true

**测试步骤：**
1. 访问 `http://localhost:3000/dashboard?tab=projects#section1`

**预期结果：**
- 跳转到 `http://192.168.1.100:3000/dashboard?tab=projects#section1`
- 路径、查询参数、哈希都保持不变

### 测试用例 5：无限循环防护

**前置条件：**
- preferredHost = `http://invalid-host:3000`（无效地址）
- enableHostRedirect = true

**测试步骤：**
1. 访问应用

**预期结果：**
- 不会陷入无限重定向
- 浏览器显示"重定向次数过多"错误（这是浏览器的保护机制）

---

## 📈 性能影响分析

### 重定向开销

**单次重定向：**
- HTTP 302 响应：~50-100ms（取决于网络）
- 客户端处理：~10-20ms
- **总计：~60-120ms**

**影响：**
- 仅首次访问或更换地址时触发
- 后续访问如果直接用首选地址，无额外开销
- 用户可以收藏首选地址避免重定向

### 服务器负载

**中间件检查：**
- 每个页面请求额外检查：~1-2ms
- API 请求快速跳过：<1ms
- **影响：微乎其微**

---

## ✅ 实施建议

### 推荐实现顺序

1. **第一阶段：后端基础**（1-2小时）
   - [ ] 添加配置字段到 `data/config.json`
   - [ ] 实现 `GET /api/system/host-config` 路由
   - [ ] 实现 `POST /api/system/host-config` 路由
   - [ ] 测试配置读写功能

2. **第二阶段：重定向逻辑**（1小时）
   - [ ] 在 `server/index.js` 添加重定向中间件
   - [ ] 测试重定向功能
   - [ ] 确保 API 请求不受影响

3. **第三阶段：前端界面**（2-3小时）
   - [ ] 添加 API 函数到 `src/api/system.js`
   - [ ] 在 `Settings.vue` 添加配置卡片
   - [ ] 添加多语言翻译
   - [ ] 测试界面交互

4. **第四阶段：完善优化**（1小时）
   - [ ] 添加 URL 格式验证
   - [ ] 添加错误处理
   - [ ] 添加用户提示
   - [ ] 完整测试所有场景

**总计：5-7小时**

---

## 🔒 安全考虑

### 1. URL 验证

**防止 XSS 攻击：**
```javascript
// 后端验证
if (preferredHost) {
  try {
    const url = new URL(preferredHost)
    // 只允许 http 和 https 协议
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' })
  }
}
```

### 2. 权限控制

**只有管理员可以修改：**
- 使用 `authMiddleware` 保护配置接口
- 前端设置页面需要登录才能访问

### 3. 开放重定向防护

**防止被用于钓鱼：**
```javascript
// 确保重定向地址是配置的地址，不是用户提交的
// 不要使用 req.query.redirect 之类的用户输入
```

---

## 📝 总结

### 核心实现要点

1. **配置存储**：`data/config.json` 中存储 `preferredHost` 和 `enableHostRedirect`
2. **后端重定向**：Express 中间件检测并重定向非首选地址
3. **API 豁免**：跳过所有 `/api/*` 请求的重定向
4. **前端界面**：Settings 页面提供配置界面
5. **开关控制**：支持启用/禁用自动跳转

### 推荐配置

- **方案**：混合方案（后端重定向 + API 豁免）
- **重定向类型**：302（临时重定向）
- **生效范围**：页面请求
- **豁免范围**：API 请求、健康检查

### 优势

- ✅ 可靠性高
- ✅ 用户体验好
- ✅ 实现相对简单
- ✅ 维护成本低
- ✅ SEO 友好
- ✅ 性能影响小

---

## 📚 参考资料

- [HTTP 重定向 - MDN](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Redirections)
- [Express 中间件文档](https://expressjs.com/en/guide/using-middleware.html)
- [URL API - MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/URL)
- [HTTP 302 状态码](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status/302)

---

**文档版本：** 1.0  
**创建日期：** 2025-01-14  
**作者：** GitHub Copilot  
**适用项目：** SPages
