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

        <!-- System Frontend -->
        <div class="settings-card" :class="{ 'card-success': systemFrontend.status === 'running', 'card-warning': systemFrontend.status !== 'running' }">
          <div class="card-header-with-icon">
            <span class="card-icon">{{ systemFrontend.status === 'running' ? '🚀' : '⚠️' }}</span>
            <div>
              <h2>{{ $t('settings.systemFrontend') }}</h2>
              <p class="card-description">
                {{ $t('settings.systemFrontendDesc') }}
              </p>
            </div>
          </div>

          <div class="info-list">
            <div class="info-row">
              <span class="info-label">{{ $t('settings.status') }}</span>
              <StatusBadge v-if="systemFrontend.id" :status="systemFrontend.status" />
              <span v-else class="info-value">{{ $t('common.loading') }}</span>
            </div>
            <!-- 移除非编辑模式的纯文本端口与服务器地址行 -->
            <div class="info-row info-row-fixed-height">
              <span class="info-label">{{ $t('settings.port') }}</span>
              <div class="info-content field-with-right-addon">
                <input
                  :value="isEditingFrontend ? editingFrontendPort : systemFrontend.port"
                  @input="onPortInputIfEditing"
                  :disabled="!isEditingFrontend"
                  type="number"
                  class="port-input"
                  :placeholder="$t('settings.frontendPortLabel')"
                  min="1024"
                  max="65535"
                />
                <span class="right-addon inline-status" :class="{ 'status-checking': portChecking, 'status-error': !!portError, 'status-ok': !portChecking && !portError && portAvailable }">
                  <template v-if="isEditingFrontend && editingFrontendPort !== null && editingFrontendPort !== ''">
                    {{ portChecking ? $t('settings.frontendPortChecking') : (portError ? portError : (portAvailable ? $t('settings.frontendPortAvailable') : '') ) }}
                  </template>
                  <template v-else>&nbsp;</template>
                </span>
              </div>
            </div>
            <div class="info-row info-row-fixed-height">
              <span class="info-label">{{ $t('settings.frontendServerHostSelect') }}</span>
              <div class="info-content">
                <input
                  :value="isEditingFrontend ? editingFrontendServerHost : (systemFrontend.serverHost || '')"
                  @input="onServerHostInputIfEditing"
                  :disabled="!isEditingFrontend"
                  type="text"
                  class="host-input"
                  :placeholder="$t('settings.frontendServerHostPlaceholder')"
                />
              </div>
            </div>
            <div v-if="systemFrontend.url" class="info-row">
              <span class="info-label">{{ $t('settings.url') }}</span>
              <a :href="systemFrontend.url" target="_blank" class="info-value-link">{{ systemFrontend.url }}</a>
            </div>
            <div v-if="systemFrontend.lastDeploy" class="info-row">
              <span class="info-label">{{ $t('settings.lastDeploy') }}</span>
              <span class="info-value">{{ formatDate(systemFrontend.lastDeploy) }}</span>
            </div>
            <div v-if="systemFrontend.nodeVersion" class="info-row">
              <span class="info-label">{{ $t('settings.nodeVersionUsed') }}</span>
              <span class="info-value">v{{ systemFrontend.nodeVersion }}</span>
            </div>
          </div>

          <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button 
              v-if="!isEditingFrontend"
              class="btn btn-primary btn-wide" 
              @click="redeploySystemFrontend"
              :disabled="isRedeployingFrontend"
            >
              {{ isRedeployingFrontend ? '🔄 ' + $t('settings.redeploying') : '🔄 ' + $t('settings.redeploy') }}
            </button>
            <button
              v-if="!isEditingFrontend"
              class="btn btn-secondary btn-medium"
              @click="editSystemFrontend"
            >
              ⚙️ {{ $t('settings.edit') }}
            </button>
            <button
              v-if="isEditingFrontend"
              class="btn btn-primary btn-wide"
              @click="saveSystemFrontendConfig"
              :disabled="portChecking || (portError && !portAvailable) || !editingFrontendPort"
              :title="portChecking ? $t('settings.frontendPortChecking') : (portError && !portAvailable ? portError : '')"
            >
              💾 {{ $t('settings.save') }}
            </button>
            <button
              v-if="isEditingFrontend"
              class="btn btn-secondary btn-medium"
              @click="cancelEditSystemFrontend"
            >
              ✖️ {{ $t('settings.cancel') }}
            </button>
            <a v-if="systemFrontend.url && !isEditingFrontend" :href="systemFrontend.url" target="_blank" class="btn btn-secondary btn-medium">
              🔗 {{ $t('settings.visitSite') }}
            </a>
          </div>
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Layout from '@/components/Layout.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { logout } from '@/utils/auth'
import { useModal } from '@/utils/modal'
import { useToast } from '@/utils/toast'
import { getGithubAppConfig, deleteGithubAppConfig, getGithubInstallUrl, getGithubAccounts, removeGithubAccount } from '@/api/github'
import { getSystemInfo } from '@/api/system'
import { updateCredentials as updateCredentialsAPI } from '@/api/auth'
import { projectsAPI, deployProject } from '@/api/projects'
import { checkPort } from '@/api/projects'

const { t } = useI18n()
const modal = useModal()
const toast = useToast()
const route = useRoute()
const router = useRouter()

// 系统前端
const systemFrontend = ref({
  id: null,
  status: 'loading',
  port: null,
  serverHost: null,
  url: null,
  lastDeploy: null,
  nodeVersion: null
})
const isRedeployingFrontend = ref(false)
let systemFrontendStateEventSource = null

// 编辑配置相关状态
const isEditingFrontend = ref(false)
const editingFrontendPort = ref(null)
const editingFrontendServerHost = ref('')

// 管理员凭据
const currentPassword = ref('')
const newUsername = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// GitHub 账号
const githubAccounts = ref([]) // Authorized Apps
const orphanedApps = ref([]) // Unauthorized Apps
const loadingAccounts = ref(false)
const githubAppConfigured = ref(false)
const githubAppInfo = ref({})

// 系统信息
const systemInfo = ref({
  appVersion: 'Loading...',
  nodeVersion: 'Loading...',
  platform: 'Loading...'
})

const portChecking = ref(false)
const portAvailable = ref(false)
const portError = ref('')
let portCheckTimer = null

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

// 加载 GitHub App 配置
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

// 设置 GitHub App（一次性配置）
const handleSetupGithubApp = async () => {
  try {
    // 首先检查是否已配置
    const appConfig = await getGithubAppConfig()
    if (appConfig.configured) {
      await modal.alert(t('settings.appAlreadyConfigured'))
      return
    }

    // 获取当前基础 URL（协议 + 主机）
    const baseUrl = `${window.location.protocol}//${window.location.host}`

    console.log('[Frontend] window.location.protocol:', window.location.protocol)
    console.log('[Frontend] window.location.host:', window.location.host)
    console.log('[Frontend] Base URL:', baseUrl)
    console.log('[Frontend] Encoded Base URL:', encodeURIComponent(baseUrl))

    // 直接导航到 GitHub App 创建页面
    const setupUrl = `/api/github/setup-app?baseUrl=${encodeURIComponent(baseUrl)}`
    console.log('[Frontend] Navigating to:', setupUrl)

    window.location.href = setupUrl
  } catch (error) {
    console.error('Failed to setup GitHub App:', error)
    await modal.alert(t('settings.appSetupFailed'))
  }
}

// 删除 GitHub App
const handleDeleteGithubApp = async () => {
  const confirmed = await modal.confirm(t('settings.deleteAppConfirm'))
  if (!confirmed) return

  try {
    const response = await deleteGithubAppConfig()

    // 显示结果
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

// 移除 App 连接
const removeApp = async (appId, username, appSlug) => {
  const confirmed = await modal.confirm(t('settings.removeAppConfirm', { username, appSlug }))
  if (confirmed) {
    // 询问用户是否也要从 GitHub 删除
    const deleteFromGitHub = await modal.confirm(t('settings.deleteFromGitHubConfirm'))

    try {
      const response = await removeGithubAccount(appId, deleteFromGitHub)
      await loadGithubAccounts()

      // 显示详细结果
      if (deleteFromGitHub && response.results) {
        const { installationDeleted, appDeleteUrl, errors } = response.results
        if (installationDeleted && appDeleteUrl) {
          // 安装已删除，但 App 需要手动删除
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

// 加载系统前端项目信息
const loadSystemFrontend = async () => {
  try {
    const projects = await projectsAPI.getProjects()
    const frontendProject = projects.find(p => p.type === 'core' && p.managed === true)
    if (frontendProject) {
      systemFrontend.value = {
        id: frontendProject.id,
        status: frontendProject.status || 'stopped',
        port: frontendProject.port,
        serverHost: frontendProject.serverHost || null,
        url: frontendProject.url,
        lastDeploy: frontendProject.lastDeploy,
        nodeVersion: frontendProject.nodeVersion
      }
    } else {
      systemFrontend.value.status = 'not-found'
    }
  } catch (error) {
    console.error('加载系统前端失败:', error)
    systemFrontend.value.status = 'error'
  }
}

// 连接系统前端状态 SSE 流
const connectSystemFrontendStateStream = () => {
  if (!systemFrontend.value.id) {
    return
  }

  if (systemFrontendStateEventSource) {
    systemFrontendStateEventSource.close()
  }

  const token = localStorage.getItem('auth_token')
  if (!token) {
    return
  }

  const url = `/api/projects/${systemFrontend.value.id}/state/stream?token=${encodeURIComponent(token)}`
  systemFrontendStateEventSource = new EventSource(url)

  systemFrontendStateEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.type === 'connected') {
        return
      }

      if (data.type === 'state' && data.data) {
        systemFrontend.value = {
          id: systemFrontend.value.id,
          status: data.data.status || systemFrontend.value.status,
          port: data.data.port || systemFrontend.value.port,
          serverHost: data.data.serverHost || systemFrontend.value.serverHost,
          url: data.data.url || systemFrontend.value.url,
          lastDeploy: data.data.lastDeploy || systemFrontend.value.lastDeploy,
          nodeVersion: data.data.nodeVersion || systemFrontend.value.nodeVersion
        }
      }
    } catch (e) {
      console.error('[SSE] 解析系统前端状态失败:', e)
    }
  }

  systemFrontendStateEventSource.onerror = () => {
    if (systemFrontendStateEventSource) {
      systemFrontendStateEventSource.close()
      systemFrontendStateEventSource = null
    }

    setTimeout(() => {
      if (systemFrontend.value.id) {
        connectSystemFrontendStateStream()
      }
    }, 5000)
  }
}

// 重���部署系统前端
const redeploySystemFrontend = async () => {
  console.log('[redeploySystemFrontend] systemFrontend.value:', systemFrontend.value)
  
  if (!systemFrontend.value.id) {
    console.error('[redeploySystemFrontend] System frontend ID not found!')
    toast.error(t('settings.systemFrontendNotFound'))
    return
  }

  try {
    console.log('[redeploySystemFrontend] Starting deployment for ID:', systemFrontend.value.id)
    isRedeployingFrontend.value = true
    await deployProject(systemFrontend.value.id, { reason: 'manual', triggeredBy: 'admin' })
    console.log('[redeploySystemFrontend] Deployment request sent successfully')
    toast.success(t('settings.redeployStarted'))
  } catch (error) {
    console.error('Failed to redeploy system frontend:', error)
    console.error('Error details:', error.response?.data || error.message)
    toast.error(t('settings.redeployFailed'))
  } finally {
    isRedeployingFrontend.value = false
  }
}

// 进入编辑
const editSystemFrontend = () => {
  if (!systemFrontend.value.id) return
  isEditingFrontend.value = true
  editingFrontendPort.value = systemFrontend.value.port
  editingFrontendServerHost.value = systemFrontend.value.serverHost || ''
}

// 取消编辑
const cancelEditSystemFrontend = () => {
  isEditingFrontend.value = false
  editingFrontendPort.value = null
  editingFrontendServerHost.value = ''
}

// 保存配置
const saveSystemFrontendConfig = async () => {
  if (!systemFrontend.value.id) {
    toast.error(t('settings.systemFrontendNotFound'))
    return
  }
  const port = parseInt(editingFrontendPort.value)
  if (isNaN(port) || port < 1024 || port > 65535) {
    toast.error(t('settings.frontendPortInvalid'))
    return
  }
  if (portError.value && !portAvailable.value) {
    toast.error(portError.value)
    return
  }
  
  // 检查端口或服务器地址是否改变
  const portChanged = port !== systemFrontend.value.port
  const serverHostChanged = (editingFrontendServerHost.value.trim() || null) !== systemFrontend.value.serverHost
  const needsRedirect = portChanged || serverHostChanged
  
  try {
    const updates = {
      port,
      serverHost: editingFrontendServerHost.value.trim() || null
    }
    await projectsAPI.updateProject(systemFrontend.value.id, updates)
    systemFrontend.value.port = updates.port
    systemFrontend.value.serverHost = updates.serverHost
    isEditingFrontend.value = false
    toast.success(t('settings.configUpdated'))
    const shouldRedeploy = await modal.confirm(t('settings.redeployToApply'))
    if (shouldRedeploy) {
      await redeploySystemFrontend()
      
      // 如果端口或服务器地址改变了，等待部署完成后自动跳转到新地址的设置页
      if (needsRedirect) {
        // 等待一段时间让部署完成
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 构建新的 URL
        const protocol = window.location.protocol
        const newHost = updates.serverHost || window.location.hostname
        const newPort = updates.port
        const newUrl = `${protocol}//${newHost}:${newPort}/settings`
        
        // 提示用户即将跳转
        toast.success(t('settings.redirectingToNewAddress'))
        
        // 延迟跳转，让用户看到提示
        setTimeout(() => {
          window.location.href = newUrl
        }, 1500)
      }
    }
  } catch (error) {
    console.error('保存系统前端配置失败:', error)
    toast.error(t('settings.configUpdateFailed'))
  }
}

const onPortInput = () => {
  portError.value = ''
  portAvailable.value = false
  if (portCheckTimer) clearTimeout(portCheckTimer)
  const val = editingFrontendPort.value
  if (!val || val < 1024 || val > 65535) {
    portError.value = t('settings.frontendPortInvalid')
    return
  }
  portCheckTimer = setTimeout(checkFrontendPort, 500)
}

const checkFrontendPort = async () => {
  const val = editingFrontendPort.value
  if (!val || val < 1024 || val > 65535) {
    portError.value = t('settings.frontendPortInvalid')
    return
  }
  // 如果端口未改变，直接认为可用
  if (val === systemFrontend.value.port) {
    portAvailable.value = true
    return
  }
  portChecking.value = true
  try {
    const resp = await checkPort(val)
    if (resp && resp.available === true) {
      portAvailable.value = true
    } else {
      portError.value = t('settings.frontendPortInUse')
    }
  } catch (e) {
    console.error('端口检测失败:', e)
    portError.value = t('settings.frontendPortCheckFailed')
  } finally {
    portChecking.value = false
  }
}

// 在进入编辑时预加载网络接口
watch(isEditingFrontend, async (val) => {
  if (val) {
    // 初始化端口状态
    onPortInput()
  } else {
    portError.value = ''
    portAvailable.value = false
    portChecking.value = false
    if (portCheckTimer) clearTimeout(portCheckTimer)
  }
})

onMounted(async () => {
  await loadGithubAppConfig() // Load GitHub App configuration first
  await loadGithubAccounts()
  await loadSystemInfo()
  await loadSystemFrontend()
  connectSystemFrontendStateStream()

  // 检查是否来自 OAuth 回调或 App 设置
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

onUnmounted(() => {
  if (systemFrontendStateEventSource) {
    systemFrontendStateEventSource.close()
    systemFrontendStateEventSource = null
  }
})

const formatDate = (date) => {
  if (!date) return t('dashboard.never')
  return new Date(date).toLocaleString()
}

const onPortInputIfEditing = (e) => {
  if (!isEditingFrontend.value) return
  const v = e?.target?.value
  editingFrontendPort.value = v === '' ? '' : Number(v)
  onPortInput()
}

const onServerHostInputIfEditing = (e) => {
  if (!isEditingFrontend.value) return
  editingFrontendServerHost.value = e?.target?.value || ''
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

.port-input { padding:6px 10px; border:2px solid #ecf0f1; border-radius:6px; font-size:14px; height:32px; box-sizing:border-box; }
.port-input:focus { outline:none; border-color:#3498db; }

.host-input { 
  padding:6px 10px; 
  border:2px solid #ecf0f1; 
  border-radius:6px; 
  font-size:14px; 
  height:32px; 
  box-sizing:border-box;
  width: 100%;
  max-width: 280px;
  min-width: 200px;
}
.host-input:focus { outline:none; border-color:#3498db; }
.host-input:disabled { background:#f5f5f5; color:#7f8c8d; cursor:not-allowed; }

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
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid #ecf0f1;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row-fixed-height {
  height: 44px;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #7f8c8d;
  font-weight: 600;
  width: 120px;
  flex: 0 0 120px;
  line-height: 1.2;
}

.info-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
  margin-left: auto;
}

.info-value-link {
  font-size: 14px;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
  margin-left: auto;
}

.info-value-link:hover {
  text-decoration: underline;
}

.info-content {
  margin-left: auto;
  display: flex;
  gap: 8px;
  align-items: center;
}

.info-content.column {
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.text-info {
  color: #3498db;
}

.text-danger {
  color: #e74c3c;
}

.text-success {
  color: #28a745;
}

.port-status {
  font-size: 12px;
  white-space: nowrap;
}

.form-select {
  padding: 6px 10px;
  border: 2px solid #ecf0f1;
  border-radius: 6px;
  background: #fff;
  width: 240px;
  height: 32px;
  box-sizing: border-box;
}

.form-select:focus {
  outline: none;
  border-color: #3498db;
}

.apply-hint {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 2px;
}

.no-accounts {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
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

.btn-wide { width:160px; min-width:160px; display:inline-flex; justify-content:center; align-items:center; }
.btn-medium { width:140px; min-width:140px; display:inline-flex; justify-content:center; align-items:center; }
@media (max-width: 520px) { .btn-wide, .btn-medium { width:100%; min-width:0; } }

/* 新的对齐布局：输入框右边缘对齐到固定位置，各自保持自适应宽度 */
.field-with-right-addon { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:8px; }
.field-with-right-addon > input,
.field-with-right-addon > select { justify-self:end; }
.field-with-right-addon > input { width:auto; min-width:80px; max-width:140px; }
.field-with-right-addon > select { width:auto; min-width:160px; max-width:260px; }
.right-addon { width:70px; } /* 固定右侧附加区域宽度 */
.inline-status { font-size:12px; text-align:center; white-space:nowrap; display:block; }
.refresh-inline { padding:6px 10px; height:32px; display:inline-flex; align-items:center; justify-content:center; }
.status-checking { color:#3498db; }
.status-error { color:#e74c3c; }
.status-ok { color:#28a745; }
.port-input:disabled { background:#f5f5f5; color:#7f8c8d; cursor:not-allowed; }
.refresh-inline:disabled { opacity:.6; cursor:not-allowed; }
</style>