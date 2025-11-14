# .cursorrules 文件说明

## 什么是 .cursorrules？

`.cursorrules` 是一个业界公认的配置文件，用于告诉 AI 助手（如 Cursor、GitHub Copilot、Claude 等）关于项目的规则和约定。

## 文件位置

```
spages/
├── .cursorrules          ✅ 在项目根目录
└── docs/
    └── CURSORRULES_INFO.md   （本文件）
```

## 作用

当 AI 助手在项目中工作时，会自动读取 `.cursorrules` 文件，了解：

1. **项目信息** - 技术栈、架构、目录结构
2. **代码规范** - 命名约定、代码风格、注释要求
3. **文档规范** - 文档放置位置、管理规则
4. **禁止操作** - 不应该做的事情
5. **推荐操作** - 最佳实践
6. **快速参考** - 关键文件和组件位置

## 本项目的重要规则

### 1. 文档管理（最重要）
- ✅ 项目根目录只允许 `README.md`
- ✅ 所有其他技术文档必须放在 `docs/` 目录
- ✅ AI 创建文档时会自动遵守此规则

### 2. 语言要求
- 🇨🇳 始终使用中文与用户交流
- 🇨🇳 代码注释使用中文

### 3. 行动优先
- 💪 AI 能做就做，不问不必要的问题
- 💪 一次性完成任务，不分步骤

### 4. SSE 实时日志
- ⚡ 项目详情页使用 SSE 推送日志
- ⚡ 不使用轮询方式

## 如何更新规则

1. 编辑 `.cursorrules` 文件
2. 添加或修改规则
3. 提交到 Git（这个文件应该被团队共享）

## AI 兼容性

此文件被以下 AI 工具支持：
- ✅ Cursor AI
- ✅ GitHub Copilot
- ✅ Claude (Anthropic)
- ✅ 其他支持 .cursorrules 的 AI 编程助手

## 相关文件

- `.cursorrules` - AI 规则文件（根目录）
- `docs/DOCUMENTATION_RULES.md` - 文档管理详细规范
- `README.md` - 项目主文档

---

**创建日期：** 2025-11-12  
**用途：** 解释 .cursorrules 文件的作用和使用方法

