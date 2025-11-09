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
          @deploy="handleDeploy(project.id)"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>

    <EditProjectModal
      v-model="showEditModal"
      :project="editingProject"
      @save="handleSaveProject"
    />
  </Layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Layout from '@/components/Layout.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import EditProjectModal from '@/components/EditProjectModal.vue'
import { useModal } from '@/utils/modal'
import { projectsAPI, deployProject } from '@/api/projects'

const router = useRouter()
const modal = useModal()
const { t } = useI18n()

const showEditModal = ref(false)
const editingProject = ref(null)
const projects = ref([])
const loading = ref(true)

// 页面加载时获取项目列表
onMounted(async () => {
  await loadProjects()
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

const handleDeploy = async (id) => {
  try {
    await deployProject(id)
    await modal.alert(t('dashboard.deploymentStarted'))
    // 刷新项目列表以显示最新状态
    await loadProjects()
  } catch (error) {
    console.error('Failed to deploy project:', error)
    await modal.alert(t('dashboard.deploymentFailed'))
  }
}

const handleEdit = (project) => {
  editingProject.value = project
  showEditModal.value = true
}

const handleSaveProject = async (updatedProject) => {
  try {
    // 发送到后端保存
    await projectsAPI.updateProject(updatedProject.id, updatedProject)

    // 更新本地项目列表
    const index = projects.value.findIndex(p => p.id === updatedProject.id)
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...updatedProject }
    }

    await modal.alert(t('dashboard.projectUpdated'))
  } catch (error) {
    console.error('Failed to update project:', error)
    await modal.alert(t('dashboard.projectUpdateFailed'))
  }
}

const handleDelete = async (projectId) => {
  const confirmed = await modal.confirm(t('dashboard.deleteConfirm'))
  if (!confirmed) return

  try {
    await projectsAPI.deleteProject(projectId)
    await modal.alert(t('dashboard.projectDeleted'))
    // 刷新项目列表
    await loadProjects()
  } catch (error) {
    console.error('Failed to delete project:', error)
    await modal.alert(t('dashboard.deleteFailed'))
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
