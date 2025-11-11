<template>
  <Layout>
    <div class="add-project">
      <div class="page-header">
        <div>
          <h1>{{ $t('addProject.title') }}</h1>
          <p class="subtitle">{{ $t('addProject.subtitle') }}</p>
        </div>
        <router-link to="/" class="btn btn-secondary">
          ← {{ $t('addProject.backToDashboard') }}
        </router-link>
      </div>

      <div class="content-card">
        <div v-if="!isGithubConnected" class="github-connect">
          <div class="github-icon">🔗</div>
          <h2>{{ $t('addProject.connectGithub') }}</h2>
          <p>{{ $t('addProject.connectGithubDesc') }}</p>
          <button class="btn btn-primary btn-large" @click="connectGithub">
            {{ $t('addProject.connectButton') }}
          </button>
        </div>

        <div v-else class="repo-selection">
          <div class="account-selector">
            <label>{{ $t('addProject.selectAccount') }}</label>
            <select v-model="selectedAccount" class="account-select" @change="loadRepositories">
              <option v-for="account in githubAccounts" :key="account.id" :value="account.id">
                {{ account.username }} ({{ account.email }})
              </option>
            </select>
          </div>

          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('addProject.searchRepos')"
              class="search-input"
            />
          </div>

          <div v-if="loading" class="loading">
            <div class="spinner"></div>
            <p>{{ $t('addProject.loadingRepos') }}</p>
          </div>

          <div v-else-if="filteredRepos.length === 0" class="no-repos">
            <p>{{ $t('addProject.noRepos') }}</p>
          </div>

          <div v-else class="repos-list">
            <div
              v-for="repo in filteredRepos"
              :key="repo.id"
              class="repo-item"
              :class="{ selected: selectedRepo?.id === repo.id }"
              @click="selectRepo(repo)"
            >
              <div class="repo-info">
                <h3>{{ repo.name }}</h3>
                <p class="repo-description">{{ repo.description || $t('addProject.noDescription') }}</p>
                <div class="repo-meta">
                  <span class="meta-item">{{ repo.fullName }}</span>
                  <span class="meta-item">{{ repo.private ? '🔒 Private' : '🌐 Public' }}</span>
                  <span v-if="repo.defaultBranch" class="meta-item">📌 {{ repo.defaultBranch }}</span>
                  <span v-if="repo.createdAt" class="meta-item">📅 {{ $t('addProject.created') }}: {{ formatFullDate(repo.createdAt) }}</span>
                  <span v-if="repo.updatedAt" class="meta-item">🕒 {{ $t('addProject.updated') }}: {{ formatFullDate(repo.updatedAt) }}</span>
                </div>
              </div>
              <div v-if="selectedRepo?.id === repo.id" class="check-icon">✓</div>
            </div>
          </div>

          <div v-if="selectedRepo" class="project-config">
            <h3>{{ $t('addProject.projectConfig') }}</h3>

            <div class="form-group">
              <label>{{ $t('addProject.projectName') }}</label>
              <input
                v-model="projectName"
                type="text"
                class="form-input"
                :class="{ 'input-error': projectNameError }"
                placeholder="my-awesome-project"
              />
              <p v-if="projectNameError" class="error-message">{{ projectNameError }}</p>
              <p v-else-if="projectNameChecking" class="info-message">{{ $t('addProject.checkingProjectName') }}</p>
              <p v-else-if="projectNameAvailable" class="success-message">{{ $t('addProject.projectNameAvailable') }}</p>
            </div>

            <div class="form-group">
              <label>{{ $t('addProject.branch') }}</label>
              <div class="branch-select-wrapper">
                <select v-model="branch" class="form-select" :disabled="loadingBranches">
                  <option v-if="loadingBranches" value="">{{ $t('dashboard.loadingBranches') }}</option>
                  <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
                </select>
                <button
                  v-if="!loadingBranches"
                  class="refresh-btn"
                  @click="loadBranches"
                  type="button"
                  :title="$t('dashboard.refreshBranches')"
                >
                  🔄
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>{{ $t('addProject.serverHost') }}</label>
              <div class="server-host-wrapper">
                <select v-model="serverHost" class="form-select">
                  <option v-if="networkInterfaces.length === 0" value="">{{ $t('common.loading') }}...</option>
                  <option
                    v-for="(iface, index) in networkInterfaces"
                    :key="'iface-' + index"
                    :value="iface.address"
                  >
                    {{ iface.address }} - {{ iface.description }}
                    <template v-if="iface.name !== 'localhost'"> ({{ iface.name }})</template>
                  </option>
                </select>
                <button
                  class="refresh-btn"
                  @click="loadNetworkInterfaces"
                  type="button"
                  :title="$t('addProject.refreshNetworkInterfaces')"
                  :disabled="loadingNetworkInterfaces"
                >
                  🔄
                </button>
              </div>
              <p class="help-text">{{ $t('addProject.serverHostHelp') }}</p>
            </div>

            <div class="form-group">
              <label>{{ $t('addProject.port') }}</label>
              <input
                v-model.number="port"
                type="number"
                class="form-input"
                :class="{ 'input-error': portError }"
                placeholder="3001"
              />
              <p v-if="portError" class="error-message">{{ portError }}</p>
              <p v-else-if="portChecking" class="info-message">{{ $t('addProject.checkingPort') }}</p>
              <p v-else-if="portAvailable" class="success-message">{{ $t('addProject.portAvailable') }}</p>
            </div>

            <div class="form-actions">
              <button class="btn btn-secondary" @click="cancel">{{ $t('common.cancel') }}</button>
              <button class="btn btn-primary" @click="addProject">{{ $t('common.add') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Layout from '@/components/Layout.vue'
import { useModal } from '@/utils/modal'
import {
  getGithubAccounts,
  getGithubRepositories,
  getGithubBranches
} from '@/api/github'
import { checkProjectName, checkPort, createProject, deployProject, getNextAvailablePort } from '@/api/projects'
import { getNetworkInterfaces } from '@/api/system'

const router = useRouter()
const { t } = useI18n()
const modal = useModal()

const isGithubConnected = ref(false)
const loading = ref(false)
const searchQuery = ref('')
const selectedAccount = ref('') // Selected GitHub account ID
const selectedRepo = ref(null)
const projectName = ref('')
const branch = ref('')
const serverHost = ref('') // 选择的服务器 IP
const networkInterfaces = ref([]) // 可用的网络接口列表
const port = ref(3001)
const branches = ref([])
const loadingBranches = ref(false)
const portError = ref('')
const portChecking = ref(false)
const portAvailable = ref(false)
const projectNameError = ref('')
const projectNameChecking = ref(false)
const projectNameAvailable = ref(false)
let projectNameCheckTimer = null
let portCheckTimer = null

// 网络接口加载状态
const loadingNetworkInterfaces = ref(false)

const githubAccounts = ref([])
const repositories = ref([])

// 页面加载时检查是否已连接 GitHub
onMounted(async () => {
  await loadGithubAccounts()
  // 移除这里的 loadNetworkInterfaces，改为在需要时才加载
})

// 加载 GitHub 账号列表
const loadGithubAccounts = async () => {
  try {
    const response = await getGithubAccounts()
    // 后端返回 { authorized: [], unauthorized: [] }
    const accounts = response.authorized || []
    githubAccounts.value = accounts
    isGithubConnected.value = accounts.length > 0

    // 如果有账号，自动选择第一个
    if (accounts.length > 0) {
      selectedAccount.value = accounts[0].id
      await loadRepositories()
    }
  } catch (error) {
    console.error('Failed to load GitHub accounts:', error)
    isGithubConnected.value = false
  }
}

// 加载网络接口列表（按需加载，每次都重新获取）
const loadNetworkInterfaces = async () => {
  // 如果正在加载，跳过
  if (loadingNetworkInterfaces.value) {
    console.log('[AddProject] Already loading network interfaces, skip')
    return
  }

  // 每次都清空并重新加载
  loadingNetworkInterfaces.value = true
  networkInterfaces.value = []

  try {
    console.log('[AddProject] Loading network interfaces from API...')
    const response = await getNetworkInterfaces()
    console.log('[AddProject] Network interfaces response:', response)
    networkInterfaces.value = response.interfaces || []
    console.log('[AddProject] Network interfaces count:', networkInterfaces.value.length)
    console.log('[AddProject] Network interfaces array:', JSON.stringify(networkInterfaces.value, null, 2))

    // 默认选择第一个非内部地址（局域网 IP），但只在未选择时设置
    if (!serverHost.value) {
      const defaultInterface = networkInterfaces.value.find(iface => !iface.internal && iface.address !== 'localhost')
      if (defaultInterface) {
        serverHost.value = defaultInterface.address
        console.log('[AddProject] Auto-selected default IP:', defaultInterface.address)
      } else if (networkInterfaces.value.length > 0) {
        serverHost.value = networkInterfaces.value[0].address
        console.log('[AddProject] Auto-selected first IP:', networkInterfaces.value[0].address)
      }
    }
    console.log('[AddProject] Final networkInterfaces.value:', networkInterfaces.value)
  } catch (error) {
    console.error('[AddProject] Failed to load network interfaces:', error)
    console.error('[AddProject] Error details:', error.response?.data || error.message)
    // 降级到 localhost
    networkInterfaces.value = [{
      name: 'localhost',
      address: 'localhost',
      family: 'IPv4',
      internal: true,
      description: '本机访问'
    }]
    if (!serverHost.value) {
      serverHost.value = 'localhost'
    }
  } finally {
    loadingNetworkInterfaces.value = false
  }
}

// 监听项目名称变化，实时检查
watch(projectName, (newName) => {
  // 清除之前的定时器
  if (projectNameCheckTimer) {
    clearTimeout(projectNameCheckTimer)
  }

  // 如果为空，重置状态
  if (!newName || !newName.trim()) {
    projectNameError.value = ''
    projectNameAvailable.value = false
    projectNameChecking.value = false
    return
  }

  // 防抖：500ms 后执行检查
  projectNameCheckTimer = setTimeout(() => {
    checkProjectNameAvailability()
  }, 500)
})

// 监听端口变化，实时检查
watch(port, (newPort) => {
  // 清除之前的定时器
  if (portCheckTimer) {
    clearTimeout(portCheckTimer)
  }

  // 如果为空，重置状态
  if (!newPort) {
    portError.value = ''
    portAvailable.value = false
    portChecking.value = false
    return
  }

  // 防抖：500ms 后执行检查
  portCheckTimer = setTimeout(() => {
    checkPortAvailability()
  }, 500)
})

// 监听选择的仓库变化，展开项目配置时加载网络接口
watch(selectedRepo, (newRepo) => {
  if (newRepo) {
    console.log('[AddProject] Project config expanded, loading network interfaces...')
    loadNetworkInterfaces()
  }
})

const filteredRepos = computed(() => {
  if (!searchQuery.value) return repositories.value
  return repositories.value.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const connectGithub = () => {
  // 跳转到设置页面连接 GitHub
  router.push('/settings')
}

const loadRepositories = async () => {
  if (!selectedAccount.value) return

  loading.value = true
  try {
    const repos = await getGithubRepositories(selectedAccount.value)
    repositories.value = repos
  } catch (error) {
    console.error('Failed to load repositories:', error)
    await modal.alert(t('addProject.loadReposFailed'))
  } finally {
    loading.value = false
  }
}

const selectRepo = async (repo) => {
  // 如果点击的是已选中的仓库，则取消选中
  if (selectedRepo.value && selectedRepo.value.id === repo.id) {
    selectedRepo.value = null
    projectName.value = ''
    branch.value = ''
    branches.value = []
    port.value = 3001
    portError.value = ''
    portAvailable.value = false
    projectNameError.value = ''
    projectNameAvailable.value = false
    return
  }

  // 选中新仓库
  selectedRepo.value = repo

  // 规范化项目名称：将 . 替换为 -，确保符合命名规则
  const normalizedName = repo.name.replace(/\./g, '-').replace(/[^a-zA-Z0-9_-]/g, '-')
  projectName.value = normalizedName

  // 加载仓库的分支列表
  loadBranches()

  // 自动获取下一个可用端口
  try {
    const availablePort = await getNextAvailablePort()
    port.value = availablePort
    // 立即检查端口可用性，不等待 watch 的防抖
    await checkPortAvailability()
  } catch (error) {
    console.error('Failed to get next available port:', error)
    // 失败时使用默认端口并检查
    port.value = 3001
    await checkPortAvailability()
  }
}

const loadBranches = async () => {
  if (!selectedRepo.value || !selectedAccount.value) return

  // 保存当前选中的仓库引用，用于检查是否被取消选中
  const currentRepo = selectedRepo.value

  loadingBranches.value = true
  try {
    // 从 fullName 中提取 owner 和 repo
    const [owner, repo] = currentRepo.fullName.split('/')
    const branchList = await getGithubBranches(selectedAccount.value, owner, repo)

    // 检查在加载过程中仓库是否被取消选中
    if (selectedRepo.value !== currentRepo) {
      console.log('Repository was deselected during branch loading, canceling...')
      return
    }

    branches.value = branchList

    // 自动选择默认分支
    if (branchList.length > 0) {
      branch.value = currentRepo.defaultBranch || branchList[0]
    }
  } catch (error) {
    // 如果在加载过程中仓库被取消选中，不显示错误提示
    if (selectedRepo.value !== currentRepo) {
      console.log('Repository was deselected during branch loading, ignoring error')
      return
    }

    console.error('Failed to load branches:', error)
    await modal.alert(t('addProject.loadBranchesFailed'))
    branches.value = []
  } finally {
    loadingBranches.value = false
  }
}

const checkProjectNameAvailability = async () => {
  projectNameError.value = ''
  projectNameAvailable.value = false

  if (!projectName.value || !projectName.value.trim()) {
    return
  }

  // 验证项目名称格式（只允许字母、数字、连字符、下划线）
  const namePattern = /^[a-zA-Z0-9_-]+$/
  if (!namePattern.test(projectName.value)) {
    projectNameError.value = t('addProject.invalidProjectName')
    return
  }

  projectNameChecking.value = true

  try {
    const result = await checkProjectName(projectName.value)
    console.log('Project name check result:', result)

    if (result && result.available === true) {
      projectNameAvailable.value = true
    } else {
      projectNameError.value = t('addProject.projectNameExists')
    }
  } catch (error) {
    console.error('Failed to check project name:', error)
    console.error('Error details:', error.response?.data || error.message)
    projectNameError.value = t('addProject.projectNameCheckFailed')
  } finally {
    projectNameChecking.value = false
  }
}

const checkPortAvailability = async () => {
  portError.value = ''
  portAvailable.value = false

  if (!port.value || port.value < 1024 || port.value > 65535) {
    portError.value = t('addProject.invalidPort')
    return
  }

  portChecking.value = true

  try {
    const result = await checkPort(port.value)
    console.log('Port check result:', result)

    if (result && result.available === true) {
      portAvailable.value = true
    } else {
      portError.value = t('addProject.portInUse')
    }
  } catch (error) {
    console.error('Failed to check port:', error)
    console.error('Error details:', error.response?.data || error.message)
    portError.value = t('addProject.portCheckFailed')
  } finally {
    portChecking.value = false
  }
}

const cancel = () => {
  selectedRepo.value = null
  projectName.value = ''
  branch.value = ''
  port.value = 3001
  branches.value = []
  portError.value = ''
  portAvailable.value = false
  projectNameError.value = ''
  projectNameAvailable.value = false
}

const addProject = async () => {
  // 验证表单
  if (!selectedRepo.value) {
    await modal.alert(t('addProject.selectRepoRequired'))
    return
  }

  if (!projectName.value.trim()) {
    await modal.alert(t('addProject.projectNameRequired'))
    return
  }

  if (projectNameError.value || !projectNameAvailable.value) {
    await modal.alert(t('addProject.projectNameNotAvailable'))
    return
  }

  if (!branch.value) {
    await modal.alert(t('addProject.branchRequired'))
    return
  }

  if (portError.value || !portAvailable.value) {
    await modal.alert(t('addProject.portNotAvailable'))
    return
  }

  try {
    const [owner, repo] = selectedRepo.value.fullName.split('/')

    const response = await createProject({
      name: projectName.value,
      accountId: selectedAccount.value,
      repository: selectedRepo.value.fullName,
      owner,
      repo,
      branch: branch.value,
      serverHost: serverHost.value, // 传递选择的服务器 IP
      port: port.value
    })

    console.log('Create project response:', response)

    // 自动触发部署（不等待完成）
    if (response && response.project && response.project.id) {
      const projectId = response.project.id

      // 首次部署，传递reason为'initial'
      deployProject(projectId, { reason: 'initial', triggeredBy: 'admin' }).catch(err => {
        console.error('Deployment failed:', err)
      })

      // 直接跳转到项目详情页
      router.push(`/project/${projectId}`)
    } else {
      console.error('Invalid response structure:', response)
      await modal.alert(t('addProject.createProjectFailed'))
    }
  } catch (error) {
    console.error('Failed to create project:', error)
    await modal.alert(t('addProject.createProjectFailed'))
  }
}

// 格式化为完整的时间（带相对时间）
const formatFullDate = (dateString) => {
  if (!dateString) return ''

  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  const fullDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

  // 计算相对时间
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  let relativeTime = ''
  if (diffMinutes < 1) {
    relativeTime = t('addProject.justNow')
  } else if (diffMinutes < 60) {
    relativeTime = t('addProject.minutesAgo', { count: diffMinutes })
  } else if (diffHours < 24) {
    relativeTime = t('addProject.hoursAgo', { count: diffHours })
  } else if (diffDays < 7) {
    relativeTime = t('addProject.daysAgo', { count: diffDays })
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    relativeTime = t('addProject.weeksAgo', { count: weeks })
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    relativeTime = t('addProject.monthsAgo', { count: months })
  } else {
    const years = Math.floor(diffDays / 365)
    relativeTime = t('addProject.yearsAgo', { count: years })
  }

  return `${fullDate} (${relativeTime})`
}
</script>

<style scoped>
.add-project {
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

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-large {
  padding: 14px 28px;
  font-size: 16px;
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

.content-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.github-connect {
  text-align: center;
  padding: 40px 20px;
}

.github-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.github-connect h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.github-connect p {
  color: #7f8c8d;
  margin-bottom: 30px;
}

.account-selector {
  margin-bottom: 20px;
}

.account-selector label {
  display: block;
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.account-select {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.account-select:focus {
  outline: none;
  border-color: #3498db;
}

.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #ecf0f1;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-repos {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.repos-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 30px;
}

.repo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.repo-item:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.repo-item.selected {
  border-color: #3498db;
  background: #ebf5fb;
}

.repo-info h3 {
  color: #2c3e50;
  font-size: 16px;
  margin-bottom: 5px;
}

.repo-description {
  color: #7f8c8d;
  font-size: 13px;
  margin-bottom: 8px;
}

.repo-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #95a5a6;
  flex-wrap: wrap;
}

.check-icon {
  font-size: 24px;
  color: #3498db;
  font-weight: bold;
}

.project-config {
  border-top: 2px solid #ecf0f1;
  padding-top: 30px;
}

.project-config h3 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: #2c3e50;
  font-weight: 500;
  margin-bottom: 8px;
  font-size: 14px;
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

.input-error {
  border-color: #e74c3c;
}

.input-error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
}

.error-message {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 5px;
}

.info-message {
  color: #3498db;
  font-size: 13px;
  margin-top: 5px;
}

.success-message {
  color: #27ae60;
  font-size: 13px;
  margin-top: 5px;
}

.help-text {
  color: #7f8c8d;
  font-size: 12px;
  margin-top: 5px;
  margin-bottom: 0;
}

.branch-select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.server-host-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-select {
  flex: 1;
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  background: white;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #3498db;
}

.form-select:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.refresh-btn {
  padding: 10px 12px;
  background: #3498db;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
}

.refresh-btn:hover {
  background: #2980b9;
  transform: rotate(90deg);
}

.refresh-btn:active {
  transform: rotate(180deg);
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}
</style>
