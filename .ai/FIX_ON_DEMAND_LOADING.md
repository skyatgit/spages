# 修复完成：按需加载网络接口，不缓存数据

## ✅ 问题已解决

### 🐛 原问题

**你的观察：**
```
你在什么时候访问了 http://192.168.2.13:5173/api/system/network-interfaces？
什么时候用的它？
你将它的结果存起来吗？
我希望你什么时候用什么时候调用这个接口
```

**之前的实现（有问题）：**
```javascript
onMounted(async () => {
  await loadGithubAccounts()
  await loadNetworkInterfaces()  // ❌ 页面加载时就调用，然后缓存结果
})
```

**问题：**
1. ❌ API 在页面加载时就被调用
2. ❌ 结果被存储在 `networkInterfaces.value` 中
3. ❌ 之后一直使用缓存的数据，不再调用 API
4. ❌ 如果网络状态改变（如插拔网线），数据不会更新

### ✅ 现在的实现（已修复）

**调用时机：**
```vue
<select 
  v-model="serverHost" 
  class="form-select"
  @focus="loadNetworkInterfaces"  <!-- ✅ 用户点击下拉框时才调用 -->
>
```

**加载逻辑：**
```javascript
const loadNetworkInterfaces = async () => {
  // 每次都清空并重新加载
  networkInterfaces.value = []  // ✅ 清空旧数据
  
  console.log('[AddProject] Loading network interfaces from API...')
  const response = await getNetworkInterfaces()  // ✅ 重新调用 API
  networkInterfaces.value = response.interfaces  // ✅ 使用新数据
}
```

**特点：**
- ✅ **按需调用**：只在用户点击下拉框时才调用 API
- ✅ **不缓存**：每次都清空旧数据并重新获取
- ✅ **实时数据**：总是获取最新的网络接口信息
- ✅ **避免重复**：添加加载状态检查，避免多次并发调用

## 📊 调用时机对比

### 修改前（缓存模式）❌

```
用户打开页面
    ↓
onMounted() 触发
    ↓
调用 loadNetworkInterfaces()
    ↓
获取网络接口：[localhost, 192.168.2.13, ...]
    ↓
存储到 networkInterfaces.value
    ↓
【之后一直使用缓存的数据，不再调用 API】
    ↓
用户点击下拉框 → 显示缓存的数据
用户再次点击 → 还是缓存的数据
网络状态改变 → 数据不更新 ❌
```

### 修改后（按需加载）✅

```
用户打开页面
    ↓
【不调用 API，networkInterfaces = []】
    ↓
用户选择项目配置...
    ↓
用户点击服务器地址下拉框
    ↓
@focus 事件触发
    ↓
调用 loadNetworkInterfaces()
    ↓
清空旧数据：networkInterfaces = []
    ↓
调用 API: GET /api/system/network-interfaces
    ↓
获取最新网络接口：[localhost, 192.168.2.13, ...]
    ↓
更新 networkInterfaces.value
    ↓
下拉框显示最新数据 ✅

【下次点击下拉框时，重复上述流程，获取最新数据】
```

## 🎯 用户体验

### 场景 1：添加项目

```
1. 打开"添加项目"页面
   → 不调用 API

2. 选择仓库和分支
   → 还是不调用 API

3. 点击"服务器地址"下拉框
   → ✅ 此时才调用 API
   → 显示：加载中...
   → 加载完成后显示所有 IP

4. 选择一个 IP

5. 如果网络状态改变（如连接 WiFi）
   → 再次点击下拉框
   → ✅ 重新调用 API
   → 显示最新的网络接口
```

### 场景 2：编辑项目

```
1. 打开项目设置
   → 不调用 API
   → 显示项目当前配置的 IP

2. 点击"服务器地址"下拉框
   → ✅ 此时才调用 API
   → 显示最新的网络接口列表

3. 修改 IP 地址并保存
```

## 🔍 调试信息

### 控制台日志

**用户点击下拉框时，会看到：**

```javascript
[AddProject] Loading network interfaces from API...
[AddProject] Network interfaces response: { interfaces: Array(4) }
[AddProject] Network interfaces count: 4
[AddProject] Network interfaces array: [
  { "name": "localhost", "address": "localhost", ... },
  { "name": "Mihomo", "address": "198.18.0.1", ... },
  { "name": "以太网", "address": "192.168.2.13", ... },
  { "name": "Loopback...", "address": "127.0.0.1", ... }
]
[AddProject] Final networkInterfaces.value: Array(4)
```

### Network 面板

**在浏览器开发者工具的 Network 标签中：**

- **页面加载时**：看不到 `network-interfaces` 请求
- **点击下拉框时**：✅ 看到 `GET /api/system/network-interfaces` 请求
- **再次点击**：✅ 看到新的请求（不是使用缓存）

## 💡 技术实现细节

### 1. @focus 事件

```vue
<select @focus="loadNetworkInterfaces">
```

**作用：**
- 用户点击或聚焦到下拉框时触发
- 自动调用 `loadNetworkInterfaces()` 函数

### 2. 防止重复加载

```javascript
const loadingNetworkInterfaces = ref(false)

const loadNetworkInterfaces = async () => {
  if (loadingNetworkInterfaces.value) {
    console.log('[AddProject] Already loading, skip')
    return  // ✅ 如果正在加载，跳过
  }
  
  loadingNetworkInterfaces.value = true
  try {
    // 加载数据...
  } finally {
    loadingNetworkInterfaces.value = false
  }
}
```

**好处：**
- 避免用户快速点击时发起多个并发请求
- 节省服务器资源

### 3. 清空旧数据

```javascript
networkInterfaces.value = []  // 先清空
const response = await getNetworkInterfaces()  // 再加载
networkInterfaces.value = response.interfaces  // 更新
```

**好处：**
- 确保显示的是最新数据
- 不会混入旧数据

### 4. 加载提示

```vue
<option v-if="networkInterfaces.length === 0" value="">加载中...</option>
```

**效果：**
- 数据加载前显示"加载中..."
- 用户知道正在获取数据

## 📋 修改的文件

### 1. src/views/AddProject.vue

**移除：**
```javascript
// ❌ onMounted 中移除
await loadNetworkInterfaces()
```

**新增：**
```vue
<!-- ✅ 模板中添加 -->
<select @focus="loadNetworkInterfaces">
```

```javascript
// ✅ 添加加载状态
const loadingNetworkInterfaces = ref(false)

// ✅ 修改加载函数
const loadNetworkInterfaces = async () => {
  if (loadingNetworkInterfaces.value) return
  loadingNetworkInterfaces.value = true
  networkInterfaces.value = []  // 清空旧数据
  // ...重新加载
}
```

### 2. src/components/EditProjectModal.vue

**相同的修改：**
- 移除 `onMounted` 中的调用
- 添加 `@focus` 事件
- 每次都清空并重新加载

## 🎉 优势总结

### 1. 性能优化

- ✅ 页面加载更快（不调用不必要的 API）
- ✅ 减少服务器负载（按需调用）
- ✅ 节省网络流量

### 2. 数据实时性

- ✅ 总是获取最新的网络接口
- ✅ 网络状态改变时，数据会更新
- ✅ 不会显示过时的数据

### 3. 用户体验

- ✅ 按需加载，减少不必要的等待
- ✅ 加载提示清晰（"加载中..."）
- ✅ 数据准确可靠

### 4. 可维护性

- ✅ 逻辑清晰：需要时才加载
- ✅ 易于调试：每次调用都有日志
- ✅ 避免缓存问题

## 🧪 测试验证

### 测试步骤

1. **打开浏览器开发者工具**
   - F12 → Network 标签
   - 清空请求列表

2. **打开添加项目页面**
   - ✅ 不应该看到 `network-interfaces` 请求

3. **点击服务器地址下拉框**
   - ✅ 应该看到 `GET /api/system/network-interfaces` 请求
   - ✅ 控制台显示：`Loading network interfaces from API...`

4. **关闭并重新打开下拉框**
   - ✅ 应该看到新的请求（不是 304 缓存）

5. **改变网络状态**
   - 断开网络或切换网络
   - 重新点击下拉框
   - ✅ 应该显示更新后的网络接口

## 📝 总结

**你的需求：**
> "我希望你什么时候用什么时候调用这个接口"

**现在的实现：**
✅ 完全符合你的要求！

- **什么时候用？** 用户点击下拉框时
- **什么时候调用？** 点击时立即调用 API
- **是否缓存？** 不缓存，每次都重新获取
- **数据是否最新？** 总是最新的

---

**修复日期：** 2025-11-12  
**状态：** ✅ 已完成  
**调用方式：** 按需加载，不缓存  
**测试建议：** 清空浏览器缓存后测试

