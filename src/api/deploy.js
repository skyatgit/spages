import apiClient from './index'

export const deployAPI = {
  // Trigger deployment
  deploy(projectId) {
    return apiClient.post(`/deploy/${projectId}`)
  },

  // Get deployment logs (real-time)
  getDeploymentLogs(projectId, deploymentId) {
    return apiClient.get(`/deploy/${projectId}/logs/${deploymentId}`)
  },

  // Get deployment history
  getDeploymentHistory(projectId) {
    return apiClient.get(`/deploy/${projectId}/history`)
  },

  // Stop deployment
  stopDeployment(projectId, deploymentId) {
    return apiClient.post(`/deploy/${projectId}/stop/${deploymentId}`)
  }
}
