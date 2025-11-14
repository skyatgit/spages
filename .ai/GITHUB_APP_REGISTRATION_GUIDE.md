# GitHub App 注册指南

## 概述

本文档详细说明了在 SPages 项目中注册 GitHub App 时需要填写的所有信息及其作用。

## 系统架构说明

**SPages 采用"单管理员 + 多 GitHub 账号"架构：**

- 🔑 **一个管理员**：整个系统只有一个管理员账户
- 📱 **一个共享 GitHub App**：创建一次，多次使用
- 👥 **多个 GitHub 账号**：管理员可以将同一个 App 安装到多个不同的 GitHub 账号
  - 个人 GitHub 账号
  - 公司/组织 GitHub 账号
  - 其他协作账号

**使用场景示例：**
管理员需要部署来自不同 GitHub 账号的项目：
- 个人开源项目 → 使用个人 GitHub 账号授权
- 公司私有项目 → 使用公司 GitHub 账号授权
- 合作项目 → 使用组织 GitHub 账号授权

## 注册流程

在 SPages 系统中，GitHub App 的注册是通过 **GitHub App Manifest Flow** 自动完成的。管理员只需点击"设置 App"按钮，系统会自动生成所需的配置并提交给 GitHub。

## Manifest 字段说明

### 1. **name** (应用名称)
- **值**: `SPages-{uniqueId}` (例如: `SPages-a1b2c3d4`)
- **作用**: GitHub App 的唯一标识名称
- **说明**: 
  - 系统会自动生成一个 8 位字符的唯一 ID (使用 Base62 编码)
  - 组合时间戳和随机数据确保唯一性
  - 用于在 GitHub 上标识这个 App
  - 对用户可见，显示在授权页面和设置中

### 2. **url** (应用主页 URL)
- **值**: 系统当前的访问地址 (例如: `http://192.168.2.13:5173` 或 `http://localhost:5173`)
- **作用**: GitHub App 的主页地址
- **说明**:
  - 从浏览器的 `window.location` 自动获取
  - 用户点击 App 名称时会跳转到这个地址
  - 必须是完整的 URL (包含协议和端口)

### 3. **redirect_url** (重定向 URL)
- **值**: `{baseUrl}/api/github/setup-callback`
- **作用**: GitHub App 创建完成后的回调地址
- **说明**:
  - GitHub 创建 App 后会重定向到这个地址
  - 携带创建的 App 信息 (通过 `code` 参数)
  - 系统在这里接收并保存 App 的凭据 (App ID, Client ID, Client Secret, Private Key 等)

### 4. **callback_urls** (OAuth 回调 URL 列表)
- **值**: `["{baseUrl}/api/github/callback"]`
- **作用**: OAuth 授权流程的回调地址
- **说明**:
  - 用户授权 App 访问其 GitHub 账户后的回调地址
  - 可以配置多个回调地址
  - 必须完全匹配，否则 GitHub 会拒绝回调

### 5. **setup_url** (安装配置 URL)
- **值**: `{baseUrl}/api/github/callback`
- **作用**: 用户安装 App 后的配置页面
- **说明**:
  - 用户完成 App 安装后跳转的地址
  - 可用于引导用户完成额外的配置步骤

### 6. **public** (是否公开)
- **值**: `false`
- **作用**: 控制 App 的可见性
- **说明**:
  - `false`: 私有 App，只有创建者可以安装
  - `true`: 公开 App，任何人都可以安装
  - 对于 SPages 这种个人/团队使用的工具，使用私有模式更安全

### 7. **default_permissions** (默认权限)
- **值**: 
  ```json
  {
    "contents": "read",
    "metadata": "read",
    "emails": "read"
  }
  ```
- **作用**: 定义 App 需要的 GitHub 仓库和用户权限
- **说明**:
  - **contents**: 仓库内容权限
    - `read`: 只读访问，可以克隆代码
    - 用于从 GitHub 拉取项目代码进行部署
  - **metadata**: 仓库元数据权限
    - `read`: 只读访问，可以获取仓库信息
    - 用于读取仓库名称、分支列表等信息
  - **emails**: 用户邮箱权限
    - `read`: 只读访问，可以获取用户邮箱
    - 用于识别和显示用户信息

### 8. **default_events** (默认事件订阅)
- **值**: `[]` (空数组)
- **作用**: 定义 App 订阅的 GitHub webhook 事件
- **说明**:
  - 当前不订阅任何事件
  - 如果需要实时响应代码推送等事件，可以添加如 `["push", "pull_request"]`
  - 需要配置 webhook URL 才能接收事件

### 9. **webhook_url** (Webhook URL) - 未配置
- **值**: 当前版本未配置
- **作用**: 接收 GitHub 事件通知的地址
- **说明**:
  - 在局域网环境下无法配置 (GitHub 无法访问)
  - 部署到公网服务器后可以手动配置
  - 用于实现自动部署等功能

## 注册后获得的信息

当 GitHub App 成功创建后，系统会收到以下信息并保存到 `data/github-app.json`:

### 保存的凭据信息

1. **appId** (应用 ID)
   - GitHub 为 App 分配的唯一数字 ID
   - 用于所有 API 调用中标识这个 App

2. **clientId** (客户端 ID)
   - OAuth 流程中使用的客户端标识符
   - 公开信息，可以在前端使用

3. **clientSecret** (客户端密钥)
   - OAuth 流程中使用的客户端密钥
   - **机密信息**，只能在服务端使用

4. **pem** (私钥)
   - RSA 私钥，用于生成 JWT token
   - **最机密的信息**，用于代表 App 进行 API 调用
   - 用于获取 installation access token

5. **webhookSecret** (Webhook 密钥)
   - 验证 webhook 请求来源的密钥
   - 确保 webhook 请求确实来自 GitHub

6. **slug** (应用标识符)
   - App 的 URL 友好标识符
   - 例如: `spages-a1b2c3d4`
   - 用于构建 App 的 GitHub 地址

7. **htmlUrl** (应用 GitHub 页面)
   - App 在 GitHub 上的设置页面地址
   - 例如: `https://github.com/settings/apps/spages-a1b2c3d4`

8. **baseUrl** (基础 URL)
   - 创建 App 时使用的基础地址
   - 用于后续构建回调 URL 等

9. **createdAt** (创建时间)
   - App 配置的创建时间戳
   - 用于显示和审计

## 权限说明

### 为什么需要这些权限？

1. **Repository contents (read)**
   - **必需**: 是
   - **用途**: 克隆和读取仓库代码
   - **场景**: 部署项目时需要从 GitHub 下载代码

2. **Repository metadata (read)**
   - **必需**: 是
   - **用途**: 获取仓库基本信息、分支列表
   - **场景**: 
     - 在添加项目页面显示仓库信息
     - 获取分支列表供用户选择
     - 验证仓库访问权限

3. **User emails (read)**
   - **必需**: 否
   - **用途**: 获取用户邮箱地址
   - **场景**: 
     - 显示用户账户信息
     - 用于通知或审计日志

### 最小权限原则

当前配置遵循最小权限原则，只请求必要的权限:
- ✅ 只读权限，不会修改用户的代码
- ✅ 不订阅 webhook 事件，不主动监听用户仓库
- ✅ 公开 App，但只有管理员能将 installations 关联到 SPages 系统
- ✅ 即使其他人安装了这个 App，也无法访问您的部署系统

## 安全注意事项

### 🔒 机密信息保护

以下信息是**绝对机密**的，必须妥善保管：

1. **Private Key (pem)**
   - 拥有此密钥可以完全代表 App 进行操作
   - 可以访问所有已安装该 App 的 GitHub 账号
   - 存储在 `data/github-app.json`
   - 不要提交到 Git 仓库
   - 不要通过网络传输
   - 不要在前端代码中使用

2. **Client Secret**
   - OAuth 流程的密钥
   - 只能在服务端使用

3. **Webhook Secret**
   - 验证 webhook 请求的密钥
   - 只能在服务端使用

4. **Installation Access Tokens**
   - 每个 GitHub 账号的访问令牌
   - 可以访问该账号授权的仓库
   - 存储在 `data/github-accounts.json`

### 📁 .gitignore 配置

确保以下文件被 Git 忽略：
```gitignore
data/github-app.json
data/github-accounts.json
data/config.json
```

### 🛡️ 单管理员模式的安全建议

由于只有一个管理员，安全性完全依赖于：

1. **管理员账号密码的强度**
   - 使用强密码（至少 12 位，包含大小写字母、数字、符号）
   - 定期更换密码
   - 不要与其他网站共用密码

2. **服务器访问控制**
   - 如果部署在公网，必须配置防火墙
   - 限制访问 IP（如果可能）
   - 使用 HTTPS（如果在公网）

3. **数据文件的权限**
   - 确保 `data/` 目录只有运行程序的用户可以访问
   - Linux/Mac: `chmod 600 data/*.json`
   - Windows: 设置文件权限只允许当前用户访问

4. **备份机密信息**
   - 将 `data/github-app.json` 备份到安全的地方
   - 如果丢失私钥，需要重新创建 App 并重新授权所有账号

5. **定期审计**
   - 定期检查已授权的 GitHub 账号列表
   - 删除不再使用的账号授权

## 使用流程

### 1. 创建 GitHub App (管理员一次性操作)
1. 管理员在"设置"页面点击"设置 GitHub App"
2. 系统自动生成配置并跳转到 GitHub
3. 在 GitHub 上确认创建 App
4. GitHub 回调并保存 App 凭据
5. 完成配置

### 2. 安装 App 到不同的 GitHub 账号 (可多次操作)
管理员可以将同一个 App 安装到多个 GitHub 账号：

**安装到个人账号：**
1. 在"设置"页面点击"添加账户"
2. 登录个人 GitHub 账号
3. 选择授权哪些仓库 (全部或指定仓库)
4. 确认安装

**安装到公司/组织账号：**
1. 在"设置"页面再次点击"添加账户"
2. 登录公司/组织 GitHub 账号
3. 选择授权哪些仓库
4. 确认安装

**可以继续添加更多账号...**

### 3. 使用已授权的账号部署项目
1. 在"添加项目"页面选择要使用的 GitHub 账号
2. 从该账号授权的仓库中选择项目
3. 配置项目并部署

### 数据存储结构

```json
// data/github-app.json - 单一共享 App
{
  "configured": true,
  "appId": "123456",
  "slug": "spages-a1b2c3d4",
  ...
}

// data/github-accounts.json - 多个账号的 installations
{
  "install_001": {
    "username": "my-personal",      // 个人账号
    "installationId": "12345",
    ...
  },
  "install_002": {
    "username": "my-company",       // 公司账号
    "installationId": "67890",
    ...
  },
  "install_003": {
    "username": "some-org",         // 组织账号
    "installationId": "11223",
    ...
  }
}
```

## 常见问题

### Q1: 为什么要创建 GitHub App 而不是使用 Personal Access Token?
**A**: GitHub App 相比 PAT 有以下优势:
- ✅ 更精细的权限控制
- ✅ 更高的 API 速率限制
- ✅ 可以安装到多个账号（个人、组织、公司）
- ✅ 凭据自动过期和刷新
- ✅ 更好的安全审计

### Q2: App 名称可以修改吗?
**A**: 可以，在 GitHub App 设置页面可以修改名称，但 slug 不会改变。

### Q3: 如果私钥泄露了怎么办?
**A**: 
1. 立即在 GitHub 上删除该 App
2. 撤销所有使用该 App 的授权
3. 重新创建一个新的 GitHub App
4. 重新安装到所有需要的 GitHub 账号

### Q4: 我能添加多少个 GitHub 账号?
**A**: 理论上没有限制，您可以：
- 添加个人 GitHub 账号
- 添加公司 GitHub 账号
- 添加多个组织账号
- 添加协作项目的账号

只要是同一个 GitHub App 可以安装到的账号都可以添加。

### Q5: 为什么没有配置 webhook?
**A**: 在局域网环境下，GitHub 无法访问本地服务器。部署到公网后可以手动在 GitHub App 设置中配置 webhook URL。

### Q6: 是否支持多个管理员？
**A**: 当前设计是单管理员模式。如果需要多管理员，建议：
- 方案1: 共享管理员账号密码（不推荐）
- 方案2: 修改代码增加用户管理系统（需要二次开发）
- 方案3: 使用团队 GitHub 账号，多人共同管理

### Q7: 不同 GitHub 账号的项目可以同时部署吗？
**A**: 完全可以！例如：
- 项目A 使用个人账号的仓库 → 端口 3001
- 项目B 使用公司账号的仓库 → 端口 3002
- 项目C 使用组织账号的仓库 → 端口 3003

它们互不干扰，同时运行。

### Q8: App 设置为公开（public: true）安全吗？
**A**: 完全安全！理解以下几点：

**为什么要设置为公开？**
- 需要将 App 安装到不同的 GitHub 账号（个人、组织、公司）
- 有些组织账号您可能不是所有者，需要其他人批准安装
- 提供最大的灵活性

**安全性保证：**
1. **即使其他人安装了您的 App，他们也无法：**
   - ❌ 访问您的 SPages 部署系统
   - ❌ 看到您的项目列表
   - ❌ 使用您的服务器资源

2. **原因：**
   - 只有通过 SPages 系统（需要管理员密码）添加的 installation 才会被识别
   - App 的私钥只存储在您的服务器上
   - 其他人安装后的 installation 与您的系统完全隔离

3. **类比：**
   - 就像 Vercel、Netlify 这些平台的 GitHub App 也是公开的
   - 任何人都可以安装，但每个人有自己独立的账户和数据
   - 您的 SPages 系统只认识您添加的 installations

**最坏情况：**
如果有人恶意安装您的 App，他们最多只能：
- 看到 App 的名称（如 `SPages-a1b2c3d4`）
- 授权 App 访问他们自己的仓库
- 但这些数据不会进入您的系统，因为您没有添加他们的 installation

## 相关文件

- **配置文件**: `data/github-app.json`
- **后端路由**: `server/routes/github.js`
- **前端页面**: `src/views/Settings.vue`
- **配置管理**: `server/utils/config.js`

## 参考资料

- [GitHub Apps 官方文档](https://docs.github.com/en/apps)
- [GitHub App Manifest Flow](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/creating-a-github-app-from-a-manifest)
- [GitHub App 权限列表](https://docs.github.com/en/rest/overview/permissions-required-for-github-apps)

---

**最后更新**: 2025-01-14
**版本**: 1.0

