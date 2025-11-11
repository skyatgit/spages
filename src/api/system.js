import apiClient from './index'

/**
 * 获取系统信息
 */
export const getSystemInfo = async () => {
  const response = await apiClient.get('/system/info')
  return response.data
}

/**
 * 获取存储信息
 */
export const getStorageInfo = async () => {
  const response = await apiClient.get('/system/storage')
  return response.data
}

/**
 * 清空构建缓存
 */
export const clearCache = async () => {
  const response = await apiClient.post('/system/clear-cache')
  return response.data
}

/**
 * 清空依赖包 (node_modules)
 */
export const clearDependencies = async () => {
  const response = await apiClient.post('/system/clear-dependencies')
  return response.data
}

/**
 * 清空日志
 */
export const clearLogs = async () => {
  const response = await apiClient.post('/system/clear-logs')
  return response.data
}

/**
 * 获取网络接口列表
 */
export const getNetworkInterfaces = async () => {
  // apiClient 的拦截器已经返回了 response.data
  return await apiClient.get('/system/network-interfaces')
}

