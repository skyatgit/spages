import apiClient from './index'

export const projectsAPI = {
  // Get all projects
  getProjects() {
    return apiClient.get('/projects')
  },

  // Get single project
  getProject(id) {
    return apiClient.get(`/projects/${id}`)
  },

  // Create new project
  createProject(data) {
    return apiClient.post('/projects', data)
  },

  // Update project
  updateProject(id, data) {
    return apiClient.put(`/projects/${id}`, data)
  },

  // Delete project
  deleteProject(id) {
    return apiClient.delete(`/projects/${id}`)
  }
}

// Named exports for convenience
export const checkProjectName = async (name) => {
  console.log('API: Checking project name:', name)
  const response = await apiClient.get(`/projects/check-name/${encodeURIComponent(name)}`)
  console.log('API: Response:', response)
  return response
}

export const checkPort = async (port) => {
  console.log('API: Checking port:', port)
  const response = await apiClient.get(`/projects/check-port/${port}`)
  console.log('API: Response:', response)
  return response
}

export const createProject = async (data) => {
  const response = await apiClient.post('/projects', data)
  return response
}

export const deployProject = async (id) => {
  const response = await apiClient.post(`/projects/${id}/deploy`)
  return response
}

export const stopProject = async (id) => {
  const response = await apiClient.post(`/projects/${id}/stop`)
  return response
}

export const getProjectLogs = async (id, deploymentId = null) => {
  const url = deploymentId
    ? `/projects/${id}/logs?deploymentId=${deploymentId}`
    : `/projects/${id}/logs`
  const response = await apiClient.get(url)
  return response
}

export const getDeploymentHistory = async (id) => {
  const response = await apiClient.get(`/projects/${id}/deployments`)
  return response
}

export const getEnvVars = async (id) => {
  const response = await apiClient.get(`/projects/${id}/env`)
  return response
}

export const updateEnvVars = async (id, env) => {
  const response = await apiClient.put(`/projects/${id}/env`, { env })
  return response
}
