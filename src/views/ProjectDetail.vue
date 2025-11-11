<template>
  <Layout>
    <div class="project-detail">
      <div class="page-header">
        <div>
          <h1>{{ project.name }}</h1>
          <p class="subtitle">{{ project.repository }}</p>
        </div>
        <div class="header-actions">
          <StatusBadge :status="project.status" />
          <router-link to="/" class="btn btn-secondary">
            ← {{ $t('projectDetail.backButton') }}
          </router-link>
        </div>
      </div>

      <div class="content-grid">
        <!-- Project Info Card -->
        <div class="info-card">
          <h2>{{ $t('projectDetail.projectInfo') }}</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('projectDetail.repository') }}</label>
              <a :href="`https://github.com/${project.repository}`" target="_blank" class="link">
                {{ project.repository }}
              </a>
            </div>
            <div class="info-item">
              <label>{{ $t('projectDetail.branch') }}</label>
              <span>{{ project.branch }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('projectDetail.port') }}</label>
              <span>{{ project.port || $t('projectDetail.notAssigned') }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('projectDetail.lastDeploy') }}</label>
              <span>{{ formatDate(project.lastDeploy) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('projectDetail.buildCommand') }}</label>
              <code>{{ project.buildCommand || 'npm run build' }}</code>
            </div>
            <div class="info-item">
              <label>{{ $t('projectDetail.outputDir') }}</label>
              <code>{{ project.outputDir || 'dist' }}</code>
            </div>
          </div>

          <div class="info-actions">
            <a v-if="project.url" :href="project.url" target="_blank" class="btn btn-secondary">
              🔗 {{ $t('projectDetail.visitSite') }}
            </a>
            <button
              v-if="project.status === 'stopped'"
              class="btn btn-success"
              @click="startProject"
              :disabled="isStarting"
            >
              {{ isStarting ? '🔄 ' + $t('projectDetail.starting') : '▶️ ' + $t('projectDetail.start') }}
            </button>
            <button
              v-if="project.status === 'running'"
              class="btn btn-warning"
              @click="stopProject"
              :disabled="isStopping"
            >
              {{ isStopping ? '🔄 ' + $t('projectDetail.stopping') : '⏹️ ' + $t('projectDetail.stop') }}
            </button>
            <button class="btn btn-primary" @click="deploy" :disabled="isDeploying">
              {{ isDeploying ? '🔄 ' + $t('projectDetail.deploying') : '🔄 ' + $t('projectDetail.redeploy') }}
            </button>
            <button class="btn btn-edit" @click="showSettings = true">
              ⚙️ {{ $t('projectDetail.settings') }}
            </button>
            <button class="btn btn-danger" @click="deleteProject">
              🗑️ {{ $t('projectDetail.deleteProject') }}
            </button>
          </div>
        </div>

        <!-- Deployment Logs -->
        <div class="logs-card">
          <LogViewer
            :logs="deploymentLogs"
            title="Deployment Logs"
            @clear="clearLogs"
            @download="downloadLogs"
          />
        </div>

        <!-- Deployment History -->
        <div class="history-card">
          <h2>{{ $t('projectDetail.deploymentHistory') }}</h2>
          <div v-if="deploymentHistory.length === 0" class="empty-history">
            {{ $t('projectDetail.noHistory') }}
          </div>
          <div v-else class="history-list">
            <div
              v-for="deployment in deploymentHistory"
              :key="deployment.id"
              class="history-item"
            >
              <div class="history-info">
                <!-- 第一行：状态、时间、部署原因 -->
                <div>
                  <StatusBadge :status="deployment.status" />
                  <span class="history-time">{{ formatDate(deployment.timestamp) }}</span>

                  <!-- 部署原因标签 -->
                  <span v-if="deployment.reason" class="reason-badge" :class="`reason-${deployment.reason}`">
                    {{ $t(`projectDetail.deployReasons.${deployment.reason}`) }}
                  </span>
                </div>

                <!-- Commit信息 -->
                <div v-if="deployment.commit || deployment.commitHash" class="commit-info">
                  <span class="commit-hash" :title="deployment.commitHash || deployment.commit">
                    📝 {{ deployment.commit || (deployment.commitHash && deployment.commitHash.substring(0, 7)) }}
                  </span>
                  <span v-if="deployment.commitMessage" class="commit-message" :title="deployment.commitMessage">
                    {{ deployment.commitMessage }}
                  </span>
                  <span v-if="deployment.commitAuthor" class="commit-author">
                    👤 {{ deployment.commitAuthor }}
                  </span>
                </div>
              </div>
              <button class="btn-link" @click="viewLogs(deployment.id)">
                {{ $t('projectDetail.viewLogs') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Environment Variables -->
        <div class="env-card">
          <h2>{{ $t('projectDetail.envVars') }}</h2>
          <p class="env-description">
            {{ $t('projectDetail.envVarsDesc') }}
          </p>
          <div class="env-list">
            <div
              v-for="(value, key) in envVars"
              :key="key"
              class="env-item"
            >
              <input v-model="envVars[key].key" class="env-key" :placeholder="$t('projectDetail.keyPlaceholder')" />
              <input
                v-model="envVars[key].value"
                :type="envVars[key].hidden ? 'password' : 'text'"
                class="env-value"
                :placeholder="$t('projectDetail.valuePlaceholder')"
              />
              <button class="btn-icon" @click="toggleEnvVisibility(key)">
                {{ envVars[key].hidden ? '👁️' : '🙈' }}
              </button>
              <button class="btn-icon" @click="removeEnv(key)">
                🗑️
              </button>
            </div>
          </div>
          <button class="btn btn-secondary btn-small" @click="addEnv">
            ➕ {{ $t('projectDetail.addVariable') }}
          </button>
          <button class="btn btn-primary btn-small" @click="saveEnvVars">
            💾 {{ $t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <DeleteProgressModal
      ref="deleteProgressModal"
      :show="showDeleteProgress"
      @close="showDeleteProgress = false"
    />

    <EditProjectModal
      v-model="showSettings"
      :project="project"
      @save="handleSaveProject"
    />
  </Layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Layout from '@/components/Layout.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import LogViewer from '@/components/LogViewer.vue'
import DeleteProgressModal from '@/components/DeleteProgressModal.vue'
import EditProjectModal from '@/components/EditProjectModal.vue'
import { useModal } from '@/utils/modal'
import { useToast } from '@/utils/toast'
import { projectsAPI, deployProject as apiDeployProject, getDeploymentHistory, getEnvVars, updateEnvVars, getProjectLogs } from '@/api/projects'

const { t } = useI18n()
const modal = useModal()
const toast = useToast()

const route = useRoute()
const router = useRouter()

const projectId = route.params.id

const project = ref({
  id: projectId,
  name: '',
  repository: '',
  branch: '',
  port: null,
  status: 'pending',
  url: null,
  lastDeploy: null,
  buildCommand: '',
  outputDir: 'dist'
})

const isDeploying = ref(false)
const isStarting = ref(false)
const isStopping = ref(false)
const loading = ref(true)
const showDeleteProgress = ref(false)
const deleteProgressModal = ref(null)
const showSettings = ref(false)

// 定时器引用，用于清理
let projectRefreshInterval = null
let historyRefreshInterval = null

// SSE 连接引用
let logEventSource = null

// 页面加载时获取项目详情
onMounted(async () => {
  await loadProject()
  await loadLogs()
  await loadDeploymentHistory()
  await loadEnvVars()

  // 自动刷新状态每5秒
  projectRefreshInterval = setInterval(loadProject, 5000)

  // 使用 SSE 实时获取日志（替代轮询）
  connectLogStream()

  // 刷新部署历史每10秒
  historyRefreshInterval = setInterval(loadDeploymentHistory, 10000)
})

// 组件卸载时清理定时器和 SSE 连接
onUnmounted(() => {
  if (projectRefreshInterval) clearInterval(projectRefreshInterval)
  if (historyRefreshInterval) clearInterval(historyRefreshInterval)

  // 关闭 SSE 连接
  if (logEventSource) {
    logEventSource.close()
    logEventSource = null
  }
})

// 加载项目详情
const loadProject = async () => {
  try {
    console.log('[ProjectDetail] Loading project with ID:', projectId)
    const projectData = await projectsAPI.getProject(projectId)
    console.log('[ProjectDetail] Project data received:', projectData)
    project.value = projectData
  } catch (error) {
    console.error('[ProjectDetail] Failed to load project:', error)
    console.error('[ProjectDetail] Error details:', error.response?.data || error.message)

    // 清理所有定时器和连接
    if (projectRefreshInterval) clearInterval(projectRefreshInterval)
    if (historyRefreshInterval) clearInterval(historyRefreshInterval)
    if (logEventSource) {
      logEventSource.close()
      logEventSource = null
    }

    // 只在首次加载时显示错误并跳转
    if (loading.value) {
      await modal.alert(t('projectDetail.loadFailed'))
      router.push('/')
    }
  } finally {
    loading.value = false
  }
}

const deploymentLogs = ref([])

// 加载部署日志（初始加载）
const loadLogs = async () => {
  try {
    const response = await getProjectLogs(projectId)
    if (response && response.logs) {
      deploymentLogs.value = response.logs
    }
  } catch (error) {
    console.error('Failed to load logs:', error)
    // 如果项目不存在（404），停止定时器和 SSE
    if (error.response?.status === 404) {
      if (historyRefreshInterval) clearInterval(historyRefreshInterval)
      if (logEventSource) {
        logEventSource.close()
        logEventSource = null
      }
    }
  }
}

// 连接 SSE 日志流
const connectLogStream = () => {
  // 如果已有连接，先关闭
  if (logEventSource) {
    logEventSource.close()
  }

  // 获取认证 token
  const token = localStorage.getItem('auth_token')
  if (!token) {
    console.error('[SSE] No auth token found')
    return
  }

  // 创建 SSE 连接（通过在 URL 中传递 token，因为 EventSource 不支持自定义 headers）
  const url = `/api/projects/${projectId}/logs/stream?token=${encodeURIComponent(token)}`
  logEventSource = new EventSource(url)

  logEventSource.onopen = () => {
    console.log('[SSE] Log stream connected')
  }

  logEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)

      // 忽略连接消息
      if (data.type === 'connected') {
        return
      }

      // 添加新日志到列表
      deploymentLogs.value.push(data)

      // 限制日志数量，避免内存溢出（保留最近1000条）
      if (deploymentLogs.value.length > 1000) {
        deploymentLogs.value = deploymentLogs.value.slice(-1000)
      }
    } catch (error) {
      console.error('[SSE] Failed to parse log data:', error)
    }
  }

  logEventSource.onerror = (error) => {
    console.error('[SSE] Connection error:', error)

    // 连接失败，5秒后重试
    if (logEventSource) {
      logEventSource.close()
      logEventSource = null
    }

    setTimeout(() => {
      // 只有在组件还在时才重连
      if (!loading.value) {
        console.log('[SSE] Attempting to reconnect...')
        connectLogStream()
      }
    }, 5000)
  }
}

const deploymentHistory = ref([])

// 加载部署历史
const loadDeploymentHistory = async () => {
  try {
    const response = await getDeploymentHistory(projectId)
    if (response && response.deployments) {
      deploymentHistory.value = response.deployments
    }
  } catch (error) {
    console.error('Failed to load deployment history:', error)
    // 如果项目不存在（404），停止定时器
    if (error.response?.status === 404) {
      if (historyRefreshInterval) clearInterval(historyRefreshInterval)
    }
  }
}

const envVars = ref({})

// 加载环境变量
const loadEnvVars = async () => {
  try {
    const response = await getEnvVars(projectId)
    if (response && response.env) {
      // Convert object to array format for UI
      const envArray = {}
      let counter = 1
      for (const [key, value] of Object.entries(response.env)) {
        envArray[counter] = { key, value, hidden: true }
        counter++
      }
      envVars.value = envArray
    }
  } catch (error) {
    console.error('Failed to load env vars:', error)
  }
}

const formatDate = (date) => {
  if (!date) return t('dashboard.never')
  return new Date(date).toLocaleString()
}

const startProject = async () => {
  try {
    isStarting.value = true
    await projectsAPI.startProject(projectId)
    toast.success(t('projectDetail.projectStarted'))
    await loadProject()
  } catch (error) {
    console.error('Failed to start project:', error)
    const errorMsg = error.response?.data?.error || error.message
    toast.error(t('projectDetail.startFailed') + ': ' + errorMsg)
  } finally {
    isStarting.value = false
  }
}

const stopProject = async () => {
  try {
    isStopping.value = true
    await projectsAPI.stopProject(projectId)
    toast.success(t('projectDetail.projectStopped'))
    await loadProject()
  } catch (error) {
    console.error('Failed to stop project:', error)
    toast.error(t('projectDetail.stopFailed'))
  } finally {
    isStopping.value = false
  }
}

const deploy = async () => {
  try {
    isDeploying.value = true

    // 清空旧日志，避免新旧日志混在一起
    deploymentLogs.value = []

    // 手动部署，传递reason为'manual'
    await apiDeployProject(projectId, { reason: 'manual', triggeredBy: 'admin' })
    deploymentLogs.value.push({
      type: 'success',
      timestamp: Date.now(),
      message: 'Deployment started!'
    })
    toast.success(t('projectDetail.deploymentStarted'))
    // 刷新项目状态
    await loadProject()
  } catch (error) {
    console.error('Deployment failed:', error)
    toast.error(t('projectDetail.deploymentFailed'))
  } finally {
    isDeploying.value = false
  }
}

const handleSaveProject = async (updatedProject) => {
  try {
    await projectsAPI.updateProject(updatedProject.id, updatedProject)
    toast.success(t('projectDetail.projectUpdated'))
    await loadProject()
  } catch (error) {
    console.error('Failed to update project:', error)
    toast.error(t('projectDetail.projectUpdateFailed'))
  }
}

const deleteProject = async () => {
  const confirmed = await modal.confirm(t('projectDetail.deleteConfirm'))
  if (!confirmed) return

  // 显示进度 Modal
  showDeleteProgress.value = true
  deleteProgressModal.value.reset()

  try {
    // Step 1: 停止服务
    deleteProgressModal.value.setStep(0)
    await new Promise(resolve => setTimeout(resolve, 300))

    // Step 2: 等待资源释放
    deleteProgressModal.value.setStep(1)
    await new Promise(resolve => setTimeout(resolve, 200))

    // Step 3 & 4: 删除项目（后端会处理这两步）
    deleteProgressModal.value.setStep(2)
    await projectsAPI.deleteProject(projectId)

    deleteProgressModal.value.setStep(3)
    await new Promise(resolve => setTimeout(resolve, 300))

    // 完成
    showDeleteProgress.value = false
    toast.success(t('projectDetail.projectDeleted'))
    router.push('/')
  } catch (error) {
    console.error('Failed to delete project:', error)
    const errorMsg = error.response?.data?.error || error.message
    deleteProgressModal.value.setError(errorMsg)
  }
}

const clearLogs = () => {
  deploymentLogs.value = []
}

const downloadLogs = () => {
  const logsText = deploymentLogs.value
    .map(log => `[${new Date(log.timestamp).toISOString()}] ${log.type.toUpperCase()}: ${log.message}`)
    .join('\n')

  const blob = new Blob([logsText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.value.name}-logs.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const viewLogs = async (deploymentId) => {
  try {
    const response = await getProjectLogs(projectId, deploymentId)
    if (response && response.logs) {
      deploymentLogs.value = response.logs
    }
  } catch (error) {
    console.error('Failed to load deployment logs:', error)
  }
}

let envCounter = Object.keys(envVars.value).length

const addEnv = () => {
  envCounter++
  envVars.value[envCounter] = { key: '', value: '', hidden: false }
}

const removeEnv = (key) => {
  delete envVars.value[key]
}

const toggleEnvVisibility = (key) => {
  envVars.value[key].hidden = !envVars.value[key].hidden
}

const saveEnvVars = async () => {
  try {
    // Convert array format to object
    const envObject = {}
    for (const item of Object.values(envVars.value)) {
      if (item.key && item.value) {
        envObject[item.key] = item.value
      }
    }

    await updateEnvVars(projectId, envObject)
    await modal.alert(t('common.success'))
  } catch (error) {
    console.error('Failed to save env vars:', error)
    await modal.alert('Failed to save environment variables')
  }
}
</script>

<style scoped>
.project-detail {
  max-width: 1400px;
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

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
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

.btn-small {
  padding: 8px 16px;
  font-size: 13px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  background: #95a5a6;
  cursor: not-allowed;
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

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover {
  background: #229954;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-warning:hover {
  background: #e67e22;
}

.btn-edit {
  background: #3498db;
  color: white;
}

.btn-edit:hover {
  background: #2980b9;
}

.btn-link {
  background: transparent;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
}

.btn-icon {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
}

.content-grid {
  display: grid;
  gap: 20px;
}

.info-card,
.logs-card,
.history-card,
.env-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-card h2,
.history-card h2,
.env-card h2 {
  font-size: 20px;
  color: #2c3e50;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
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
}

.link {
  color: #3498db;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.info-actions {
  display: flex;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #ecf0f1;
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #ecf0f1;
  border-radius: 8px;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #2c3e50;
  flex: 1;
}

.history-info > div:first-child {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.history-time {
  color: #7f8c8d;
}

.history-commit {
  font-family: 'Consolas', monospace;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 部署原因标签样式 */
.reason-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.reason-manual {
  background: #e3f2fd;
  color: #1976d2;
}

.reason-initial {
  background: #f3e5f5;
  color: #7b1fa2;
}

.reason-push {
  background: #e8f5e9;
  color: #388e3c;
}

.reason-auto {
  background: #fff3e0;
  color: #f57c00;
}

/* Commit信息样式 */
.commit-info {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  font-size: 12px;
}

.commit-hash {
  font-family: 'Consolas', monospace;
  background: #f5f5f5;
  padding: 3px 8px;
  border-radius: 4px;
  color: #2c3e50;
  cursor: help;
}

.commit-message {
  color: #34495e;
  font-style: italic;
  max-width: 400px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
}

.commit-author {
  color: #7f8c8d;
  font-size: 11px;
}

.env-description {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 20px;
}

.env-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.env-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.env-key,
.env-value {
  padding: 8px 12px;
  border: 2px solid #ecf0f1;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Consolas', monospace;
}

.env-key {
  flex: 0 0 200px;
}

.env-value {
  flex: 1;
}

.env-key:focus,
.env-value:focus {
  outline: none;
  border-color: #3498db;
}
</style>
