import apiClient from './index.js'

/**
 * 登录
 */
export async function login(username, password) {
  return apiClient.post('/auth/login', { username, password })
}

/**
 * 修改密码
 */
export async function changePassword(currentPassword, newPassword) {
  return apiClient.post('/auth/change-password', { currentPassword, newPassword })
}

/**
 * 验证token
 */
export async function verifyToken() {
  return apiClient.get('/auth/verify')
}
