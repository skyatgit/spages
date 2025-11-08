<template>
  <div class="language-switcher">
    <div class="language-dropdown">
      <div class="language-selected" @click="toggleDropdown">
        <span>{{ currentLanguageLabel }}</span>
        <span class="arrow" :class="{ open: dropdownOpen }">▼</span>
      </div>
      <div v-if="dropdownOpen" class="language-options">
        <div
          v-for="lang in languages"
          :key="lang.code"
          class="language-option"
          :class="{ active: currentLanguage === lang.code }"
          @click="selectLanguage(lang.code)"
        >
          {{ lang.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLanguage } from '@/locales'

const { locale } = useI18n()

const dropdownOpen = ref(false)

const languages = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en-US', label: 'English' }
]

const currentLanguage = computed(() => locale.value)
const currentLanguageLabel = computed(() => {
  const lang = languages.find(l => l.code === currentLanguage.value)
  return lang ? lang.label : '简体中文'
})

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const selectLanguage = (code) => {
  setLanguage(code)
  dropdownOpen.value = false
  // 不需要刷新页面，vue-i18n 会自动更新
}
</script>

<style scoped>
.language-switcher {
  position: relative;
  z-index: 1000;
}

.language-dropdown {
  position: relative;
  min-width: 140px;
}

.language-selected {
  padding: 10px 16px;
  border: 2px solid rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  color: #2c3e50;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.language-selected:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(102, 126, 234, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.arrow {
  margin-left: 8px;
  font-size: 10px;
  transition: transform 0.3s ease;
}

.arrow.open {
  transform: rotate(180deg);
}

.language-options {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.language-option {
  padding: 12px 16px;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.language-option:hover {
  background: rgba(102, 126, 234, 0.15);
}

.language-option.active {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
  font-weight: 600;
}

</style>
