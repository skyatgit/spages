# 项目访问方式规划文档

## 📋 文档信息

**创建日期：** 2025-11-12  
**状态：** 📝 规划中（未开始开发）  
**优先级：** 中等  
**预计工作量：** 3-5 天

## 🎯 目标

为 SPages 项目实现多种灵活的访问方式，支持从简单的 IP+端口到复杂的子域名路由，满足不同场景下的部署需求。

## 📊 当前状态

### 已实现功能

- ✅ 支持配置项目使用的 IP 地址（localhost、局域网 IP 等）
- ✅ 支持配置项目使用的端口
- ✅ 每个项目独立端口运行
- ✅ 生成项目访问 URL

### 存在的限制

- ❌ 每个项目必须占用一个独立端口
- ❌ 不支持域名配置
- ❌ 不支持多个项目共享一个端口
- ❌ 不支持基于子域名的路由

## 🚀 规划的访问方式

### 方式 1：直接 IP + 端口访问 ✅（已实现）

**描述：**  
用户直接通过后端服务器的 IP 地址 + 项目端口访问项目。

**访问示例：**
```
http://192.168.1.100:3001  （局域网）
http://123.45.67.89:3001   （公网）
http://localhost:3001      （本机）
http://127.0.0.1:3001      （本机）
```

**使用场景：**
- 开发环境测试
- 局域网内部访问
- 临时部署和演示

**优点：**
- ✅ 实现简单，已经支持
- ✅ 无需配置域名
- ✅ 直接访问，无中间层

**缺点：**
- ❌ 需要记住端口号
- ❌ URL 不够美观
- ❌ 每个项目占用一个端口

**当前状态：** ✅ 已实现

---

### 方式 2：域名 + 端口访问 📝（待实现）

**描述：**  
为后端服务器配置一个主域名，用户通过域名 + 项目端口访问项目。

**访问示例：**
```
http://api.example.com:3001
http://api.example.com:3002
http://api.example.com:3003
```

**使用场景：**
- 小型团队部署
- 测试服务器
- 有固定域名的环境

**技术实现：**

1. **DNS 配置**
   - 配置 A 记录：`api.example.com` → 后端服务器 IP
   - 无需额外配置，端口直接附加在域名后

2. **防火墙配置**
   - 开放所需端口范围（如 3001-3050）
   - 确保公网可访问

3. **项目配置**
   - 添加 `domain` 字段
   - 生成 URL 时使用域名替代 IP

**数据结构：**
```json
{
  "id": "proj_123",
  "name": "my-project",
  "domain": "api.example.com",  // 新增
  "port": 3001,
  "url": "http://api.example.com:3001"
}
```

**优点：**
- ✅ URL 更专业美观
- ✅ 实现简单，只需域名解析
- ✅ 可以使用 HTTPS（配置 SSL 证书）

**缺点：**
- ❌ 仍需记住端口号
- ❌ 每个项目独立端口

**开发工作量：** 1-2 天

**实现优先级：** 低（可选功能）

---

### 方式 3：子域名访问（单域名单端口）📝（待实现 - 推荐）

**描述：**  
为每个项目分配一个独立的子域名，所有子域名都指向后端的同一个端口（如 80 或 443），后端根据请求的子域名路由到对应的项目。

**访问示例：**
```
http://project-a.example.com
http://project-b.example.com
http://project-c.example.com
```

**使用场景：**
- 生产环境部署 ⭐
- 专业级项目
- 需要美观 URL 的场景
- 多项目管理

**技术实现：**

#### 1. DNS 配置

**方案 A：泛域名解析（推荐）**
```
*.example.com  →  123.45.67.89
```
- 所有子域名自动解析到后端服务器
- 无需为每个项目单独配置 DNS

**方案 B：单独配置每个子域名**
```
project-a.example.com  →  123.45.67.89
project-b.example.com  →  123.45.67.89
```

#### 2. 后端架构

**新增组件：反向代理服务**

```
┌─────────────────────────────────────────┐
│          后端服务器 (123.45.67.89)        │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────┐    │
│  │  Nginx / 自建反向代理 (80/443)  │    │
│  │                                 │    │
│  │  根据 Host 头路由：              │    │
│  │  - project-a.example.com → 3001│    │
│  │  - project-b.example.com → 3002│    │
│  │  - project-c.example.com → 3003│    │
│  └────────────────────────────────┘    │
│              ↓   ↓   ↓                  │
│  ┌─────┐  ┌─────┐  ┌─────┐            │
│  │:3001│  │:3002│  │:3003│            │
│  │项目A │  │项目B │  │项目C │            │
│  └─────┘  └─────┘  └─────┘            │
│                                          │
└─────────────────────────────────────────┘
```

#### 3. 数据结构

**项目配置：**
```json
{
  "id": "proj_123",
  "name": "my-project",
  "subdomain": "project-a",           // 新增：子域名前缀
  "baseDomain": "example.com",        // 新增：基础域名
  "port": 3001,                       // 内部端口
  "proxyPort": 80,                    // 新增：代理端口
  "accessMethod": "subdomain",        // 新增：访问方式
  "url": "http://project-a.example.com"
}
```

**全局配置（settings）：**
```json
{
  "proxy": {
    "enabled": true,
    "port": 80,
    "httpsPort": 443,
    "baseDomain": "example.com",
    "sslEnabled": false,
    "sslCertPath": null,
    "sslKeyPath": null
  }
}
```

#### 4. 反向代理实现方案

**方案 A：使用 Nginx（外部）**

优点：
- ✅ 性能最好
- ✅ 成熟稳定
- ✅ 支持完整的 HTTP/HTTPS 功能

缺点：
- ❌ 需要外部配置
- ❌ 配置文件需要手动管理

**Nginx 配置示例：**
```nginx
server {
    listen 80;
    server_name *.example.com;

    location / {
        # 根据子域名路由到不同端口
        # 需要动态生成配置文件
        proxy_pass http://127.0.0.1:$port;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**方案 B：内置 Node.js 反向代理（推荐）**

优点：
- ✅ 完全集成到 SPages
- ✅ 自动配置，无需手动操作
- ✅ 可视化管理

缺点：
- ❌ 性能略低于 Nginx
- ❌ 需要开发实现

**Node.js 实现伪代码：**
```javascript
// server/services/proxy-server.js
import http from 'http'
import httpProxy from 'http-proxy'

class ProxyServer {
  constructor() {
    this.proxy = httpProxy.createProxyServer()
    this.routingTable = new Map() // subdomain -> port
  }

  start(port = 80) {
    const server = http.createServer((req, res) => {
      const host = req.headers.host
      const subdomain = this.extractSubdomain(host)
      const targetPort = this.routingTable.get(subdomain)

      if (targetPort) {
        this.proxy.web(req, res, {
          target: `http://localhost:${targetPort}`
        })
      } else {
        res.writeHead(404)
        res.end('Project not found')
      }
    })

    server.listen(port)
  }

  addRoute(subdomain, port) {
    this.routingTable.set(subdomain, port)
  }

  removeRoute(subdomain) {
    this.routingTable.delete(subdomain)
  }

  extractSubdomain(host) {
    // project-a.example.com -> project-a
    return host.split('.')[0]
  }
}
```

#### 5. UI 界面修改

**添加项目时：**
```
┌─────────────────────────────────────┐
│ 访问方式                             │
├─────────────────────────────────────┤
│ ○ IP + 端口                          │
│ ○ 域名 + 端口                        │
│ ● 子域名（推荐）                     │
└─────────────────────────────────────┘

【子域名配置】
子域名前缀：[project-a      ]
基础域名：  [example.com ▼  ]
代理端口：  [80          ▼  ]

预览 URL：http://project-a.example.com
```

**项目设置：**
- 支持修改子域名前缀
- 支持修改基础域名
- 实时预览 URL 变化

#### 6. SSL/HTTPS 支持

**配置界面：**
```
【HTTPS 配置】
□ 启用 HTTPS
SSL 证书路径：[/path/to/cert.pem]  [浏览]
SSL 密钥路径：[/path/to/key.pem]   [浏览]

□ 自动申请 Let's Encrypt 证书（可选）
```

**优点：**
- ✅ 专业、美观的 URL
- ✅ 所有项目共用 80/443 端口
- ✅ 支持 HTTPS
- ✅ 无需记忆端口
- ✅ 支持泛域名，添加项目无需配置 DNS

**缺点：**
- ❌ 需要域名
- ❌ 实现复杂度较高
- ❌ 需要额外的反向代理层

**开发工作量：** 3-5 天

**实现优先级：** 高（推荐实现）

---

### 方式 4：子域名 + 固定端口 📝（待实现）

**描述：**  
子域名方式的变体，代理服务不使用标准的 80/443 端口，而使用自定义端口（如 8080）。

**访问示例：**
```
http://project-a.example.com:8080
http://project-b.example.com:8080
http://project-c.example.com:8080
```

**使用场景：**
- 80/443 端口被其他服务占用
- 需要与现有服务共存
- 多套环境（开发、测试、生产）

**技术实现：**
- 与方式 3 基本相同
- 仅代理端口不同

**优点：**
- ✅ 灵活性高，可自定义端口
- ✅ 可与现有服务并存

**缺点：**
- ❌ 仍需指定端口
- ❌ URL 略显冗长

**开发工作量：** 与方式 3 同步实现

**实现优先级：** 中（方式 3 的补充）

---

## 🏗️ 实现路线图

### 第一阶段：域名支持（可选）

**功能：**
- 支持为项目配置域名
- 生成 URL 时使用域名替代 IP

**工作量：** 1-2 天

**优先级：** 低

### 第二阶段：内置反向代理（核心）⭐

**功能：**
- 开发内置的反向代理服务
- 支持基于子域名的路由
- 管理路由表

**工作量：** 3-4 天

**优先级：** 高

### 第三阶段：UI 集成

**功能：**
- 添加访问方式选择界面
- 子域名配置界面
- URL 实时预览

**工作量：** 2 天

**优先级：** 高

### 第四阶段：HTTPS 支持

**功能：**
- SSL 证书配置
- HTTPS 代理
- 可选的 Let's Encrypt 集成

**工作量：** 2-3 天

**优先级：** 中

### 第五阶段：Nginx 集成（可选）

**功能：**
- 自动生成 Nginx 配置
- Nginx 配置管理
- 配置文件热重载

**工作量：** 2 天

**优先级：** 低

---

## 📐 技术架构设计

### 数据库结构变更

**项目表 (projects-index.json)：**
```json
{
  "proj_123": {
    "id": "proj_123",
    "name": "my-project",
    
    // 新增字段
    "accessMethod": "subdomain",  // ip-port | domain-port | subdomain
    "domain": "example.com",       // 域名（方式2、3使用）
    "subdomain": "project-a",      // 子域名前缀（方式3使用）
    "proxyPort": 80,              // 代理端口（方式3使用）
    
    // 现有字段
    "serverHost": "192.168.1.100",
    "port": 3001,
    "url": "http://project-a.example.com"
  }
}
```

**全局设置 (data/config.json)：**
```json
{
  "settings": {
    // 现有设置...
    
    // 新增：代理配置
    "proxy": {
      "enabled": true,
      "type": "builtin",          // builtin | nginx
      "port": 80,
      "httpsPort": 443,
      "baseDomain": "example.com",
      "wildcardDNS": true,
      "ssl": {
        "enabled": false,
        "certPath": null,
        "keyPath": null,
        "autoRenew": false
      }
    }
  }
}
```

### 新增文件结构

```
server/
  services/
    proxy-server.js          # 内置反向代理服务
    nginx-manager.js         # Nginx 配置管理（可选）
    ssl-manager.js          # SSL 证书管理
  routes/
    proxy.js                # 代理管理 API
  
src/
  views/
    ProxySettings.vue       # 代理设置页面
  components/
    AccessMethodSelector.vue # 访问方式选择组件
    SubdomainConfig.vue      # 子域名配置组件
```

### API 设计

**代理管理 API：**

```javascript
// 获取代理配置
GET /api/proxy/config

// 更新代理配置
PUT /api/proxy/config

// 启动代理服务
POST /api/proxy/start

// 停止代理服务
POST /api/proxy/stop

// 获取路由表
GET /api/proxy/routes

// 添加路由
POST /api/proxy/routes

// 删除路由
DELETE /api/proxy/routes/:subdomain

// 重载配置
POST /api/proxy/reload
```

---

## 🎨 用户界面设计

### 全局设置页面

**新增"代理设置"标签：**

```
【代理服务配置】

代理类型：
○ 内置代理（推荐）
○ Nginx（需手动配置）

代理端口：
HTTP 端口：  [80      ]
HTTPS 端口： [443     ]

基础域名：
[example.com          ]
□ 启用泛域名解析

【HTTPS 配置】
□ 启用 HTTPS
证书路径：[/path/to/cert.pem] [浏览]
密钥路径：[/path/to/key.pem]  [浏览]
□ 自动续期（Let's Encrypt）

【服务状态】
状态：● 运行中
端口：80, 443
路由数：3

[启动服务] [停止服务] [重载配置]
```

### 添加项目页面

**新增访问方式选择：**

```
【访问方式】
○ IP + 端口（适合开发测试）
  └─ 访问地址：http://192.168.1.100:3001

○ 域名 + 端口（适合小型部署）
  └─ 访问地址：http://api.example.com:3001

● 子域名（推荐，适合生产环境）
  └─ 子域名前缀：[project-a]
  └─ 基础域名：[example.com ▼]
  └─ 访问地址：http://project-a.example.com
```

### 项目详情页面

**显示访问信息：**

```
【访问信息】
访问方式：子域名
访问地址：http://project-a.example.com
内部端口：3001
代理端口：80

[修改访问方式]
```

---

## ⚠️ 注意事项和限制

### DNS 配置要求

**子域名方式必需：**
- 配置泛域名 DNS 记录：`*.example.com → 服务器 IP`
- 或为每个项目单独配置子域名记录

### 端口占用

**方式 1、2：**
- 每个项目占用一个端口（3001-3050）
- 需要开放多个端口

**方式 3、4：**
- 所有项目共用代理端口（80/443）
- 仅需开放代理端口
- 项目仍使用内部端口，但无需对外开放

### 性能考虑

**内置代理 vs Nginx：**
- 内置代理：适合小规模部署（< 10 个项目）
- Nginx：适合大规模部署（> 10 个项目）

### 兼容性

**向后兼容：**
- 现有项目默认使用"IP + 端口"方式
- 可随时切换访问方式
- 不影响现有功能

---

## 🔄 迁移方案

### 从当前版本迁移

**步骤 1：数据结构升级**
```javascript
// 为现有项目添加默认访问方式
{
  "accessMethod": "ip-port",  // 默认值
  "domain": null,
  "subdomain": null,
  "proxyPort": null
}
```

**步骤 2：配置迁移**
```javascript
// 保持现有配置不变
// 新增代理配置为禁用状态
{
  "proxy": {
    "enabled": false
  }
}
```

**步骤 3：逐步启用**
- 用户可选择性启用代理功能
- 现有项目不受影响
- 新项目可选择访问方式

---

## 🧪 测试计划

### 功能测试

1. **IP + 端口方式**
   - ✅ 已实现，回归测试

2. **域名 + 端口方式**
   - 测试域名解析
   - 测试 URL 生成

3. **子域名方式**
   - 测试泛域名路由
   - 测试单个子域名路由
   - 测试路由表更新
   - 测试并发访问

4. **HTTPS 支持**
   - 测试 SSL 证书配置
   - 测试 HTTPS 代理
   - 测试证书续期

### 性能测试

- 代理服务并发能力测试
- 多项目同时访问测试
- 路由表查找性能测试

### 兼容性测试

- 向后兼容性测试
- 数据迁移测试
- 多浏览器测试

---

## 📊 优先级建议

### 立即实现（高优先级）⭐

**方式 3：子域名访问**
- 最实用，最专业
- 适合生产环境
- 用户体验最好

**开发顺序：**
1. 内置反向代理服务（核心）
2. UI 集成
3. 路由管理

### 后续实现（中优先级）

**方式 4：子域名 + 固定端口**
- 作为方式 3 的补充
- 与方式 3 同步实现

**HTTPS 支持**
- 增强安全性
- 生产环境必需

### 可选实现（低优先级）

**方式 2：域名 + 端口**
- 实现简单但实用性一般
- 可以快速实现作为过渡

**Nginx 集成**
- 适合大规模部署
- 可以作为高级功能

---

## 💡 未来扩展可能性

### 1. 自定义路径路由

**示例：**
```
http://example.com/project-a/
http://example.com/project-b/
http://example.com/project-c/
```

### 2. 多域名支持

**示例：**
```
http://app1.example.com
http://app2.another-domain.com
```

### 3. 负载均衡

- 单个项目多实例
- 自动负载均衡

### 4. CDN 集成

- 静态资源 CDN 加速
- 全球分发

### 5. WebSocket 支持

- 代理 WebSocket 连接
- 实时应用支持

---

## 📝 总结

### 推荐实现方案

**优先级排序：**

1. **子域名访问（方式 3）** ⭐⭐⭐⭐⭐
   - 最推荐的方案
   - 适合生产环境
   - 用户体验最佳

2. **HTTPS 支持** ⭐⭐⭐⭐
   - 安全性必需
   - 与方式 3 配合

3. **子域名 + 固定端口（方式 4）** ⭐⭐⭐
   - 作为方式 3 的补充
   - 灵活性高

4. **域名 + 端口（方式 2）** ⭐⭐
   - 可选功能
   - 实现简单

5. **Nginx 集成** ⭐
   - 高级功能
   - 可选实现

### 预计总工作量

- **核心功能（方式 3）**：3-5 天
- **HTTPS 支持**：2-3 天
- **完整实现**：7-10 天

### 下一步行动

1. ✅ 完成本规划文档
2. ⏳ 评审和确认方案
3. ⏳ 创建任务清单
4. ⏳ 开始第一阶段开发

---

**文档版本：** 1.0  
**最后更新：** 2025-11-12  
**作者：** AI Assistant  
**审核状态：** 待审核

