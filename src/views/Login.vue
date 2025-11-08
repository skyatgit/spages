<template>
  <div class="login-container">
    <div class="language-switcher-top">
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

    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <h1>SPages</h1>
            <p>Deploy Platform</p>
          </div>
        </div>

        <div class="login-body">
          <h2>{{ $t('login.title') }}</h2>
          <p class="login-subtitle">{{ $t('login.subtitle') }}</p>

          <form @submit.prevent="handleLogin">
            <div class="form-group">
              <label>{{ $t('login.username') }}</label>
              <input
                v-model="username"
                type="text"
                class="form-input"
                :placeholder="$t('login.username')"
                autofocus
                required
              />
            </div>

            <div class="form-group">
              <label>{{ $t('login.password') }}</label>
              <input
                v-model="password"
                type="password"
                class="form-input"
                :placeholder="$t('login.password')"
                required
              />
            </div>

            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <button type="submit" class="btn-login" :disabled="isLoading">
              {{ isLoading ? $t('login.loggingIn') : $t('login.loginButton') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLanguage } from '@/locales'

const router = useRouter()
const { t, locale } = useI18n()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
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
}

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    // 调用登录API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      // 存储认证信息
      localStorage.setItem('auth_token', data.data.token)
      localStorage.setItem('is_authenticated', 'true')
      localStorage.setItem('username', data.data.username)

      // 跳转到仪表板
      router.push('/')
    } else {
      errorMessage.value = data.message || t('login.invalidCredentials')
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = t('login.loginFailed')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
}

.language-switcher-top {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.language-dropdown {
  position: relative;
  min-width: 140px;
}

.language-selected {
  padding: 10px 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.language-selected:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
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

.login-wrapper {
  width: 100%;
  max-width: 480px;
  padding: 20px;
}

.login-card {
  width: 100%;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.login-header {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 40px 30px;
  text-align: center;
}

.logo h1 {
  font-size: 42px;
  margin-bottom: 8px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.logo p {
  font-size: 15px;
  color: #bdc3c7;
  font-weight: 400;
}

.login-body {
  padding: 50px 40px;
}

.login-body h2 {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 10px;
  text-align: center;
  font-weight: 700;
}

.login-subtitle {
  text-align: center;
  color: #7f8c8d;
  font-size: 15px;
  margin-bottom: 35px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 15px;
}

.form-input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid #ecf0f1;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 24px;
  font-size: 14px;
  text-align: center;
  border: 1px solid #fcc;
}

.btn-login {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.btn-login:active:not(:disabled) {
  transform: translateY(0);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-wrapper {
    padding: 15px;
  }

  .login-body {
    padding: 40px 30px;
  }

  .login-header {
    padding: 30px 20px;
  }

  .logo h1 {
    font-size: 36px;
  }

  .language-switcher-top {
    top: 15px;
    right: 15px;
  }
}

@media (max-width: 480px) {
  .login-body {
    padding: 30px 25px;
  }

  .logo h1 {
    font-size: 32px;
  }

  .login-body h2 {
    font-size: 24px;
  }
}
</style>
