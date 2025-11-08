# GitHub App Manifest 使用说明

## 什么是 GitHub App Manifest Flow？

SPages 使用 **GitHub App Manifest Flow**，这意味着：
- ✅ **管理员无需配置**：不需要手动创建 GitHub App 或配置环境变量
- ✅ **用户自动创建**：每个用户点击"连接 GitHub 账号"时，会自动为他们创建专属的 GitHub App
- ✅ **极简体验**：用户只需点击"Create GitHub App" → "Install" → "Authorize"，三步完成

## 工作流程

### 用户视角

1. 用户点击"连接 GitHub 账号"
2. 自动跳转到 GitHub 创建页面，显示：
   ```
   Register new GitHub App

   GitHub App name: SPages-1234567890
   Homepage URL: http://localhost:3000

   Permissions:
   - Repository contents: Read-only
   - Repository metadata: Read-only
   - User email addresses: Read-only

   [Create GitHub App for YOUR_USERNAME] [Cancel]
   ```
3. 用户点击"Create GitHub App"（所有信息已自动填好）
4. GitHub 自动创建 App，并跳转到安装页面：
   ```
   Install SPages-1234567890

   Repository access:
   ○ All repositories
   ○ Only select repositories

   [Install] [Cancel]
   ```
5. 用户选择仓库，点击"Install"
6. 跳转到授权页面，点击"Authorize"
7. 完成！回到设置页面，账号已连接

### 技术流程

1. **前端**：用户点击按钮 → 获取 manifest → 自动提交表单到 GitHub
2. **GitHub**：显示创建确认页面 → 用户确认 → 创建 App → 回调到 `/manifest-callback`
3. **后端**：接收 code → 换取 App 凭证 → 保存 → 重定向到安装页面
4. **GitHub**：用户选择仓库 → 安装 → 回调到 `/callback?setup_action=install`
5. **后端**：重定向到 OAuth 授权
6. **GitHub**：用户授权 → 回调到 `/callback?code=xxx`
7. **后端**：换取 user token → 保存用户信息 → 完成

## 配置要求

### 环境变量（可选）

```bash
# 基础 URL（用于生成回调 URL）
BASE_URL=http://localhost:3000
```

**仅此一项！** 不需要配置 Client ID、Secret 等，这些会在用户创建 App 时自动生成。

### .env 文件示例

```bash
# 开发环境
BASE_URL=http://localhost:3000

# 生产环境
# BASE_URL=https://your-domain.com
```

## 开发环境测试

1. 启动服务器：
   ```bash
   npm run dev:all
   ```

2. 访问 http://localhost:5173

3. 登录并进入"系统设置"

4. 点击"连接 GitHub 账号"

5. 按照提示完成创建 → 安装 → 授权

6. 完成！查看已连接的账号

## 常见问题

### Q: 为什么要用 Manifest Flow？
A:
- 传统方式：管理员创建 App → 配置环境变量 → 用户安装
- Manifest Flow：用户自己创建 → 自动配置 → 自己安装
- 优点：无需管理员配置，每个用户独立

### Q: 每个用户都创建一个 App，会不会很乱？
A: 不会，因为：
- 每个 App 只对创建者可见
- App 名称包含时间戳，避免冲突
- 用户只能看到自己的 App

### Q: 我想修改自动创建的 App 怎么办？
A:
1. 访问 https://github.com/settings/apps
2. 找到你的 App（名字类似 `SPages-1234567890`）
3. 点击"Edit"修改

### Q: 为什么需要三步（创建 → 安装 → 授权）？
A: 这是 GitHub 的安全设计：
- **创建**：确认创建 App
- **安装**：选择授权哪些仓库
- **授权**：授权访问你的账号信息

### Q: 可以跳过某些步骤吗？
A: 不可以，这是 GitHub 的强制流程

### Q: 生产环境怎么配置？
A: 只需修改 `BASE_URL` 环境变量：
   ```bash
   BASE_URL=https://your-domain.com
   ```

### Q: 如果用户取消操作会怎样？
A: 会重定向回设置页面，显示相应错误提示

### Q: 数据存储在哪里？
A:
- App 凭证：`data/github-accounts.json` (包含 App ID、secrets)
- 用户信息：同一文件（包含 username、email、token）

## 安全建议

1. ✅ 不要公开 `data/github-accounts.json` 文件
2. ✅ 确保 `data/` 目录在 `.gitignore` 中
3. ✅ 生产环境使用 HTTPS（`BASE_URL=https://...`）
4. ✅ 定期备份 `data/` 目录
5. ✅ 考虑加密存储敏感信息

## 优势总结

相比传统 OAuth App：
- ❌ 传统：管理员创建 → 配置密钥 → 部署 → 用户使用
- ✅ Manifest：用户点击 → 自动创建 → 直接使用

相比 Personal Access Token：
- ❌ PAT：用户手动创建 → 复制粘贴 → 可能泄露
- ✅ Manifest：全自动 → 无需复制粘贴 → 更安全

## 现在就试试！

1. 启动服务：`npm run dev:all`
2. 打开浏览器：http://localhost:5173
3. 登录并进入"系统设置"
4. 点击"连接 GitHub 账号"
5. 按提示操作
6. 完成！
