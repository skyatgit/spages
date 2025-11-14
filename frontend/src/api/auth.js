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
 * 修改用户名
 */
export async function changeUsername(currentPassword, newUsername) {
  return apiClient.post('/auth/change-username', { currentPassword, newUsername })
}

/**
 * 统一的凭据更新接口
 * 可以修改用户名、密码或两者
 */
export async function updateCredentials(currentPassword, newUsername, newPassword) {
  return apiClient.post('/auth/update-credentials', {
    currentPassword,
    newUsername: newUsername || undefined,
    newPassword: newPassword || undefined
  })
}

/**
 * 验证token
 */
export async function verifyToken() {
  return apiClient.get('/auth/verify')
}
