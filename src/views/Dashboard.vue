<template>
  <Layout>
    <div class="dashboard">
      <div class="page-header">
        <div>
          <h1>{{ $t('dashboard.title') }}</h1>
          <p class="subtitle">{{ $t('dashboard.subtitle') }}</p>
        </div>
        <router-link to="/add-project" class="btn btn-primary">
          ➕ {{ $t('dashboard.addProject') }}
        </router-link>
      </div>

      <div v-if="projects.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h2>{{ $t('dashboard.noProjects') }}</h2>
        <p>{{ $t('dashboard.noProjectsDesc') }}</p>
        <router-link to="/add-project" class="btn btn-primary">
          {{ $t('dashboard.addFirstProject') }}
        </router-link>
      </div>

      <div v-else class="projects-grid">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @click="goToProject(project.id)"
          @start="handleStart"
          @stop="handleStop"
        />
      </div>
    </div>

    <DeleteProgressModal
      ref="deleteProgressModal"
      :show="showDeleteProgress"
      @close="showDeleteProgress = false"
    />
  </Layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Layout from '@/components/Layout.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import DeleteProgressModal from '@/components/DeleteProgressModal.vue'
import { useModal } from '@/utils/modal'
import { useToast } from '@/utils/toast'
import { projectsAPI } from '@/api/projects'

const router = useRouter()
const modal = useModal()
const toast = useToast()
const { t } = useI18n()

const projects = ref([])
const loading = ref(true)
const showDeleteProgress = ref(false)
const deleteProgressModal = ref(null)

// 页面加载时获取项目列表
onMounted(async () => {
  await loadProjects()

  // 启动自动刷新（每5秒刷新一次状态）
  const refreshInterval = setInterval(async () => {
    // 静默刷新，不显示 loading
    try {
      const projectList = await projectsAPI.getProjects()
      projects.value = projectList
    } catch (error) {
      console.error('Failed to refresh projects:', error)
    }
  }, 5000)

  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(refreshInterval)
  })
})

// 加载项目列表
const loadProjects = async () => {
  loading.value = true
  try {
    const projectList = await projectsAPI.getProjects()
    projects.value = projectList
  } catch (error) {
    console.error('Failed to load projects:', error)
    await modal.alert(t('dashboard.loadProjectsFailed'))
  } finally {
    loading.value = false
  }
}

const goToProject = (id) => {
  router.push(`/project/${id}`)
}

const handleStart = async (projectId) => {
  try {
    await projectsAPI.startProject(projectId)
    await loadProjects()
    toast.success(t('dashboard.projectStarted'))
  } catch (error) {
    console.error('Failed to start project:', error)
    const errorMsg = error.response?.data?.error || error.message
    toast.error(t('dashboard.startFailed') + ': ' + errorMsg)
  }
}

const handleDelete = async (projectId) => {
  const confirmed = await modal.confirm(t('dashboard.deleteConfirm'))
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
    toast.success(t('dashboard.projectDeleted'))

    // 刷新项目列表
    await loadProjects()
  } catch (error) {
    console.error('Failed to delete project:', error)
    const errorMsg = error.response?.data?.error || error.message
    deleteProgressModal.value.setError(errorMsg)
  }
}

const handleStop = async (projectId) => {
  try {
    await projectsAPI.stopProject(projectId)
    await loadProjects()
    toast.success(t('dashboard.projectStopped'))
  } catch (error) {
    console.error('Failed to stop project:', error)
    const errorMsg = error.response?.data?.error || error.message
    toast.error(t('dashboard.stopFailed') + ': ' + errorMsg)
  }
}
</script>

<style scoped>
.dashboard {
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

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.empty-state h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.empty-state p {
  color: #7f8c8d;
  margin-bottom: 30px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}
</style>
