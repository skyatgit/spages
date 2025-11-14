# SSE 实时日志系统 - 测试指南

## 快速测试步骤

### 1. 启动服务
```bash
# 启动开发服务器（前端+后端）
npm run dev:all

# 或者分别启动
npm run dev          # 前端 (localhost:5173)
npm run dev:server   # 后端 (localhost:3000)
```

### 2. 测试 SSE 连接

#### 方法 1：通过浏览器控制台
1. 打开浏览器访问 `http://localhost:5173`
2. 登录系统
3. 进入任意项目详情页
4. 打开浏览器开发者工具（F12）
5. 查看 Console 标签，应该能看到：
   ```
   [SSE] Log stream connected
   ```

#### 方法 2：通过网络面板
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 进入项目详情页
4. 在网络请求中找到 `logs/stream?token=...`
5. 点击该请求，查看：
   - Type: `eventsource`
   - Status: `200` 或 `pending`（保持连接）
   - Response Headers: `Content-Type: text/event-stream`

### 3. 触发实时日志

#### 方法 1：部署项目
1. 在项目详情页点击"重新部署"按钮
2. 观察日志区域，应该实时显示部署日志
3. 控制台应该显示接收到的日志：
   ```
   [SSE] Log stream connected
   ```

#### 方法 2：使用 curl 测试（需要先获取 token）
```bash
# 1. 获取 token（在浏览器 localStorage 中）
# localStorage.getItem('auth_token')

# 2. 测试 SSE 连接
curl -N "http://localhost:3000/api/projects/proj_xxx/logs/stream?token=YOUR_TOKEN"

# 应该看到：
# data: {"type":"connected","message":"Log stream connected"}
# 
# data: {"timestamp":"...","type":"info","message":"..."}
```

## 验证 SSE 工作正常的标志

### ✅ 成功的指标

1. **连接建立**
   - 控制台输出：`[SSE] Log stream connected`
   - 网络面板显示：Type = `eventsource`

2. **实时接收日志**
   - 部署时，日志立即显示（无 3 秒延迟）
   - 控制台无 404 或连接错误

3. **自动重连**
   - 后端重启后，5 秒内自动重连
   - 控制台输出：`[SSE] Attempting to reconnect...`

4. **服务端日志**
   ```
   [SSE] New subscriber for project proj_xxx, total: 1
   [SSE] Client disconnected from project proj_xxx, remaining: 0
   ```

### ❌ 失败的指标

1. **401 Unauthorized**
   - 原因：token 无效或过期
   - 解决：重新登录获取新 token

2. **404 Not Found**
   - 原因：路由未正确配置
   - 检查：`server/routes/projects-v3.js` 是否有 `/logs/stream` 路由

3. **Connection refused**
   - 原因：后端未启动
   - 解决：运行 `npm run dev:server`

4. **日志仍然每 3 秒刷新**
   - 原因：前端代码未更新
   - 解决：刷新浏览器页面（Ctrl+Shift+R 强制刷新）

## 性能对比测试

### 测试场景
部署一个项目，部署时长约 60 秒，生成约 50 条日志。

### 轮询方式（之前）
```
网络请求数：20 次（每 3 秒一次）
数据传输：20 × 完整日志数组
延迟：0-3 秒
```

### SSE 方式（现在）
```
网络请求数：1 次（建立连接）
数据传输：50 条日志（仅新增数据）
延迟：< 50ms（几乎实时）
```

## 调试技巧

### 1. 查看 SSE 连接状态
```javascript
// 在浏览器控制台运行
console.log('EventSource readyState:', logEventSource?.readyState)
// 0 = CONNECTING
// 1 = OPEN
// 2 = CLOSED
```

### 2. 手动触发重连
```javascript
// 在浏览器控制台运行
if (logEventSource) {
  logEventSource.close()
}
connectLogStream()
```

### 3. 查看服务器端订阅者数量
```javascript
// 在服务器代码中添加日志
console.log('Current subscribers:', logSubscribers.size)
```

### 4. 检查内存使用
```javascript
// 在浏览器控制台查看日志数量
console.log('Current logs count:', deploymentLogs.value.length)
// 应该不超过 1000 条
```

## 常见问题

### Q1: SSE 连接频繁断开重连？
**原因：** 可能是代理服务器（如 Nginx）超时设置过短
**解决：** 
```nginx
# nginx.conf
location /api/projects/ {
    proxy_read_timeout 300s;
    proxy_buffering off;
}
```

### Q2: 日志不更新？
**检查清单：**
1. SSE 连接是否建立？检查网络面板
2. 后端是否在写入日志？检查服务器控制台
3. broadcastLog 是否被调用？添加 console.log 调试

### Q3: 浏览器显示 "Too many EventSource connections"？
**原因：** 浏览器限制同域名 EventSource 连接数（通常 6 个）
**解决：** 
- 关闭不用的项目详情页标签
- 或者在离开页面时正确关闭连接

### Q4: 日志乱序？
**原因：** 网络延迟或时钟不同步
**解决：** 使用 timestamp 字段排序（已在代码中实现）

## 下一步改进建议

1. **日志过滤**：允许用户按类型（info/error/success）过滤
2. **日志搜索**：实时搜索日志内容
3. **日志高亮**：根据日志类型使用不同颜色
4. **性能监控**：显示 SSE 连接状态和数据传输量
5. **批量推送**：将多条日志批量发送，减少消息数量

## 技术细节

### SSE 消息格式
```
data: {"timestamp":"2025-11-12T10:00:00.000Z","type":"info","message":"Starting deployment"}\n\n
```

### 心跳机制（可选）
如果需要保持长连接，可以定期发送心跳：
```javascript
// 服务端每 30 秒发送心跳
setInterval(() => {
  res.write(': heartbeat\n\n')
}, 30000)
```

### 断线重连策略
- 首次断开：立即重连
- 二次断开：5 秒后重连
- 可以实现指数退避策略

