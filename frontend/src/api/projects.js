import apiClient from './index'

export const projectsAPI = {
  // 获取所有项目
  getProjects() {
    return apiClient.get('/projects')
  },

  // 获取单个项目
  getProject(id) {
    return apiClient.get(`/projects/${id}`)
  },

  // 创建新项目
  createProject(data) {
    return apiClient.post('/projects', data)
  },

  // 更新项目
  updateProject(id, data) {
    return apiClient.put(`/projects/${id}`, data)
  },

  // 删除项目
  deleteProject(id) {
    return apiClient.delete(`/projects/${id}`)
  },

  // 启动项目
  startProject(id) {
    return apiClient.post(`/projects/${id}/start`)
  },

  // 停止项目
  stopProject(id) {
    return apiClient.post(`/projects/${id}/stop`)
  }
}

// 便捷的命名导出
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

export const getNextAvailablePort = async () => {
  const response = await apiClient.get('/projects/next-available-port')
  return response.port
}

export const createProject = async (data) => {
  const response = await apiClient.post('/projects', data)
  return response
}

export const deployProject = async (id, options = {}) => {
  const { reason = 'manual', triggeredBy = 'admin' } = options
  const response = await apiClient.post(`/projects/${id}/deploy`, { reason, triggeredBy })
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