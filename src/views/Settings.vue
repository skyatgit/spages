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
              placeholder="admin"
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

        <!-- GitHub Accounts -->
        <div class="settings-card">
          <h2>{{ $t('settings.githubSection') }}</h2>
          <p class="card-description">
            {{ $t('settings.githubDesc') }}
          </p>

          <div class="github-accounts-list">
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
                  <div class="account-email">{{ account.email }}</div>
                  <div class="account-meta">
                    {{ $t('settings.connectedOn') }} {{ formatDate(account.connectedAt) }}
                  </div>
                </div>
              </div>
              <div class="account-actions">
                <button class="btn-icon" @click="refreshAccount(account.id)" :title="$t('common.refresh')">
                  🔄
                </button>
                <button class="btn-icon" @click="removeAccount(account.id)" :title="$t('common.delete')">
                  🗑️
                </button>
              </div>
            </div>

            <div v-if="githubAccounts.length === 0" class="no-accounts">
              <p>{{ $t('settings.noAccounts') }}</p>
            </div>
          </div>

          <button class="btn btn-primary" @click="addGithubAccount">
            ➕ {{ $t('settings.addAccount') }}
          </button>
        </div>

        <!-- Storage & Cleanup -->
        <div class="settings-card">
          <h2>{{ $t('settings.storageSection') }}</h2>
          <p class="card-description">
            {{ $t('settings.storageDesc') }}
          </p>

          <div class="storage-info">
            <div class="storage-item">
              <div class="storage-label">{{ $t('settings.projectsData') }}</div>
              <div class="storage-value">{{ storageData.projects }} MB</div>
            </div>
            <div class="storage-item">
              <div class="storage-label">{{ $t('settings.buildCache') }}</div>
              <div class="storage-value">{{ storageData.cache }} MB</div>
            </div>
            <div class="storage-item">
              <div class="storage-label">{{ $t('settings.logs') }}</div>
              <div class="storage-value">{{ storageData.logs }} MB</div>
            </div>
            <div class="storage-item">
              <div class="storage-label">{{ $t('settings.total') }}</div>
              <div class="storage-value total">{{ storageData.total }} MB</div>
            </div>
          </div>

          <div class="cleanup-actions">
            <button class="btn btn-secondary" @click="clearCache">
              🗑️ {{ $t('settings.clearCache') }}
            </button>
            <button class="btn btn-secondary" @click="clearLogs">
              🗑️ {{ $t('settings.clearLogs') }}
            </button>
          </div>
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
              <span>SPages v0.1.0</span>
            </div>
            <div class="info-item">
              <label>{{ $t('settings.nodeVersion') }}</label>
              <span>{{ systemInfo.nodeVersion }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('settings.platform') }}</label>
              <span>{{ systemInfo.platform }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('settings.dataDirectory') }}</label>
              <code>{{ systemInfo.dataDir }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Layout from '@/components/Layout.vue'
import { logout } from '@/utils/auth'
import { useModal } from '@/utils/modal'

const { t } = useI18n()
const modal = useModal()

// Admin Credentials
const currentPassword = ref('')
const newUsername = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// GitHub Accounts - Mock data
const githubAccounts = ref([
  {
    id: '1',
    username: 'john-doe',
    email: 'john@example.com',
    avatar: null,
    connectedAt: new Date().toISOString()
  },
  {
    id: '2',
    username: 'company-org',
    email: 'dev@company.com',
    avatar: null,
    connectedAt: new Date(Date.now() - 86400000).toISOString()
  }
])

// Storage Data
const storageData = ref({
  projects: 245,
  cache: 512,
  logs: 8,
  total: 765
})

// System Info
const systemInfo = ref({
  nodeVersion: 'v20.19.0',
  platform: 'Windows 11 (x64)',
  dataDir: 'C:\\Users\\username\\SPages\\data'
})

const handleLogout = async () => {
  const confirmed = await modal.confirm(t('settings.logoutConfirm'))
  if (confirmed) {
    logout()
  }
}

const updateCredentials = async () => {
  if (!currentPassword.value) {
    await modal.alert(t('settings.enterCurrentPassword'))
    return
  }

  if (newPassword.value && newPassword.value !== confirmPassword.value) {
    await modal.alert(t('settings.passwordsNotMatch'))
    return
  }

  if (!newUsername.value && !newPassword.value) {
    await modal.alert(t('settings.enterNewCredentials'))
    return
  }

  console.log('Updating credentials:', {
    currentPassword: currentPassword.value,
    newUsername: newUsername.value || undefined,
    newPassword: newPassword.value || undefined
  })

  // TODO: Implement API call
  await modal.alert(t('settings.credentialsUpdated'))

  // Clear form
  currentPassword.value = ''
  newUsername.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

const addGithubAccount = async () => {
  console.log('Adding GitHub account...')
  // Will implement OAuth flow later
  await modal.alert(t('settings.githubOauthTodo'))
}

const refreshAccount = async (id) => {
  console.log('Refreshing account:', id)
  await modal.alert(t('settings.accountRefreshed'))
}

const removeAccount = async (id) => {
  const confirmed = await modal.confirm(t('settings.removeAccountConfirm'))
  if (confirmed) {
    const index = githubAccounts.value.findIndex(a => a.id === id)
    if (index !== -1) {
      githubAccounts.value.splice(index, 1)
    }
  }
}

const clearCache = async () => {
  const confirmed = await modal.confirm(t('settings.clearCacheConfirm'))
  if (confirmed) {
    console.log('Clearing build cache...')
    storageData.value.cache = 0
    storageData.value.total = storageData.value.projects + storageData.value.logs
    await modal.alert(t('settings.cacheCleared'))
  }
}

const clearLogs = async () => {
  const confirmed = await modal.confirm(t('settings.clearLogsConfirm'))
  if (confirmed) {
    console.log('Clearing logs...')
    storageData.value.logs = 0
    storageData.value.total = storageData.value.projects + storageData.value.cache
    await modal.alert(t('settings.logsCleared'))
  }
}

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
  margin-bottom: 2px;
}

.account-meta {
  font-size: 12px;
  color: #95a5a6;
}

.account-actions {
  display: flex;
  gap: 8px;
}

.no-accounts {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.storage-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.storage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.storage-label {
  color: #7f8c8d;
  font-size: 14px;
}

.storage-value {
  color: #2c3e50;
  font-weight: 600;
  font-size: 16px;
}

.storage-value.total {
  color: #3498db;
  font-size: 18px;
}

.cleanup-actions {
  display: flex;
  gap: 10px;
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
