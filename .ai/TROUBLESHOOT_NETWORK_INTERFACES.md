# 问题排查：网络接口选择只显示 localhost

## 🐛 问题描述

用户报告在添加项目或编辑项目时，服务器地址下拉框只显示 `localhost`，看不到其他网络接口（如局域网 IP）。

## 🔍 问题原因

可能的原因有：

1. **API 调用失败**
   - 网络接口 API 需要认证，未登录时会返回 401
   - 网络问题导致 API 请求失败
   - 后端服务未启动

2. **系统网络配置**
   - 系统确实只有 localhost（不太可能）
   - 网络适配器被禁用

3. **前端错误处理**
   - API 调用失败后降级到只显示 localhost

## ✅ 验证步骤

### 1. 测试网络接口是否正常

运行测试脚本：
```bash
node test-network.js
```

**预期输出示例：**
```
Testing network interfaces...

Processed list:
- Mihomo: 198.18.0.1 (external)
- 以太网: 192.168.2.13 (external)
- Loopback Pseudo-Interface 1: 127.0.0.1 (internal)
```

如果只显示 127.0.0.1，说明系统确实只有 loopback 接口。

### 2. 检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签页：

**正常情况应该看到：**
```
[AddProject] Loading network interfaces...
[AddProject] Network interfaces response: { interfaces: [...] }
[AddProject] Network interfaces count: 4
[AddProject] Selected default IP: 192.168.2.13
```

**错误情况会看到：**
```
[AddProject] Failed to load network interfaces: Error: Request failed with status code 401
[AddProject] Error details: Unauthorized
```

### 3. 检查网络请求

在浏览器开发者工具的 Network 标签页中：

1. 刷新添加项目页面
2. 查找 `network-interfaces` 请求
3. 检查状态码：
   - ✅ 200 - 正常
   - ❌ 401 - 未登录
   - ❌ 500 - 服务器错误

## 🔧 解决方案

### 方案 1：确保已登录

最常见的原因是 API 需要认证。

**步骤：**
1. 退出登录
2. 重新登录
3. 再次尝试添加项目

### 方案 2：检查后端服务

确保后端服务正在运行：

```bash
# 启动后端
npm run dev:server
```

### 方案 3：手动测试 API

使用浏览器或 Postman 测试 API：

```
GET http://localhost:3000/api/system/network-interfaces
Headers:
  Authorization: Bearer YOUR_TOKEN
```

**预期响应：**
```json
{
  "interfaces": [
    {
      "name": "localhost",
      "address": "localhost",
      "family": "IPv4",
      "internal": true,
      "description": "本机访问"
    },
    {
      "name": "以太网",
      "address": "192.168.2.13",
      "family": "IPv4",
      "internal": false,
      "description": "局域网地址"
    },
    {
      "name": "Loopback Pseudo-Interface 1",
      "address": "127.0.0.1",
      "family": "IPv4",
      "internal": true,
      "description": "内部地址"
    }
  ]
}
```

### 方案 4：清除浏览器缓存

有时浏览器缓存会导致问题：

1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 方案 5：检查防火墙

确保防火墙没有阻止网络接口查询：

**Windows:**
```powershell
# 检查网络适配器状态
Get-NetAdapter | Select-Object Name, Status, InterfaceDescription
```

## 📊 已添加的调试功能

现在代码中已经添加了详细的调试日志：

### AddProject.vue
```javascript
console.log('[AddProject] Loading network interfaces...')
console.log('[AddProject] Network interfaces response:', response)
console.log('[AddProject] Network interfaces count:', networkInterfaces.value.length)
console.log('[AddProject] Selected default IP:', defaultInterface.address)
```

### EditProjectModal.vue
```javascript
console.log('[EditProjectModal] Loading network interfaces...')
console.log('[EditProjectModal] Network interfaces response:', response)
console.log('[EditProjectModal] Network interfaces count:', networkInterfaces.value.length)
```

### 错误日志
```javascript
console.error('[AddProject] Failed to load network interfaces:', error)
console.error('[AddProject] Error details:', error.response?.data || error.message)
```

## 🎯 快速诊断流程

1. **打开浏览器控制台**
   - 按 F12
   - 切换到 Console 标签

2. **访问添加项目页面**
   - 观察控制台日志

3. **根据日志判断：**

   **看到 "Network interfaces count: 4"**
   - ✅ API 正常工作
   - ✅ 应该能看到多个选项
   - 如果仍然只显示 localhost，可能是前端渲染问题

   **看到 "Failed to load network interfaces"**
   - ❌ API 调用失败
   - 查看 Error details 了解具体原因
   - 可能是认证问题或后端未启动

   **没有看到任何日志**
   - ❌ 页面可能有 JavaScript 错误
   - 检查控制台是否有其他错误信息

## 💡 常见问题

### Q: 为什么需要登录才能获取网络接口？

A: 网络接口信息属于系统敏感信息，需要认证保护。这是出于安全考虑。

### Q: 可以移除认证要求吗？

A: 不推荐，但如果确实需要，可以修改 `server/routes/system.js`：

```javascript
// 移除 authMiddleware
router.get('/network-interfaces', (req, res) => {
  // ... 现有代码
})
```

### Q: 测试脚本显示有多个 IP，但界面还是只显示 localhost？

A: 这说明后端正常，问题在前端 API 调用。检查：
1. 是否已登录
2. Token 是否有效
3. 网络请求是否成功

### Q: 我的系统确实只有 localhost 怎么办？

A: 可能的原因：
- 网络适配器被禁用
- 没有连接到网络
- 虚拟机或容器环境

解决方法：
- 连接网络（WiFi 或以太网）
- 启用网络适配器
- 在虚拟机中配置网络

## 📝 测试验证

运行测试脚本确认系统有多个网络接口：

```bash
cd C:\Users\12189\WebstormProjects\spages
node test-network.js
```

**实际输出（你的系统）：**
```
Processed list:
- Mihomo: 198.18.0.1 (external)
- 以太网: 192.168.2.13 (external)  ← 你的局域网 IP
- Loopback Pseudo-Interface 1: 127.0.0.1 (internal)
```

这证明系统有 3 个 IPv4 地址，应该在界面中显示出来。

## 🎉 预期效果

修复后，下拉框应该显示：

```
┌─────────────────────────────────────────────┐
│ 服务器地址                                   │
├─────────────────────────────────────────────┤
│ localhost - 本机访问                         │
│ 198.18.0.1 - 局域网地址 (Mihomo)            │
│ 192.168.2.13 - 局域网地址 (以太网)          │
│ 127.0.0.1 - 内部地址 (Loopback...)          │
└─────────────────────────────────────────────┘
```

---

**创建日期：** 2025-11-12  
**状态：** 已添加调试日志，等待用户反馈  
**下一步：** 根据浏览器控制台日志确定具体原因

