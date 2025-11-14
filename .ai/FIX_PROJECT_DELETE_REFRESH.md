# 修复：项目删除后自动刷新列表

## 🐛 问题描述

**问题：** Dashboard 项目列表在删除项目后不会自动刷新

**原因：** 删除项目时虽然从索引中删除了，但没有通过 SSE 广播删除事件给前端订阅者

## ✅ 解决方案

### 后端修改

#### 1. `server/services/deployment-v3.js`

**新增函数：** `broadcastProjectDeleted()`

```javascript
/**
 * 广播项目删除事件到所有订阅者
 */
export function broadcastProjectDeleted(projectId) {
  console.log(`[SSE] Broadcasting project deleted: ${projectId}`)
  
  // 广播到所有项目列表的订阅者
  if (allProjectsStateSubscribers.size > 0) {
    const message = `data: ${JSON.stringify({ type: 'project.deleted', projectId })}\n\n`
    for (const res of allProjectsStateSubscribers) {
      try {
        res.write(message)
      } catch (error) {
        console.error(`[SSE] Failed to send delete event to subscriber:`, error.message)
        allProjectsStateSubscribers.delete(res)
      }
    }
  }
  
  // 清理该项目的订阅者（如果有）
  const projectSubscribers = projectStateSubscribers.get(projectId)
  if (projectSubscribers) {
    projectStateSubscribers.delete(projectId)
  }
}
```

**功能：**
- 向所有项目列表订阅者广播 `project.deleted` 事件
- 清理被删除项目的所有订阅者

#### 2. `server/routes/projects-v3.js`

**修改：** 删除项目路由

```javascript
// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  // ...existing code...
  
  // Delete from index
  projectIndex.delete(id)

  // 广播项目删除事件到所有 SSE 订阅者
  broadcastProjectDeleted(id)

  res.json({ success: true })
})
```

**新增：**
- 导入 `broadcastProjectDeleted` 函数
- 在删除项目后调用广播函数

### 前端修改

#### `src/views/Dashboard.vue`

**修改：** SSE 消息处理

```javascript
projectsStateEventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data)

    // 处理不同类型的消息
    if (data.type === 'connected') {
      return
    } else if (data.type === 'initial') {
      projects.value = data.data
    } else if (data.type === 'project.update') {
      // 更新项目
      const index = projects.value.findIndex(p => p.id === data.projectId)
      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...data.data }
      }
    } else if (data.type === 'project.deleted') {
      // 项目被删除 ← 新增
      console.log('[SSE] Project deleted:', data.projectId)
      const index = projects.value.findIndex(p => p.id === data.projectId)
      if (index !== -1) {
        projects.value.splice(index, 1)
      }
    }
  } catch (error) {
    console.error('[SSE] Failed to parse projects state data:', error)
  }
}
```

**新增处理逻辑：**
- 监听 `project.deleted` 事件
- 从项目列表中移除被删除的项目
- 使用 `splice` 删除数组元素

## 🎯 工作流程

### 删除项目时的完整流程

1. **用户点击删除**
   ```
   Dashboard → handleDelete() → projectsAPI.deleteProject(id)
   ```

2. **后端处理删除**
   ```
   routes/projects-v3.js → DELETE /:id
   ├─ stopServerV3(id)           # 停止服务器
   ├─ paths.remove()              # 删除文件
   ├─ projectIndex.delete(id)     # 从索引删除
   └─ broadcastProjectDeleted(id) # 广播删除事件 ✅
   ```

3. **SSE 广播**
   ```
   broadcastProjectDeleted()
   └─ 向所有订阅者发送：
      {
        type: 'project.deleted',
        projectId: 'proj_xxx'
      }
   ```

4. **前端接收并更新**
   ```
   Dashboard SSE handler
   └─ 接收 project.deleted 事件
   └─ projects.value.splice(index, 1)  # 从列表移除
   └─ UI 自动刷新 ✅
   ```

## 📊 SSE 事件类型汇总

现在项目支持的所有 SSE 事件类型：

### Dashboard (项目列表流)

| 事件类型 | 描述 | 数据结构 |
|---------|------|---------|
| `connected` | 连接成功 | `{ type, message }` |
| `initial` | 初始项目列表 | `{ type, data: [...] }` |
| `project.update` | 项目状态更新 | `{ type, projectId, data: {...} }` |
| `project.deleted` | 项目被删除 ✅ | `{ type, projectId }` |

### ProjectDetail (单个项目流)

| 事件类型 | 描述 | 数据结构 |
|---------|------|---------|
| `connected` | 连接成功 | `{ type, message }` |
| `state` | 项目状态 | `{ type, data: {...} }` |

### Logs (部署日志流)

| 事件类型 | 描述 | 数据结构 |
|---------|------|---------|
| `connected` | 连接成功 | `{ type, message }` |
| 日志条目 | 部署日志 | `{ timestamp, type, message }` |

## 🧪 测试步骤

1. 打开 Dashboard 页面
2. 打开浏览器控制台
3. 删除一个项目
4. 观察：
   - ✅ 控制台显示：`[SSE] Project deleted: proj_xxx`
   - ✅ 项目从列表中立即消失
   - ✅ 无需刷新页面

## 🎉 效果

### 删除前
- ❌ 删除项目后列表不刷新
- ❌ 需要手动刷新页面
- ❌ 用户体验差

### 删除后
- ✅ 删除项目后列表立即更新
- ✅ 通过 SSE 实时同步
- ✅ 无需刷新页面
- ✅ 完美的用户体验

## 📝 其他改进

### 同时修复的问题

1. **订阅者清理**
   - 删除项目时自动清理该项目的所有状态订阅者
   - 避免内存泄漏

2. **日志输出**
   - 添加详细的删除事件日志
   - 便于调试和追踪

### 代码质量

- ✅ 无编译错误
- ⚠️ 仅有少量代码风格警告（不影响功能）
- ✅ 遵循现有代码风格

---

**修复日期：** 2025-11-12  
**状态：** ✅ 已完成并测试  
**影响范围：** Dashboard 项目列表自动刷新

