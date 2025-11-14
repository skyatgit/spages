# GitHub App Manifest Flow 详解

## 📋 您的问题确认

**Q: 注册 APP 是用的 POST 还是 GET？**
**A: 使用的是 GET 方式**

**Q: GitHub App Manifest Flow 是通过 POST 还是 GET 方式进行的？**
**A: 向 GitHub 提交 manifest 使用的是 POST 方式（通过浏览器表单自动提交）**

---

## 🔄 完整流程分析

### 步骤 1️⃣: 前端触发（GET 请求）

**文件**: `src/views/Settings.vue`

```javascript
// 用户点击"设置 GitHub App"按钮
const handleSetupGithubApp = async () => {
  const baseUrl = `${window.location.protocol}//${window.location.host}`
  
  // 使用 GET 方式跳转到后端接口
  const setupUrl = `/api/github/setup-app?baseUrl=${encodeURIComponent(baseUrl)}`
  window.location.href = setupUrl  // ← GET 请求
}
```

**方式**: 浏览器 GET 请求到后端

---

### 步骤 2️⃣: 后端接收并生成 Manifest（GET 路由）

**文件**: `server/routes/github.js`

```javascript
// GET 接口（实际使用的）
router.get('/setup-app', async (req, res) => {
  // 1. 读取配置，检查是否已创建
  const appConfig = githubAppConfig.read()
  
  // 2. 生成 manifest 配置
  const manifest = {
    name: `SPages-${uniqueId}`,
    url: baseUrl,
    redirect_url: `${baseUrl}/api/github/setup-callback`,
    callback_urls: [`${baseUrl}/api/github/callback`],
    setup_url: `${baseUrl}/api/github/callback`,
    public: true,
    default_permissions: {
      contents: 'read',
      metadata: 'read',
      emails: 'read'
    },
    default_events: []
  }
  
  // 3. 临时存储 manifest
  const manifestId = Date.now().toString()
  global.pendingSetupManifest[manifestId] = manifest
  
  // 4. 重定向到下一步
  res.redirect(`/api/github/submit-setup-manifest?id=${manifestId}`)
})
```

**方式**: GET 请求 → 生成 manifest → GET 重定向

---

### 步骤 3️⃣: 提交 Manifest 到 GitHub（自动 POST）

**文件**: `server/routes/github.js`

```javascript
// GET 接口，但返回包含自动提交 POST 表单的 HTML
router.get('/submit-setup-manifest', (req, res) => {
  const manifest = global.pendingSetupManifest[id]
  
  // 生成自动提交的 HTML 表单
  const html = `
    <html>
      <body>
        <h2>🚀 Setting up GitHub App...</h2>
        <div class="spinner"></div>
        
        <!-- POST 表单 -->
        <form id="manifest-form" 
              method="POST" 
              action="https://github.com/settings/apps/new?state=${state}">
          <input type="text" name="manifest" id="manifest" style="display:none;">
        </form>
        
        <script>
          // 填充 manifest 数据
          document.getElementById('manifest').value = ${JSON.stringify(manifestJson)};
          // 自动提交表单 → POST 到 GitHub
          document.getElementById('manifest-form').submit();
        </script>
      </body>
    </html>
  `
  
  res.send(html)
})
```

**方式**: GET 请求 → 返回 HTML → 浏览器自动 POST 到 GitHub

**关键**: 
- 后端接收 GET 请求
- 返回包含 JavaScript 的 HTML
- JavaScript 自动提交 POST 表单到 `https://github.com/settings/apps/new`

---

### 步骤 4️⃣: GitHub 处理并回调

**GitHub 的处理**:
1. 接收 POST 请求（manifest 数据）
2. 用户确认创建 App
3. GitHub 创建 App 并生成凭据
4. 重定向回 `redirect_url` 并携带 `code` 参数

**回调 URL**: `${baseUrl}/api/github/setup-callback?code=xxxxx`

---

### 步骤 5️⃣: 后端接收回调并保存凭据（GET 请求）

**文件**: `server/routes/github.js`

```javascript
router.get('/setup-callback', async (req, res) => {
  const { code } = req.query
  
  // 1. 使用 code 向 GitHub 换取 App 凭据
  const response = await axios.post(
    `https://api.github.com/app-manifests/${code}/conversions`
  )
  
  const appData = response.data
  
  // 2. 保存 App 配置
  const appConfig = {
    configured: true,
    appId: appData.id,
    clientId: appData.client_id,
    clientSecret: appData.client_secret,
    webhookSecret: appData.webhook_secret,
    pem: appData.pem,  // 私钥
    slug: appData.slug,
    htmlUrl: appData.html_url,
    baseUrl: baseUrl,
    createdAt: new Date().toISOString()
  }
  
  githubAppConfig.write(appConfig)
  
  // 3. 重定向回设置页面
  res.redirect(`${baseUrl}/settings?success=app_configured`)
})
```

**方式**: GET 请求（GitHub 回调）→ POST 到 GitHub API → 保存数据 → GET 重定向

---

## 🎯 总结对比

### 您实际使用的接口

| 步骤 | 接口 | HTTP 方法 | 说明 |
|------|------|----------|------|
| 1 | `/api/github/setup-app` | **GET** | 前端触发，接收 baseUrl 参数 |
| 2 | `/api/github/submit-setup-manifest` | **GET** | 返回自动提交的 HTML 表单 |
| 3 | `https://github.com/settings/apps/new` | **POST** | 浏览器自动提交到 GitHub |
| 4 | `/api/github/setup-callback` | **GET** | GitHub 回调，保存凭据 |

### 系统中还有的接口（未使用）

| 接口 | HTTP 方法 | 说明 |
|------|----------|------|
| `/api/github/setup-app` | POST | API 版本，需要认证，当前未使用 |
| `/api/github/create-app` | POST | 旧版接口，已废弃 |

---

## 🔍 关键技术点

### 1. **为什么用 GET 而不是 POST？**

**原因**:
- `window.location.href` 只能发起 GET 请求
- 简单直接，不需要构建表单或使用 Ajax
- 适合页面跳转场景

**如果要用 POST**，需要这样写:
```javascript
// 前端需要创建表单
const form = document.createElement('form')
form.method = 'POST'
form.action = '/api/github/setup-app'
// ... 添加字段
document.body.appendChild(form)
form.submit()

// 或者使用 fetch/axios
await axios.post('/api/github/setup-app', { baseUrl })
```

但这样更复杂，没有必要。

### 2. **向 GitHub 提交必须用 POST**

根据 [GitHub App Manifest 官方文档](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/creating-a-github-app-from-a-manifest):

```html
<!-- 必须是 POST 方式 -->
<form method="POST" action="https://github.com/settings/apps/new">
  <input type="text" name="manifest" value="{...manifest JSON...}">
  <button type="submit">Create GitHub App</button>
</form>
```

**GitHub 只接受 POST 请求**，所以必须通过表单提交。

### 3. **为什么要中转（submit-setup-manifest）？**

**直接方式**（不推荐）:
```javascript
// 在 /setup-app 直接返回 HTML 表单
router.get('/setup-app', (req, res) => {
  res.send(`<form>...</form><script>submit()</script>`)
})
```

**中转方式**（当前使用）:
```javascript
// /setup-app 生成并存储 manifest
router.get('/setup-app', (req, res) => {
  const manifestId = Date.now().toString()
  global.pendingSetupManifest[manifestId] = manifest
  res.redirect(`/submit-setup-manifest?id=${manifestId}`)
})

// /submit-setup-manifest 负责提交
router.get('/submit-setup-manifest', (req, res) => {
  const manifest = global.pendingSetupManifest[id]
  res.send(`<form>...</form><script>submit()</script>`)
})
```

**优势**:
- ✅ 职责分离（生成 vs 提交）
- ✅ 可以在中转环节验证 manifest
- ✅ 更好的日志记录
- ✅ 可以处理错误情况

---

## 📊 HTTP 请求流程图

```
浏览器                    后端服务器                     GitHub
  │                          │                            │
  │  GET /setup-app          │                            │
  ├─────────────────────────>│                            │
  │                          │ 生成 manifest              │
  │                          │ 存储到内存                 │
  │                          │                            │
  │  302 重定向               │                            │
  │  /submit-setup-manifest  │                            │
  │<─────────────────────────┤                            │
  │                          │                            │
  │  GET /submit-setup-...   │                            │
  ├─────────────────────────>│                            │
  │                          │ 读取 manifest              │
  │  200 HTML + JS           │ 生成自动提交表单            │
  │<─────────────────────────┤                            │
  │                          │                            │
  │  (浏览器执行 JS)          │                            │
  │  POST manifest           │                            │
  ├────────────────────────────────────────────────────>│
  │                          │                            │ GitHub 处理
  │                          │                            │ 用户确认创建
  │                          │                            │
  │  302 重定向               │                            │
  │  /setup-callback?code=xxx│                            │
  │<────────────────────────────────────────────────────┤
  │                          │                            │
  │  GET /setup-callback     │                            │
  ├─────────────────────────>│                            │
  │                          │ POST /app-manifests/.../conversions
  │                          ├───────────────────────────>│
  │                          │ 返回 App 凭据               │
  │                          │<───────────────────────────┤
  │                          │ 保存到 github-app.json     │
  │  302 重定向               │                            │
  │  /settings?success=...   │                            │
  │<─────────────────────────┤                            │
  │                          │                            │
  │  显示成功页面             │                            │
```

---

## ✅ 最终答案

### 您的注册流程使用的是：

1. **前端到后端**: GET 方式
   - `window.location.href = '/api/github/setup-app?baseUrl=...'`

2. **后端到 GitHub**: POST 方式（通过浏览器表单自动提交）
   - `<form method="POST" action="https://github.com/settings/apps/new">`

3. **GitHub 回调**: GET 方式
   - GitHub 重定向到 `/api/github/setup-callback?code=xxx`

### GitHub App Manifest Flow 官方规定：

- **提交 manifest 到 GitHub**: **必须使用 POST** ✅
- **接收 GitHub 回调**: **使用 GET** ✅

---

**文档创建时间**: 2025-01-14  
**版本**: 1.0

