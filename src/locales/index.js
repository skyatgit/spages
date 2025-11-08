import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

// Get saved language from localStorage or use default (zh-CN)
const savedLanguage = localStorage.getItem('language') || 'zh-CN'

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: savedLanguage,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n

// Helper function to change language
export function setLanguage(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem('language', locale)
}

export function getLanguage() {
  return i18n.global.locale.value
}
