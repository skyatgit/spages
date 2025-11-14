import apiClient from './index'

export const deployAPI = {
  // 触发部署
  deploy(projectId) {
    return apiClient.post(`/deploy/${projectId}`)
  },

  // 获取部署日志（实时）
  getDeploymentLogs(projectId, deploymentId) {
    return apiClient.get(`/deploy/${projectId}/logs/${deploymentId}`)
  },

  // 获取部署历史
  getDeploymentHistory(projectId) {
    return apiClient.get(`/deploy/${projectId}/history`)
  },

  // 停止部署
  stopDeployment(projectId, deploymentId) {
    return apiClient.post(`/deploy/${projectId}/stop/${deploymentId}`)
  }
}
