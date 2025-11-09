import apiClient from './index'

/**
 * 获取系统信息
 */
export const getSystemInfo = async () => {
  const response = await apiClient.get('/system/info')
  return response.data
}
