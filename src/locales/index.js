import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

// 从 localStorage 获取保存的语言或使用默认值（zh-CN）
const savedLanguage = localStorage.getItem('language') || 'zh-CN'

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: savedLanguage,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n

// 辅助函数：切换语言
export function setLanguage(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem('language', locale)
}

export function getLanguage() {
  return i18n.global.locale.value
}
