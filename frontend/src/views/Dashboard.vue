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

      <!-- 已移除：系统前端模式切换与重启相关 UI -->
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

let projectsStateEventSource = null

onMounted(async () => {
  await loadProjects()
  connectProjectsStateStream()
})

onUnmounted(() => {
  if (projectsStateEventSource) {
    projectsStateEventSource.close()
    projectsStateEventSource = null
  }
})

const connectProjectsStateStream = () => {
  if (projectsStateEventSource) {
    projectsStateEventSource.close()
  }
  const token = localStorage.getItem('auth_token')
  if (!token) {
    console.error('[SSE] No auth token found')
    return
  }
  const url = `/api/projects/state/stream?token=${encodeURIComponent(token)}`
  projectsStateEventSource = new EventSource(url)
  projectsStateEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'connected') return
      if (data.type === 'initial') {
        // 过滤掉没有 name 的项目，以及系统前端项目
        projects.value = (data.data || []).filter(p => p && p.id && p.name && p.type !== 'core')
      } else if (data.type === 'project.update') {
        if (!data.data || !data.data.name) {
          console.warn('[SSE] 忽略无效项目更新（缺少 name）:', data)
          return
        }
        const index = projects.value.findIndex(p => p.id === data.projectId)
        if (index !== -1) {
          projects.value[index] = { ...projects.value[index], ...data.data }
        } else {
          projects.value.push({ id: data.projectId, ...data.data })
        }
      } else if (data.type === 'project.deleted') {
        const index = projects.value.findIndex(p => p.id === data.projectId)
        if (index !== -1) projects.value.splice(index, 1)
      }
    } catch (e) {
      console.error('[SSE] parse error:', e)
    }
  }
  projectsStateEventSource.onerror = () => {
    projectsStateEventSource?.close()
    projectsStateEventSource = null
    setTimeout(connectProjectsStateStream, 5000)
  }
}

const loadProjects = async () => {
  loading.value = true
  try {
    const projectList = await projectsAPI.getProjects()
    // 过滤掉系统前端项目
    projects.value = projectList.filter(p => p.type !== 'core')
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