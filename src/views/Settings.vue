<template>
  <Layout>
    <div class="settings">
      <div class="page-header">
        <div>
          <h1>{{ $t('settings.title') }}</h1>
          <p class="subtitle">{{ $t('settings.subtitle') }}</p>
        </div>
        <button class="btn btn-secondary" @click="handleLogout">
          🚪 {{ $t('common.logout') }}
        </button>
      </div>

      <div class="settings-grid">
        <!-- Admin Credentials -->
        <div class="settings-card">
          <h2>{{ $t('settings.adminSection') }}</h2>
          <p class="card-description">
            {{ $t('settings.adminDesc') }}
          </p>

          <div class="form-group">
            <label>{{ $t('settings.currentPassword') }}</label>
            <input
              v-model="currentPassword"
              type="password"
              class="form-input"
              :placeholder="$t('settings.currentPassword')"
            />
          </div>

          <div class="form-group">
            <label>{{ $t('settings.newUsername') }}</label>
            <input
              v-model="newUsername"
              type="text"
              class="form-input"
              :placeholder="$t('settings.newUsername')"
            />
          </div>

          <div class="form-group">
            <label>{{ $t('settings.newPassword') }}</label>
            <input
              v-model="newPassword"
              type="password"
              class="form-input"
              :placeholder="$t('settings.newPassword')"
            />
          </div>

          <div class="form-group">
            <label>{{ $t('settings.confirmPassword') }}</label>
            <input
              v-model="confirmPassword"
              type="password"
              class="form-input"
              :placeholder="$t('settings.confirmPassword')"
            />
          </div>

          <button class="btn btn-primary" @click="updateCredentials">
            💾 {{ $t('settings.updateCredentials') }}
          </button>
        </div>

        <!-- GitHub App Configuration -->
        <div class="settings-card" :class="{ 'card-warning': !githubAppConfigured, 'card-success': githubAppConfigured }">
          <div class="card-header-with-icon">
            <span class="card-icon">{{ githubAppConfigured ? '✅' : '⚠️' }}</span>
            <div>
              <h2>{{ $t('settings.githubAppConfig') }}</h2>
              <p class="card-description">
                {{ $t('settings.appNotConfiguredDesc') }}
              </p>
            </div>
          </div>

          <div v-if="!githubAppConfigured">
            <button class="btn btn-primary" @click="handleSetupGithubApp">
              ⚙️ {{ $t('settings.setupApp') }}
            </button>
          </div>

          <div v-else>
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">{{ $t('settings.appName') }}</span>
                <span class="info-value">{{ githubAppInfo.slug }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t('settings.appId') }}</span>
                <span class="info-value">{{ githubAppInfo.appId }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t('settings.createdAt') }}</span>
                <span class="info-value">{{ formatDate(githubAppInfo.createdAt) }}</span>
              </div>
            </div>

            <button class="btn btn-danger" @click="handleDeleteGithubApp" style="margin-top: 15px;">
              🗑️ {{ $t('settings.deleteApp') }}
            </button>
          </div>
        </div>

        <!-- GitHub Accounts -->
        <div class="settings-card">
          <h2>{{ $t('settings.githubSection') }}</h2>
          <p class="card-description">
            {{ $t('settings.githubDesc') }}
          </p>

          <div class="github-accounts-list">
            <!-- Authorized Apps -->
            <div
              v-for="account in githubAccounts"
              :key="account.id"
              class="github-account-item"
            >
              <div class="account-info">
                <div class="account-avatar">
                  <img v-if="account.avatar" :src="account.avatar" :alt="account.username" />
                  <span v-else class="avatar-placeholder">{{ account.username[0].toUpperCase() }}</span>
                </div>
                <div class="account-details">
                  <div class="account-username">{{ account.username }}</div>
                  <div class="account-email" v-if="account.email">{{ account.email }}</div>
                  <div class="account-app">
                    <span class="app-label">App:</span>
                    <span class="app-slug">{{ account.appSlug }}</span>
                  </div>
                  <div class="account-meta">
                    {{ $t('settings.connectedOn') }} {{ formatDate(account.connectedAt) }}
                  </div>
                </div>
              </div>
              <div class="account-actions">
                <button
                  class="btn-icon"
                  @click="removeApp(account.id, account.username, account.appSlug)"
                  :title="$t('common.delete')"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div v-if="githubAccounts.length === 0 && orphanedApps.length === 0" class="no-accounts">
              <p>{{ $t('settings.noAccounts') }}</p>
            </div>

            <!-- Orphaned Apps (Apps without user accounts) -->
            <div v-if="orphanedApps.length > 0" class="orphaned-apps-section">
              <h3 class="orphaned-apps-title">{{ $t('settings.orphanedApps') }}</h3>
              <p class="orphaned-apps-desc">{{ $t('settings.orphanedAppsDesc') }}</p>
              <div
                v-for="app in orphanedApps"
                :key="app.id"
                class="orphaned-app-item"
              >
                <div class="app-info-full">
                  <div class="app-avatar">
                    <img v-if="app.ownerAvatar" :src="app.ownerAvatar" :alt="app.ownerLogin" />
                    <span v-else class="avatar-placeholder">{{ app.ownerLogin[0].toUpperCase() }}</span>
                  </div>
                  <div class="app-details">
                    <div class="app-name">{{ app.appSlug }}</div>
                    <div class="app-owner">{{ $t('settings.appOwner') }}: {{ app.ownerLogin }}</div>
                    <div class="app-meta">
                      {{ $t('settings.createdOn') }} {{ formatDate(app.createdAt) }}
                    </div>
                    <div class="app-status">
                      <span class="status-badge status-incomplete">{{ $t('settings.notAuthorized') }}</span>
                    </div>
                  </div>
                </div>
                <div class="app-actions">
                  <button
                    class="btn-icon"
                    @click="removeOrphanedApp(app.id, app.appSlug)"
                    :title="$t('common.delete')"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button class="btn btn-primary" @click="addGithubAccount">
            ➕ {{ $t('settings.addAccount') }}
          </button>
        </div>


        <!-- System Information -->
        <div class="settings-card">
          <h2>{{ $t('settings.systemSection') }}</h2>
          <p class="card-description">
            {{ $t('settings.systemDesc') }}
          </p>

          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('settings.platformVersion') }}</label>
              <span>SPages v{{ systemInfo.appVersion }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('settings.nodeVersion') }}</label>
              <span>{{ systemInfo.nodeVersion }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('settings.platform') }}</label>
              <span>{{ systemInfo.platform }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Layout from '@/components/Layout.vue'
import { logout } from '@/utils/auth'
import { useModal } from '@/utils/modal'
import { useToast } from '@/utils/toast'
import { getGithubAppConfig, deleteGithubAppConfig, setupGithubApp, getGithubInstallUrl, getGithubAccounts, refreshGithubAccount, removeGithubAccount, removeGithubUser } from '@/api/github'
import { getSystemInfo } from '@/api/system'
import { updateCredentials as updateCredentialsAPI } from '@/api/auth'

const { t } = useI18n()
const modal = useModal()
const toast = useToast()
const route = useRoute()
const router = useRouter()

// Admin Credentials
const currentPassword = ref('')
const newUsername = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// GitHub Accounts
const githubAccounts = ref([]) // Authorized Apps
const orphanedApps = ref([]) // Unauthorized Apps
const loadingAccounts = ref(false)
const githubAppConfigured = ref(false)
const githubAppInfo = ref({})


// System Info
const systemInfo = ref({
  appVersion: 'Loading...',
  nodeVersion: 'Loading...',
  platform: 'Loading...'
})

const handleLogout = async () => {
  const confirmed = await modal.confirm(t('settings.logoutConfirm'))
  if (confirmed) {
    logout()
  }
}

const updateCredentials = async () => {
  // 当前密码是必填的
  if (!currentPassword.value) {
    toast.error(t('settings.enterCurrentPassword'))
    return
  }

  // 至少要修改用户名或密码中的一个
  if (!newUsername.value && !newPassword.value) {
    toast.error(t('settings.enterNewCredentials'))
    return
  }

  // 如果要修改密码，验证密码确认
  if (newPassword.value && newPassword.value !== confirmPassword.value) {
    toast.error(t('settings.passwordsNotMatch'))
    return
  }

  // 如果要修改密码，验证密码长度
  if (newPassword.value && newPassword.value.length < 6) {
    toast.error(t('settings.passwordTooShort'))
    return
  }

  // 如果要修改用户名，验证用户名长度
  if (newUsername.value && newUsername.value.length < 3) {
    toast.error(t('settings.usernameTooShort'))
    return
  }

  try {
    // 调用统一的凭据更新接口
    const response = await updateCredentialsAPI(
      currentPassword.value,
      newUsername.value || null,
      newPassword.value || null
    )

    // 根据更新的内容显示对应的成功提示
    const updated = response.data.updated || []

    let successMessage = ''
    if (updated.includes('username') && updated.includes('password')) {
      successMessage = 'credentialsUpdated'
    } else if (updated.includes('username')) {
      successMessage = 'usernameUpdated'
    } else if (updated.includes('password')) {
      successMessage = 'passwordUpdated'
    }

    // 清空表单
    currentPassword.value = ''
    newUsername.value = ''
    newPassword.value = ''
    confirmPassword.value = ''

    // 立即退出登录并传递成功消息到登录页
    localStorage.removeItem('auth_token')
    localStorage.removeItem('is_authenticated')
    window.location.href = `/login?message=${successMessage}`
  } catch (error) {
    console.error('Failed to update credentials:', error)

    // 获取错误信息
    const errorMsg = error.response?.data?.message || error.message
    const statusCode = error.response?.status

    // 如果是 401 错误（当前密码错误），显示特定提示
    if (statusCode === 401) {
      toast.error(t('settings.currentPasswordIncorrect'))
      // 聚焦到当前密码输入框，方便用户重新输入
      // 注意：不清空表单，保留用户已填写的新用户名和新密码
    } else {
      // 其他错误
      toast.error(t('settings.updateFailed') + ': ' + errorMsg)
    }

    // 错误时不退出登录，让用户可以重新尝试
  }
}

// Load GitHub App configuration
const loadGithubAppConfig = async () => {
  try {
    const config = await getGithubAppConfig()
    githubAppConfigured.value = config.configured || false
    if (config.configured) {
      githubAppInfo.value = config
    }
  } catch (error) {
    console.error('Failed to load GitHub App config:', error)
    githubAppConfigured.value = false
  }
}

// Setup GitHub App (one-time configuration)
const handleSetupGithubApp = async () => {
  try {
    // Check if already configured first
    const appConfig = await getGithubAppConfig()
    if (appConfig.configured) {
      await modal.alert(t('settings.appAlreadyConfigured'))
      return
    }

    // Get current base URL (protocol + host)
    const baseUrl = `${window.location.protocol}//${window.location.host}`

    console.log('[Frontend] window.location.protocol:', window.location.protocol)
    console.log('[Frontend] window.location.host:', window.location.host)
    console.log('[Frontend] Base URL:', baseUrl)
    console.log('[Frontend] Encoded Base URL:', encodeURIComponent(baseUrl))

    // Directly navigate to GitHub App creation page
    const setupUrl = `/api/github/setup-app?baseUrl=${encodeURIComponent(baseUrl)}`
    console.log('[Frontend] Navigating to:', setupUrl)

    window.location.href = setupUrl
  } catch (error) {
    console.error('Failed to setup GitHub App:', error)
    await modal.alert(t('settings.appSetupFailed'))
  }
}

// Delete GitHub App
const handleDeleteGithubApp = async () => {
  const confirmed = await modal.confirm(t('settings.deleteAppConfirm'))
  if (!confirmed) return

  try {
    const response = await deleteGithubAppConfig()

    // Show results
    const { results, note, appDeleteUrl } = response
    let message = t('settings.appDeleted')

    if (results.installationsDeleted > 0) {
      message += `\n${t('settings.installationsDeleted', { count: results.installationsDeleted })}`
    }

    if (results.errors && results.errors.length > 0) {
      message += `\n\n${t('settings.someErrorsOccurred')}:\n${results.errors.join('\n')}`
    }

    if (note && appDeleteUrl) {
      message += `\n\n⚠️ ${t('settings.manualDeleteNote')}`
      const openGitHub = await modal.confirm(message + `\n\n${t('settings.openGitHubSettings')}`)
      if (openGitHub) {
        window.open(appDeleteUrl, '_blank')
      }
    } else {
      await modal.alert(message)
    }

    // Reload configurations
    await loadGithubAppConfig()
    await loadGithubAccounts()

    toast.success(t('settings.appDeletedSuccess'))
  } catch (error) {
    console.error('Failed to delete GitHub App:', error)
    await modal.alert(t('settings.appDeleteFailed') + ': ' + (error.response?.data?.error || error.message))
  }
}

// Load GitHub accounts
const loadGithubAccounts = async () => {
  try {
    loadingAccounts.value = true
    const data = await getGithubAccounts()
    githubAccounts.value = data.authorized || []
    orphanedApps.value = data.unauthorized || []
  } catch (error) {
    console.error('Failed to load GitHub accounts:', error)
  } finally {
    loadingAccounts.value = false
  }
}

// Load system information
const loadSystemInfo = async () => {
  try {
    const info = await getSystemInfo()
    systemInfo.value = info
  } catch (error) {
    console.error('Failed to load system info:', error)
  }
}

// Add GitHub account via GitHub App installation
const addGithubAccount = async () => {
  try {
    // Check if GitHub App is configured
    if (!githubAppConfigured.value) {
      await modal.alert(t('settings.mustConfigureAppFirst'))
      return
    }

    const { url } = await getGithubInstallUrl()

    if (!url) {
      await modal.alert(t('settings.githubNotConfigured'))
      return
    }

    // Directly navigate to the installation page
    window.location.href = url
  } catch (error) {
    console.error('Failed to get install URL:', error)
    if (error.response?.status === 400) {
      await modal.alert(t('settings.mustConfigureAppFirst'))
    } else {
      await modal.alert(t('settings.githubAuthFailed'))
    }
  }
}

// Refresh account information
const refreshAccount = async (id) => {
  try {
    const updatedAccount = await refreshGithubAccount(id)
    const index = githubAccounts.value.findIndex(a => a.id === id)
    if (index !== -1) {
      githubAccounts.value[index] = updatedAccount
    }
    await modal.alert(t('settings.accountRefreshed'))
  } catch (error) {
    console.error('Failed to refresh account:', error)
    await modal.alert(t('settings.accountRefreshFailed'))
  }
}

// Remove an App connection
const removeApp = async (appId, username, appSlug) => {
  const confirmed = await modal.confirm(t('settings.removeAppConfirm', { username, appSlug }))
  if (confirmed) {
    // Ask if user wants to delete from GitHub too
    const deleteFromGitHub = await modal.confirm(t('settings.deleteFromGitHubConfirm'))

    try {
      const response = await removeGithubAccount(appId, deleteFromGitHub)
      await loadGithubAccounts()

      // Show detailed result
      if (deleteFromGitHub && response.results) {
        const { installationDeleted, appDeleteUrl, errors } = response.results
        if (installationDeleted && appDeleteUrl) {
          // Installation deleted, but App needs manual deletion
          const confirmManualDelete = await modal.confirm(
            t('settings.installationDeletedManual', { url: appDeleteUrl })
          )
          if (confirmManualDelete) {
            window.open(appDeleteUrl, '_blank')
          }
        } else if (installationDeleted) {
          toast.success(t('settings.installationRemoved'))
        } else if (errors && errors.length > 0) {
          toast.error(t('settings.appRemovedLocalOnly') + ': ' + errors.join(', '))
        }
      } else {
        toast.success(t('settings.appRemoved'))
      }
    } catch (error) {
      console.error('Failed to remove app:', error)
      await modal.alert(t('settings.appRemoveFailed'))
    }
  }
}

// Remove orphaned App (App without user account)
const removeOrphanedApp = async (appId, appSlug) => {
  const confirmed = await modal.confirm(t('settings.removeOrphanedAppConfirm', { appSlug }))
  if (confirmed) {
    // Ask if user wants to delete from GitHub too
    const deleteFromGitHub = await modal.confirm(t('settings.deleteFromGitHubConfirm'))

    try {
      const response = await removeGithubAccount(appId, deleteFromGitHub)
      await loadGithubAccounts()

      // Show detailed result
      if (deleteFromGitHub && response.results) {
        const { appDeleteUrl, errors } = response.results
        if (appDeleteUrl) {
          // App needs manual deletion
          const confirmManualDelete = await modal.confirm(
            t('settings.appDeleteManual', { url: appDeleteUrl })
          )
          if (confirmManualDelete) {
            window.open(appDeleteUrl, '_blank')
          }
        } else if (errors && errors.length > 0) {
          toast.error(t('settings.appRemovedLocalOnly') + ': ' + errors.join(', '))
        } else {
          toast.success(t('settings.orphanedAppRemoved'))
        }
      } else {
        toast.success(t('settings.orphanedAppRemoved'))
      }
    } catch (error) {
      console.error('Failed to remove orphaned app:', error)
      await modal.alert(t('settings.appRemoveFailed'))
    }
  }
}

// Check for OAuth callback
onMounted(async () => {
  await loadGithubAppConfig() // Load GitHub App configuration first
  await loadGithubAccounts()
  await loadSystemInfo()

  // Check if coming from OAuth callback or App setup
  if (route.query.success === 'github_connected') {
    // 延迟显示，确保页面已经渲染完成
    setTimeout(() => {
      toast.success(t('settings.githubConnected'))
    }, 100)
    await loadGithubAccounts()
    // 清除 URL 参数，避免刷新页面时重复显示
    router.replace({ query: {} })
  } else if (route.query.success === 'app_configured') {
    // 延迟显示，确保页面已经渲染完成
    setTimeout(() => {
      toast.success(t('settings.appConfigured'))
    }, 100)
    await loadGithubAppConfig()
    // 清除 URL 参数，避免刷新页面时重复显示
    router.replace({ query: {} })
  } else if (route.query.error) {
    const errorKey = `settings.githubError_${route.query.error}`
    // 延迟显示，确保页面已经渲染完成
    setTimeout(() => {
      toast.error(t(errorKey, t('settings.githubAuthFailed')))
    }, 100)
    // 清除 URL 参数，避免刷新页面时重复显示
    router.replace({ query: {} })
  }
})


const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}
</script>

<style scoped>
.settings {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 32px;
  color: #2c3e50;
  margin-bottom: 5px;
}

.subtitle {
  color: #7f8c8d;
  font-size: 14px;
}

.settings-grid {
  display: grid;
  gap: 20px;
}

.settings-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.settings-card.card-warning {
  background: linear-gradient(to bottom, #fff3cd 0%, #fff9e6 100%);
  border: 2px solid #ffc107;
}

.settings-card.card-success {
  background: linear-gradient(to bottom, #d4edda 0%, #e8f5e9 100%);
  border: 2px solid #28a745;
}

.card-header-with-icon {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.card-icon {
  font-size: 36px;
  line-height: 1;
  flex-shrink: 0;
}

.card-header-with-icon h2 {
  margin-bottom: 8px;
}

.card-header-with-icon .card-description {
  margin-bottom: 0;
}

.settings-card h2 {
  font-size: 20px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.card-description {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 5px;
  font-size: 14px;
}

.field-description {
  color: #7f8c8d;
  font-size: 13px;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.checkbox {
  margin-right: 8px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.btn-secondary:hover {
  background: #bdc3c7;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-icon {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
}

.github-accounts-list {
  margin-bottom: 20px;
  min-height: 100px;
}

.github-account-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: border-color 0.3s ease;
}

.github-account-item:hover {
  border-color: #3498db;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.account-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: #ecf0f1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 20px;
  font-weight: bold;
  color: #7f8c8d;
}

.account-details {
  flex: 1;
}

.account-username {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.account-email {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.account-app {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.app-label {
  font-weight: 600;
  margin-right: 5px;
}

.app-slug {
  font-family: monospace;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
}

.account-meta {
  font-size: 12px;
  color: #95a5a6;
  margin-bottom: 8px;
}

.apps-list {
  margin-top: 12px;
  padding-left: 10px;
  border-left: 3px solid #ecf0f1;
}

.app-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 6px;
  transition: background 0.2s ease;
}

.app-item:hover {
  background: #e9ecef;
}

.app-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-slug {
  font-size: 13px;
  color: #495057;
  font-family: monospace;
}

.app-date {
  font-size: 11px;
  color: #95a5a6;
}

.btn-delete-app {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.btn-delete-app:hover {
  opacity: 1;
}

.account-actions {
  display: flex;
  gap: 8px;
}

/* GitHub App Configuration Styles */
.info-list {
  margin: 20px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #ecf0f1;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.info-value {
  color: #6c757d;
  font-family: monospace;
  font-size: 14px;
}

.no-accounts {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.orphaned-apps-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #ecf0f1;
}

.orphaned-apps-title {
  font-size: 16px;
  font-weight: 600;
  color: #e67e22;
  margin-bottom: 8px;
}

.orphaned-apps-desc {
  font-size: 13px;
  color: #95a5a6;
  margin-bottom: 15px;
}

.orphaned-app-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 2px dashed #f39c12;
  border-radius: 8px;
  margin-bottom: 12px;
  background: #fef5e7;
  transition: border-color 0.3s ease;
}

.orphaned-app-item:hover {
  border-color: #e67e22;
}

.app-info-full {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.app-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: #ecf0f1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-details {
  flex: 1;
}

.app-name {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  font-family: monospace;
  margin-bottom: 4px;
}

.app-owner {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 2px;
}

.app-meta {
  font-size: 12px;
  color: #95a5a6;
  margin-bottom: 6px;
}

.app-status {
  margin-top: 6px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-incomplete {
  background: #ffe5cc;
  color: #e67e22;
}

.app-actions {
  display: flex;
  gap: 8px;
}


.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.info-item label {
  display: block;
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.info-item span,
.info-item code {
  color: #2c3e50;
  font-size: 14px;
}

.info-item code {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  display: block;
  word-break: break-all;
}
</style>
