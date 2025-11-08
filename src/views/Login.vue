<template>
  <div class="login-container">
    <div class="language-switcher-top">
      <LanguageSwitcher />
    </div>

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
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const router = useRouter()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    // TODO: Replace with actual API call
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    }).catch(() => {
      // Mock authentication for now
      if (username.value === 'admin' && password.value === 'admin') {
        return { ok: true, json: async () => ({ token: 'mock-token-123' }) }
      }
      return { ok: false }
    })

    if (response.ok) {
      const data = await response.json()
      // Store auth token
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('is_authenticated', 'true')

      // Redirect to dashboard
      router.push('/')
    } else {
      errorMessage.value = t('login.invalidCredentials')
    }
  } catch (error) {
    errorMessage.value = t('login.loginFailed')
    console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  position: relative;
}

.language-switcher-top {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.login-header {
  background: #2c3e50;
  color: white;
  padding: 30px;
  text-align: center;
}

.logo h1 {
  font-size: 36px;
  margin-bottom: 5px;
}

.logo p {
  font-size: 14px;
  color: #95a5a6;
}

.login-body {
  padding: 40px;
}

.login-body h2 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 8px;
  text-align: center;
}

.login-subtitle {
  text-align: center;
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

.btn-login {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ecf0f1;
  text-align: center;
}

.default-credentials {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.default-credentials code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  color: #667eea;
}

.hint {
  font-size: 12px;
  color: #95a5a6;
}
</style>
