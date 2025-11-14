import apiClient from './index'

/**
 * 获取系统信息
 */
export const getSystemInfo = async () => {
  const response = await apiClient.get('/system/info')
  return response.data
}

/**
 * 获取网络接口列表
 */
export const getNetworkInterfaces = async () => {
  // apiClient 的拦截器已经返回了 response.data
  return await apiClient.get('/system/network-interfaces')
}
