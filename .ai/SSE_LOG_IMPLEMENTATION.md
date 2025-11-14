# SSE 实时日志系统实现说明

## 概述

已将项目详情页的日志获取方式从**轮询（Polling）**升级为 **Server-Sent Events (SSE)** 实时推送。

## 改进对比

### 之前（轮询方式）
- ❌ 每 3 秒请求一次 `/api/projects/:id/logs`
- ❌ 即使没有新日志也会发起请求
- ❌ 延迟最高 3 秒
- ❌ 网络消耗高
- ❌ 服务器压力大（多个项目同时查看时）

### 现在（SSE 实时推送）
- ✅ 建立单个长连接到 `/api/projects/:id/logs/stream`
- ✅ 只在有新日志时才推送数据
- ✅ 毫秒级延迟（几乎实时）
- ✅ 网络消耗低（只传输新数据）
- ✅ 服务器压力小
- ✅ 自动重连机制（连接断开 5 秒后重试）
- ✅ 内存保护（前端最多保留 1000 条日志）

## 技术实现

### 后端改动

1. **deployment-v3.js**
   - 添加 `logSubscribers` Map 管理 SSE 订阅者
   - 修改 `DeploymentLogger` 类，在写入日志时实时广播
   - 添加 `broadcastLog()` 函数推送日志到所有订阅者
   - 添加 `subscribeToLogs()` 和 `unsubscribeFromLogs()` 管理订阅

2. **routes/projects-v3.js**
   - 新增 SSE 路由：`GET /api/projects/:id/logs/stream`
   - 支持通过 URL 参数传递 token（EventSource 不支持自定义 headers）
   - 发送历史日志（最近 10 条）
   - 自动处理连接关闭和清理

### 前端改动

1. **views/ProjectDetail.vue**
   - 移除日志轮询定时器 `logsRefreshInterval`
   - 添加 SSE 连接管理 `logEventSource`
   - 新增 `connectLogStream()` 函数建立 SSE 连接
   - 自动重连机制
   - 组件卸载时自动关闭连接

## 使用方式

### 前端连接 SSE

```javascript
// 在组件挂载时连接
const connectLogStream = () => {
  const token = localStorage.getItem('auth_token')
  const url = `/api/projects/${projectId}/logs/stream?token=${encodeURIComponent(token)}`
  
  logEventSource = new EventSource(url)
  
  logEventSource.onmessage = (event) => {
    const log = JSON.parse(event.data)
    deploymentLogs.value.push(log)
  }
  
  logEventSource.onerror = () => {
    // 5秒后重连
    setTimeout(connectLogStream, 5000)
  }
}

// 在组件卸载时断开
onUnmounted(() => {
  if (logEventSource) {
    logEventSource.close()
  }
})
```

### 后端广播日志

```javascript
// 在部署过程中记录日志时自动广播
logger.info('Installing dependencies...')  // 会自动推送到所有订阅者
logger.success('Build completed!')         // 会自动推送到所有订阅者
logger.error('Deployment failed!')         // 会自动推送到所有订阅者
```

## API 端点

### SSE 日志流
```
GET /api/projects/:id/logs/stream?token=<auth_token>
```

**响应格式（SSE）：**
```
data: {"type":"connected","message":"Log stream connected"}

data: {"timestamp":"2025-11-12T10:00:00.000Z","type":"info","message":"Starting deployment"}

data: {"timestamp":"2025-11-12T10:00:05.000Z","type":"success","message":"Deployment completed"}
```

## 测试

1. 启动服务器：`npm run dev:all`
2. 打开项目详情页
3. 触发部署操作
4. 观察日志实时显示（无延迟）
5. 打开浏览器控制台，查看 `[SSE]` 相关日志

## 性能优势

假设有 5 个用户同时查看一个正在部署的项目（部署时长 60 秒）：

### 轮询方式
- 请求次数：5 用户 × 20 次/分钟 = **100 次请求**
- 数据传输：100 次 × 完整日志大小

### SSE 方式
- 连接数：**5 个长连接**
- 数据传输：只传输新增的日志行
- 网络消耗降低：**约 80-90%**

## 注意事项

1. **浏览器兼容性**：SSE 在所有现代浏览器中都支持（IE 除外）
2. **代理配置**：如果使用 Nginx 等反向代理，需要禁用缓冲
3. **连接限制**：浏览器对同一域名的 SSE 连接数有限制（通常 6 个）
4. **内存管理**：前端限制最多保存 1000 条日志，避免内存溢出

## 未来改进

- [ ] 支持日志过滤（按类型、关键词）
- [ ] 支持日志高亮和搜索
- [ ] 添加日志统计信息
- [ ] 支持多项目日志聚合视图

