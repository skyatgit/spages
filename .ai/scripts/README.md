# 测试与工具脚本

本目录包含项目的测试脚本和一次性工具脚本。这些文件被 Git 忽略，不会提交到代码仓库。

## 📁 目录结构

```
.ai/scripts/
├── generate-token.js      # 生成测试用 JWT token
├── migrate-to-v3.js       # V3 迁移脚本（一次性）
└── cleanup.js             # 项目清理脚本
```

---

## 📋 脚本说明

### 1. generate-token.js

**用途**: 生成测试用的 JWT token

**使用场景**:
- 在开发过程中快速生成认证 token
- 测试 API 接口
- 在浏览器控制台设置 localStorage

**运行方法**:
```bash
node .ai/scripts/generate-token.js
```

**输出示例**:
```
=== Test Token Generated ===
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Use this token in browser localStorage
localStorage.setItem("auth_token", "...")
================================
```

**使用方法**:
1. 运行脚本生成 token
2. 复制输出的 token
3. 在浏览器控制台执行 `localStorage.setItem("auth_token", "token")`
4. 刷新页面即可登录

---

### 2. migrate-to-v3.js

**用途**: 将旧项目结构迁移到 V3 版本

**迁移内容**:
- 旧结构: `data/projects.json` + 混合日志
- 新结构: 项目独立配置 + 独立日志目录

**运行方法**:
```bash
node .ai/scripts/migrate-to-v3.js
```

**注意事项**:
- ⚠️ 这是一次性脚本，仅在从旧版本升级时使用
- ⚠️ 运行前建议备份 `data/` 和 `projects/` 目录
- ✅ 迁移完成后不需要再次运行

**迁移流程**:
1. 读取 `data/projects.json`
2. 为每个项目创建独立配置目录 `.spages/`
3. 移动源码到 `source/` 子目录
4. 迁移日志文件到项目目录
5. 创建新的项目索引 `data/projects-index.json`

---

### 3. cleanup.js

**用途**: 清理项目构建产物和临时文件

**清理内容**:
- `dist/` - 前端构建产物
- `dist-release/` - 发布版本构建产物
- `temp-build/` - 临时构建目录
- `data/logs/*.log` - 旧的日志文件

**运行方法**:
```bash
node .ai/scripts/cleanup.js
```

**使用场景**:
- 清理构建缓存
- 重置开发环境
- 释放磁盘空间
- 准备打包发布

**安全性**:
- ✅ 不会删除源代码
- ✅ 不会删除配置文件
- ✅ 不会删除数据库文件
- ✅ 只删除可重新生成的文件

---

## 🔒 Git 忽略

这些脚本存放在 `.ai/` 目录下，该目录已在 `.gitignore` 中配置：

```gitignore
# .gitignore
docs/          # 文档目录（被忽略）
.ai/           # AI 相关文件和脚本（被忽略）
```

**原因**:
1. 测试脚本不应该提交到生产代码库
2. 一次性迁移脚本在完成迁移后不再需要
3. 开发工具脚本可能包含敏感信息或测试数据

---

## 📝 维护说明

### 添加新的测试脚本

如果需要添加新的测试或工具脚本：

1. 在 `.ai/scripts/` 目录下创建文件
2. 文件名使用描述性名称，如 `test-xxx.js` 或 `tool-xxx.js`
3. 在本 README 中添加说明文档
4. 确保脚本包含清晰的注释

### 脚本命名规范

- `generate-*.js` - 生成类脚本
- `test-*.js` - 测试类脚本
- `migrate-*.js` - 迁移类脚本
- `cleanup-*.js` - 清理类脚本
- `tool-*.js` - 通用工具脚本

---

## 🚀 常用命令速查

| 脚本 | 命令 | 用途 |
|------|------|------|
| 生成 Token | `node .ai/scripts/generate-token.js` | 快速生成测试 token |
| 迁移到 V3 | `node .ai/scripts/migrate-to-v3.js` | 一次性迁移（仅升级时） |
| 清理项目 | `node .ai/scripts/cleanup.js` | 清理构建产物 |

---

## ⚠️ 注意事项

1. **不要在生产环境运行这些脚本**
   - 这些是开发和测试用途的脚本
   - 生产环境应使用正式的部署流程

2. **generate-token.js 安全提醒**
   - 生成的 token 仅用于本地测试
   - 不要在生产环境使用默认的 JWT_SECRET
   - 不要将 token 分享给他人

3. **migrate-to-v3.js 使用提醒**
   - 仅在第一次从旧版本升级时运行
   - 运行前务必备份数据
   - 迁移完成后可以删除旧的 `data/projects.json`

4. **cleanup.js 使用提醒**
   - 清理前确保没有正在运行的构建任务
   - 清理后需要重新构建项目
   - 日志文件删除后无法恢复

---

**创建时间**: 2025-01-14  
**维护者**: AI Assistant  
**版本**: 1.0

