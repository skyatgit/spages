<template>
  <div class="language-switcher">
    <button
      v-for="lang in languages"
      :key="lang.code"
      class="lang-btn"
      :class="{ active: currentLanguage === lang.code }"
      @click="switchLanguage(lang.code)"
      :title="lang.name"
    >
      {{ lang.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLanguage } from '@/locales'

const { locale } = useI18n()

const languages = [
  { code: 'zh-CN', label: '中文', name: '简体中文' },
  { code: 'en-US', label: 'EN', name: 'English' }
]

const currentLanguage = computed(() => locale.value)

const switchLanguage = (lang) => {
  setLanguage(lang)
  // Force page reload to apply language change to all components
  window.location.reload()
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  gap: 8px;
  align-items: center;
}

.lang-btn {
  padding: 6px 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lang-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
  color: white;
}

.lang-btn.active {
  background: white;
  color: #2c3e50;
  border-color: white;
}
</style>
