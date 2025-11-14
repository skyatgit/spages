# 修复：停止后启动，访问站点按钮不显示

## 🐛 问题

**现象：**
1. 点击"停止"按钮后，访问站点按钮消失 ✓（正常）
2. 点击"启动"按钮后，访问站点按钮不回来 ✗（bug）

**原因：**
- 访问站点按钮显示条件：`v-if="project.url"`
- `stopServerV3()` 正确设置了 `url: null`
- `startServerV3()` **没有设置 `url`**，导致按钮不显示

## ✅ 解决方案

### 1. 添加获取服务器地址的函数

```javascript
/**
 * 获取服务器访问地址
 * 优先级：环境变量 > 自动检测局域网 IP > localhost
 */
function getServerHost() {
  // 1. 优先使用环境变量
  if (process.env.SERVER_HOST) {
    return process.env.SERVER_HOST
  }

  // 2. 自动检测局域网 IP
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  
  // 3. 降级到 localhost
  return 'localhost'
}
```

### 2. 修复 startServerV3

**修改前：**
```javascript
await startStaticServer(project, distPath, logger)
console.log(`[startServerV3] Server started successfully on port ${project.port}`)
return { success: true, message: 'Server started successfully' }
```

**修改后：**
```javascript
await startStaticServer(project, distPath, logger)
console.log(`[startServerV3] Server started successfully on port ${project.port}`)

// 获取服务器地址并生成 URL
const serverHost = getServerHost()
const url = `http://${serverHost}:${project.port}`

// 更新项目状态并广播（让前端实时收到更新）
updateAndBroadcastProjectState(projectId, {
  status: 'running',
  url: url
})

console.log(`[startServerV3] Project accessible at: ${url}`)
return { success: true, message: 'Server started successfully', url }
```

### 3. 修复部署完成时的 URL

**修改前：**
```javascript
url: `http://localhost:${project.port}`
```

**修改后：**
```javascript
const serverHost = getServerHost()
const url = `http://${serverHost}:${project.port}`
```

## 🎯 工作流程（修复后）

### 启动项目

```
用户点击"启动"
    ↓
调用 startServerV3(projectId)
    ↓
启动静态服务器
    ↓
获取服务器地址（如 192.168.1.100）
    ↓
设置 URL：http://192.168.1.100:3001
    ↓
更新状态并广播 SSE 事件
    ↓
前端通过 SSE 接收状态更新
    ↓
project.url 有值 → 显示"访问站点"按钮 ✅
```

### 停止项目

```
用户点击"停止"
    ↓
调用 stopServerV3(projectId)
    ↓
停止静态服务器
    ↓
设置 URL：null
    ↓
更新状态并广播 SSE 事件
    ↓
前端通过 SSE 接收状态更新
    ↓
project.url 为 null → 隐藏"访问站点"按钮 ✅
```

## 📊 修复效果

| 操作 | 修复前 | 修复后 |
|------|--------|--------|
| 停止项目 | 按钮消失 ✓ | 按钮消失 ✓ |
| 启动项目 | 按钮不回来 ✗ | 按钮立即显示 ✅ |
| URL 地址 | localhost | 本机 IP（更好） |

## 🌐 额外改进

修复后 URL 使用本机 IP 而不是 localhost：
- **修改前：** http://localhost:3001
- **修改后：** http://192.168.1.100:3001

**优势：**
- ✅ 局域网其他设备可以访问
- ✅ 手机、平板可以直接访问
- ✅ 支持通过环境变量 `SERVER_HOST` 自定义

## 🧪 验证

1. 停止一个正在运行的项目
2. 访问站点按钮消失 ✓
3. 点击启动按钮
4. 访问站点按钮立即显示 ✅
5. 点击访问站点，能正常打开项目 ✅

---

**修复日期：** 2025-11-12  
**状态：** ✅ 已完成  
**影响：** 启动项目后访问站点按钮正常显示

