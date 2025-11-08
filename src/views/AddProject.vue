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
                  <span class="meta-item">⭐ {{ repo.stars }}</span>
                  <span class="meta-item">🔀 {{ repo.forks }}</span>
                  <span class="meta-item">{{ repo.language }}</span>
                  <span class="meta-item">{{ repo.visibility }}</span>
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
                placeholder="my-awesome-project"
              />
            </div>

            <div class="form-group">
              <label>{{ $t('addProject.branch') }}</label>
              <input
                v-model="branch"
                type="text"
                class="form-input"
                placeholder="main"
              />
            </div>

            <div class="form-group">
              <label>{{ $t('addProject.buildCommand') }}</label>
              <input
                v-model="buildCommand"
                type="text"
                class="form-input"
                :placeholder="$t('addProject.buildCommandPlaceholder')"
              />
            </div>

            <div class="form-group">
              <label>{{ $t('addProject.outputDir') }}</label>
              <input
                v-model="outputDir"
                type="text"
                class="form-input"
                :placeholder="$t('addProject.outputDirPlaceholder')"
              />
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Layout from '@/components/Layout.vue'

const router = useRouter()

const isGithubConnected = ref(true) // Mock: set to false to see connect screen
const loading = ref(false)
const searchQuery = ref('')
const selectedAccount = ref('1') // Selected GitHub account ID
const selectedRepo = ref(null)
const projectName = ref('')
const branch = ref('main')
const buildCommand = ref('')
const outputDir = ref('')

// Mock GitHub accounts
const githubAccounts = ref([
  {
    id: '1',
    username: 'john-doe',
    email: 'john@example.com'
  },
  {
    id: '2',
    username: 'company-org',
    email: 'dev@company.com'
  }
])

// Mock repositories data
const repositories = ref([
  {
    id: 1,
    name: 'my-blog',
    full_name: 'username/my-blog',
    description: 'Personal blog built with Vue and Vite',
    stars: 42,
    forks: 5,
    language: 'Vue',
    visibility: 'public'
  },
  {
    id: 2,
    name: 'portfolio-website',
    full_name: 'username/portfolio-website',
    description: 'My personal portfolio website',
    stars: 15,
    forks: 2,
    language: 'JavaScript',
    visibility: 'public'
  },
  {
    id: 3,
    name: 'react-dashboard',
    full_name: 'username/react-dashboard',
    description: 'Admin dashboard template with React',
    stars: 128,
    forks: 34,
    language: 'React',
    visibility: 'public'
  },
  {
    id: 4,
    name: 'docs-site',
    full_name: 'username/docs-site',
    description: 'Documentation website',
    stars: 8,
    forks: 1,
    language: 'TypeScript',
    visibility: 'private'
  }
])

const filteredRepos = computed(() => {
  if (!searchQuery.value) return repositories.value
  return repositories.value.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const connectGithub = () => {
  console.log('Connecting to GitHub...')
  // Will implement OAuth flow later
  isGithubConnected.value = true
}

const loadRepositories = () => {
  console.log('Loading repositories for account:', selectedAccount.value)
  loading.value = true
  // Simulate API call
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const selectRepo = (repo) => {
  selectedRepo.value = repo
  projectName.value = repo.name
}

const cancel = () => {
  selectedRepo.value = null
  projectName.value = ''
  branch.value = 'main'
  buildCommand.value = ''
  outputDir.value = ''
}

const addProject = () => {
  console.log('Adding project:', {
    repo: selectedRepo.value,
    name: projectName.value,
    branch: branch.value,
    buildCommand: buildCommand.value,
    outputDir: outputDir.value
  })
  // Will implement actual project creation later
  router.push('/')
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

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}
</style>
