<template>
  <Teleport to="body">
    <div v-if="modelValue" class="edit-modal-overlay" @click.self="handleCancel">
      <div class="edit-modal-container">
        <div class="modal-header">
          <h3 class="modal-title">{{ $t('dashboard.editProject') }}</h3>
          <button class="close-btn" @click="handleCancel">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>{{ $t('dashboard.projectName') }}</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input form-input-disabled"
              :placeholder="$t('dashboard.projectName')"
              disabled
            />
          </div>

          <div class="form-group">
            <label>{{ $t('dashboard.repository') }}</label>
            <input
              v-model="formData.repository"
              type="text"
              class="form-input form-input-disabled"
              :placeholder="$t('dashboard.repositoryPlaceholder')"
              disabled
            />
          </div>

          <div class="form-group">
            <label>{{ $t('dashboard.branch') }}</label>
            <div class="branch-select-wrapper">
              <select
                v-model="formData.branch"
                class="form-select"
                :disabled="loadingBranches"
              >
                <option v-if="loadingBranches" value="">{{ $t('dashboard.loadingBranches') }}</option>
                <option v-for="branch in branches" :key="branch" :value="branch">
                  {{ branch }}
                </option>
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
              <select v-model="formData.serverHost" class="form-select">
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
              >
                🔄
              </button>
            </div>
            <p class="help-text">{{ $t('addProject.serverHostHelp') }}</p>
          </div>

          <div class="form-group">
            <label>{{ $t('dashboard.port') }}</label>
            <input
              v-model.number="formData.port"
              type="number"
              class="form-input"
              :class="{ 'input-error': portError }"
              placeholder="3000"
            />
            <p v-if="portError" class="error-message">{{ portError }}</p>
            <p v-else-if="portChecking" class="info-message">{{ $t('addProject.checkingPort') }}</p>
            <p v-else-if="portAvailable" class="success-message">{{ $t('addProject.portAvailable') }}</p>
          </div>

          <div class="form-group">
            <label>{{ $t('dashboard.buildCommand') }}</label>
            <input
              v-model="formData.buildCommand"
              type="text"
              class="form-input"
              placeholder="npm run build"
            />
          </div>

          <div class="form-group">
            <label>{{ $t('dashboard.outputDir') }}</label>
            <input
              v-model="formData.outputDir"
              type="text"
              class="form-input"
              placeholder="dist"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleCancel">
            {{ $t('common.cancel') }}
          </button>
          <button class="btn btn-primary" @click="handleSave">
            {{ $t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getGithubBranches } from '@/api/github'
import { checkPort as apiCheckPort } from '@/api/projects'
import { getNetworkInterfaces } from '@/api/system'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const formData = ref({
  name: '',
  repository: '',
  branch: 'main',
  serverHost: '',
  port: 3000,
  buildCommand: 'npm run build',
  outputDir: 'dist'
})

const branches = ref([])
const loadingBranches = ref(false)
const networkInterfaces = ref([])
const portError = ref('')
const portChecking = ref(false)
const portAvailable = ref(false)
const originalPort = ref(null)
let portCheckTimer = null

// 监听端口变化，实时检查
watch(() => formData.value.port, (newPort) => {
  // 清除之前的定时器
  if (portCheckTimer) {
    clearTimeout(portCheckTimer)
  }

  // 防抖：500ms 后执行检查
  portCheckTimer = setTimeout(() => {
    checkPort()
  }, 500)
})

const checkPort = async () => {
  portError.value = ''
  portAvailable.value = false

  // 如果端口没有改变，不需要检查
  if (formData.value.port === originalPort.value) {
    portAvailable.value = true
    return
  }

  if (!formData.value.port || formData.value.port < 1024 || formData.value.port > 65535) {
    portError.value = t('addProject.invalidPort')
    return
  }

  portChecking.value = true

  try {
    const result = await apiCheckPort(formData.value.port)
    if (result && result.available === true) {
      portAvailable.value = true
    } else {
      portError.value = t('addProject.portInUse')
    }
  } catch (error) {
    console.error('Failed to check port:', error)
    portError.value = t('addProject.portCheckFailed')
  } finally {
    portChecking.value = false
  }
}

const loadBranches = async () => {
  if (!props.project?.accountId || !props.project?.owner || !props.project?.repo) {
    console.warn('Missing accountId, owner, or repo for loading branches')
    return
  }

  loadingBranches.value = true
  try {
    const branchList = await getGithubBranches(
      props.project.accountId,
      props.project.owner,
      props.project.repo
    )
    branches.value = branchList
  } catch (error) {
    console.error('Failed to load branches:', error)
    // 使用当前分支作为后备
    branches.value = [props.project.branch || 'main']
  } finally {
    loadingBranches.value = false
  }
}

// 加载网络接口列表（按需加载，每次都重新获取）
const loadNetworkInterfaces = async () => {
  try {
    console.log('[EditProjectModal] Loading network interfaces from API...')
    const response = await getNetworkInterfaces()
    console.log('[EditProjectModal] Network interfaces response:', response)
    networkInterfaces.value = response.interfaces || []
    console.log('[EditProjectModal] Network interfaces count:', networkInterfaces.value.length)
    console.log('[EditProjectModal] Network interfaces array:', JSON.stringify(networkInterfaces.value, null, 2))
    console.log('[EditProjectModal] Final networkInterfaces.value:', networkInterfaces.value)
  } catch (error) {
    console.error('[EditProjectModal] Failed to load network interfaces:', error)
    console.error('[EditProjectModal] Error details:', error.response?.data || error.message)
    networkInterfaces.value = [{
      name: 'localhost',
      address: 'localhost',
      family: 'IPv4',
      internal: true,
      description: '本机访问'
    }]
  }
}

watch(() => props.project, (newProject) => {
  if (newProject && newProject.id) { // 添加 id 检查，确保项目数据完整
    formData.value = {
      name: newProject.name || '',
      repository: newProject.repository || '',
      branch: newProject.branch || 'main',
      serverHost: newProject.serverHost || '',
      port: newProject.port || 3000,
      buildCommand: newProject.buildCommand || 'npm run build',
      outputDir: newProject.outputDir || 'dist'
    }
    // 保存原始端口
    originalPort.value = newProject.port || 3000
    // 重置端口检查状态
    portError.value = ''
    portAvailable.value = true
    portChecking.value = false
    // 加载分支列表
    loadBranches()
    // 加载网络接口列表
    console.log('[EditProjectModal] Modal opened, loading network interfaces...')
    loadNetworkInterfaces()
  }
}, { immediate: true })

// 移除 onMounted，改为在下拉框获得焦点时加载

const handleCancel = () => {
  emit('update:modelValue', false)
}

const handleSave = () => {
  // 验证端口
  if (portError.value || (!portAvailable.value && formData.value.port !== originalPort.value)) {
    return
  }

  emit('save', { ...props.project, ...formData.value })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.edit-modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 500;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input-disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
  border-color: #e0e0e0;
}

.form-input-disabled:focus {
  border-color: #e0e0e0;
  box-shadow: none;
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
  margin-bottom: 0;
}

.info-message {
  color: #667eea;
  font-size: 13px;
  margin-top: 5px;
  margin-bottom: 0;
}

.success-message {
  color: #27ae60;
  font-size: 13px;
  margin-top: 5px;
  margin-bottom: 0;
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
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background: white;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-select:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.refresh-btn {
  padding: 10px 12px;
  background: #667eea;
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
  background: #5568d3;
  transform: rotate(90deg);
}

.refresh-btn:active {
  transform: rotate(180deg);
}

.modal-footer {
  padding: 16px 24px;
  background: #f8f9fa;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: white;
  color: #6c757d;
  border: 2px solid #dee2e6;
}

.btn-secondary:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}
</style>
