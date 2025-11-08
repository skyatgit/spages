<template>
  <Layout>
    <div class="dashboard">
      <div class="page-header">
        <div>
          <h1>Projects</h1>
          <p class="subtitle">Manage and deploy your frontend projects</p>
        </div>
        <router-link to="/add-project" class="btn btn-primary">
          ➕ Add Project
        </router-link>
      </div>

      <div v-if="projects.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h2>No Projects Yet</h2>
        <p>Get started by adding your first project from GitHub</p>
        <router-link to="/add-project" class="btn btn-primary">
          Add Your First Project
        </router-link>
      </div>

      <div v-else class="projects-grid">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @click="goToProject(project.id)"
          @deploy="handleDeploy(project.id)"
        />
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Layout from '@/components/Layout.vue'
import ProjectCard from '@/components/ProjectCard.vue'

const router = useRouter()

// Mock data for demonstration
const projects = ref([
  {
    id: '1',
    name: 'my-blog',
    repository: 'username/my-blog',
    branch: 'main',
    port: 3001,
    status: 'running',
    url: 'http://localhost:3001',
    lastDeploy: new Date().toISOString()
  },
  {
    id: '2',
    name: 'portfolio-site',
    repository: 'username/portfolio',
    branch: 'main',
    port: 3002,
    status: 'idle',
    url: 'http://localhost:3002',
    lastDeploy: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    name: 'docs-website',
    repository: 'username/docs',
    branch: 'develop',
    port: 3003,
    status: 'failed',
    url: null,
    lastDeploy: new Date(Date.now() - 172800000).toISOString()
  }
])

// For empty state demo, uncomment this:
// const projects = ref([])

const goToProject = (id) => {
  router.push(`/project/${id}`)
}

const handleDeploy = (id) => {
  console.log('Deploy project:', id)
  // Will implement actual deployment later
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

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
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
