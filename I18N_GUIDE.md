# 国际化（i18n）使用指南

## 已完成的工作

✅ 安装并配置 vue-i18n
✅ 创建中文（zh-CN）和英文（en-US）语言包
✅ 添加语言切换组件（LanguageSwitcher）
✅ 在 Layout 组件中集成语言切换器
✅ 更新 Login 页面使用 i18n

## 如何使用 i18n

### 1. 在模板中使用翻译

```vue
<template>
  <!-- 基本用法 -->
  <h1>{{ $t('dashboard.title') }}</h1>

  <!-- 带变量的翻译 -->
  <p>{{ $t('common.welcome', { name: username }) }}</p>

  <!-- 条件渲染 -->
  <span>{{ isLoading ? $t('common.loading') : $t('common.save') }}</span>
</template>
```

### 2. 在脚本中使用翻译

```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 在函数中使用
const showMessage = () => {
  alert(t('common.success'))
}

// 在变量中使用
const errorMessage = t('login.invalidCredentials')
</script>
```

### 3. 添加新的翻译键

在 `src/locales/zh-CN.js` 和 `src/locales/en-US.js` 中添加相同的键：

```javascript
// zh-CN.js
export default {
  mySection: {
    myKey: '我的翻译'
  }
}

// en-US.js
export default {
  mySection: {
    myKey: 'My Translation'
  }
}
```

## 待更新的页面

以下页面需要更新使用 i18n（参考 Login.vue 的实现方式）：

### Dashboard.vue
替换所有硬编码文本：
- `Projects` → `{{ $t('dashboard.title') }}`
- `Add Project` → `{{ $t('dashboard.addProject') }}`
- `No Projects Yet` → `{{ $t('dashboard.noProjects') }}`
- 等等...

### AddProject.vue
替换所有硬编码文本：
- `Add New Project` → `{{ $t('addProject.title') }}`
- `Select GitHub Account` → `{{ $t('addProject.selectAccount') }}`
- 等等...

### ProjectDetail.vue
替换所有硬编码文本：
- `Project Information` → `{{ $t('projectDetail.projectInfo') }}`
- `Deploy Now` → `{{ $t('projectDetail.deployNow') }}`
- 等等...

### Settings.vue
替换所有硬编码文本：
- `Settings` → `{{ $t('settings.title') }}`
- `Administrator Credentials` → `{{ $t('settings.adminSection') }}`
- 等等...

## 组件更新模板

```vue
<template>
  <Layout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ $t('section.title') }}</h1>
          <p class="subtitle">{{ $t('section.subtitle') }}</p>
        </div>
      </div>
      <!-- 其他内容 -->
    </div>
  </Layout>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import Layout from '@/components/Layout.vue'

const { t } = useI18n()

// 在 alert/confirm 中使用
const handleAction = () => {
  if (confirm(t('section.confirmMessage'))) {
    alert(t('section.successMessage'))
  }
}
</script>
```

## 当前功能

### 语言切换
- 登录页面右上角有语言切换按钮
- 已登录后在左侧导航栏底部有语言切换按钮
- 点击按钮后页面自动刷新应用新语言
- 语言偏好保存在 localStorage

### 默认语言
- 系统默认语言：简体中文（zh-CN）
- 未设置时自动使用中文

## 下一步

你可以选择：
1. 手动更新其余页面（参考 Login.vue）
2. 或者先运行项目查看当前效果，确认满意后再继续更新其他页面

运行命令：
\`\`\`bash
npm install
npm run dev
\`\`\`

然后访问 http://localhost:5173 查看效果。
