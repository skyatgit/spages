# 功能实现：项目创建和设置时配置 IP 和端口

## 🎉 功能完成

已成功实现在项目创建和设置时可以自定义服务器 IP 地址和端口。

## 📋 实现内容

### 1. 后端 API

#### `server/routes/system.js`

**新增 API：**
```javascript
GET /api/system/network-interfaces
```

**功能：**
- 获取服务器所有可用的网络接口
- 返回 IPv4 地址列表
- 包括 localhost 和局域网 IP

**返回示例：**
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
      "name": "en0",
      "address": "192.168.1.100",
      "family": "IPv4",
      "internal": false,
      "description": "局域网地址"
    }
  ]
}
```

### 2. 前端 API 调用

#### `src/api/system.js`

**新增函数：**
```javascript
export const getNetworkInterfaces = async () => {
  const response = await apiClient.get('/system/network-interfaces')
  return response.data
}
```

### 3. 添加项目页面

#### `src/views/AddProject.vue`

**新增状态：**
- `serverHost` - 选择的服务器 IP
- `networkInterfaces` - 可用的网络接口列表

**新增功能：**
- 页面加载时自动获取网络接口列表
- 默认选择第一个非内部地址（局域网 IP）
- 提供下拉选择框供用户选择

**UI 新增：**
```vue
<div class="form-group">
  <label>服务器地址</label>
  <select v-model="serverHost" class="form-select">
    <option v-for="iface in networkInterfaces" :key="iface.address" :value="iface.address">
      {{ iface.address }} - {{ iface.description }} ({{ iface.name }})
    </option>
  </select>
  <p class="help-text">选择项目访问时使用的 IP 地址</p>
</div>
```

**创建项目时传递：**
```javascript
await createProject({
  name: projectName.value,
  accountId: selectedAccount.value,
  repository: selectedRepo.value.fullName,
  owner,
  repo,
  branch: branch.value,
  serverHost: serverHost.value, // ← 传递选择的 IP
  port: port.value
})
```

### 4. 编辑项目模态框

#### `src/components/EditProjectModal.vue`

**新增状态：**
- `formData.serverHost` - 项目的服务器 IP

**新增功能：**
- 加载网络接口列表
- 初始化时显示项目当前配置的 IP
- 用户可以修改 IP

**UI 新增：**
- 与添加项目页面相同的 IP 选择框
- 位于端口输入框之前

### 5. 后端项目创建逻辑

#### `server/routes/projects-v3.js`

**修改：**
```javascript
// 接收 serverHost 参数
const { name, accountId, repository, owner, repo, branch, serverHost, port, ... } = req.body

// 保存到项目配置
const config = {
  id: projectId,
  name,
  accountId,
  repository,
  owner,
  repo,
  branch,
  serverHost: serverHost || null, // ← 保存用户选择的 IP
  port: parseInt(port),
  // ...
}
```

### 6. 后端 URL 生成逻辑

#### `server/services/deployment-v3.js`

**修改 `getServerHost()` 函数：**

**优先级（从高到低）：**
1. **项目配置的 serverHost** - 用户在创建/编辑项目时选择的 IP
2. **环境变量 SERVER_HOST** - 全局配置
3. **自动检测局域网 IP** - 自动查找非内部 IPv4 地址
4. **localhost** - 降级选项

```javascript
function getServerHost(projectId = null) {
  // 1. 如果提供了项目ID，优先使用项目配置的 serverHost
  if (projectId) {
    const projectConfig = new ProjectConfig(projectId)
    const project = projectConfig.read()
    if (project && project.serverHost) {
      return project.serverHost
    }
  }

  // 2. 使用环境变量
  if (process.env.SERVER_HOST) {
    return process.env.SERVER_HOST
  }

  // 3. 自动检测局域网 IP
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  
  // 4. 降级到 localhost
  return 'localhost'
}
```

**调用处更新：**
- `deployProjectV3()` - 部署完成时生成 URL
- `startServerV3()` - 启动项目时生成 URL

```javascript
// 传入 projectId 以使用项目配置
const serverHost = getServerHost(projectId)
const url = `http://${serverHost}:${project.port}`
```

### 7. 国际化翻译

#### 中文 (`src/locales/zh-CN.js`)
```javascript
serverHost: '服务器地址',
serverHostHelp: '选择项目访问时使用的 IP 地址',
```

#### 英文 (`src/locales/en-US.js`)
```javascript
serverHost: 'Server Address',
serverHostHelp: 'Select the IP address for accessing the project',
```

## 🎯 用户使用流程

### 创建新项目

```
1. 用户点击"添加项目"
   ↓
2. 选择 GitHub 仓库和分支
   ↓
3. 配置项目：
   - 项目名称：my-project
   - 服务器地址：192.168.1.100 （下拉选择）
   - 端口：3001
   ↓
4. 点击"添加"
   ↓
5. 项目创建并部署
   ↓
6. 访问地址：http://192.168.1.100:3001
```

### 编辑现有项目

```
1. 在项目详情页点击"设置"
   ↓
2. 修改配置：
   - 服务器地址：从 localhost 改为 192.168.1.100
   - 端口：保持 3001
   ↓
3. 点击"保存"
   ↓
4. 重新部署或重启项目
   ↓
5. 新的访问地址：http://192.168.1.100:3001
```

## 📊 IP 地址优先级示例

### 场景 1：用户选择了特定 IP

**项目配置：**
```json
{
  "serverHost": "192.168.1.100",
  "port": 3001
}
```

**结果：**
```
URL: http://192.168.1.100:3001
```

### 场景 2：项目未配置 IP，使用环境变量

**项目配置：**
```json
{
  "serverHost": null,
  "port": 3001
}
```

**环境变量：**
```bash
SERVER_HOST=api.example.com
```

**结果：**
```
URL: http://api.example.com:3001
```

### 场景 3：自动检测

**项目配置：**
```json
{
  "serverHost": null,
  "port": 3001
}
```

**无环境变量**

**网络接口：**
- lo: 127.0.0.1 (内部)
- eth0: 192.168.1.100 (外部) ← 自动选择

**结果：**
```
URL: http://192.168.1.100:3001
```

## 🌐 可用的 IP 选项示例

用户在创建项目时可以看到：

```
┌──────────────────────────────────────────┐
│ 服务器地址                                │
├──────────────────────────────────────────┤
│ localhost - 本机访问                      │
│ 127.0.0.1 - 内部地址 (lo)                │
│ 192.168.1.100 - 局域网地址 (eth0)        │
│ 10.0.0.5 - 局域网地址 (wlan0)            │
└──────────────────────────────────────────┘
```

## ✨ 功能优势

### 1. 灵活性
- ✅ 每个项目可以使用不同的 IP
- ✅ 支持 localhost、局域网 IP、域名等
- ✅ 可以随时修改

### 2. 便利性
- ✅ 下拉选择，无需手动输入
- ✅ 显示网络接口名称和描述
- ✅ 自动默认选择最佳 IP

### 3. 适用场景
- 🏠 **本机开发**：选择 localhost
- 🌐 **局域网测试**：选择 192.168.x.x
- 🌍 **公网访问**：输入域名或公网 IP
- 📱 **移动端测试**：选择局域网 IP

## 🧪 测试场景

### 测试 1：创建项目时选择 localhost

**步骤：**
1. 添加新项目
2. 选择 serverHost = localhost
3. 选择 port = 3001
4. 创建并部署

**预期结果：**
- ✅ 访问站点按钮：http://localhost:3001
- ✅ 只能本机访问

### 测试 2：创建项目时选择局域网 IP

**步骤：**
1. 添加新项目
2. 选择 serverHost = 192.168.1.100
3. 选择 port = 3001
4. 创建并部署

**预期结果：**
- ✅ 访问站点按钮：http://192.168.1.100:3001
- ✅ 局域网内所有设备可访问
- ✅ 手机、平板可直接访问

### 测试 3：修改现有项目的 IP

**步骤：**
1. 打开项目设置
2. 将 serverHost 从 localhost 改为 192.168.1.100
3. 保存并重启项目

**预期结果：**
- ✅ 访问站点按钮更新为：http://192.168.1.100:3001
- ✅ 通过 SSE 实时更新前端显示

## 📝 注意事项

### 1. 端口冲突
- 不同项目可以使用相同 IP 但端口必须不同
- 系统会自动检查端口可用性

### 2. 网络变化
- 如果服务器 IP 变化，需要手动更新项目配置
- 或使用域名替代 IP

### 3. 防火墙
- 确保选择的 IP 和端口在防火墙中已开放
- 特别是使用局域网 IP 时

## 🎉 总结

功能已完全实现：

- ✅ 后端 API 获取网络接口列表
- ✅ 前端添加项目时选择 IP
- ✅ 前端编辑项目时修改 IP
- ✅ 后端保存项目配置的 IP
- ✅ 后端根据配置生成正确的 URL
- ✅ 支持多种 IP 优先级
- ✅ 完整的国际化支持
- ✅ 美观的用户界面

用户现在可以灵活地为每个项目配置不同的访问地址，满足各种部署场景的需求！🚀

---

**实现日期：** 2025-11-12  
**状态：** ✅ 已完成  
**影响：** 项目创建和设置时可配置 IP 和端口

