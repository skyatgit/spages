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
