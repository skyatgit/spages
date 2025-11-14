// 认证工具

export function isAuthenticated() {
  return localStorage.getItem('is_authenticated') === 'true'
}

export function getAuthToken() {
  return localStorage.getItem('auth_token')
}

export function setAuthToken(token) {
  localStorage.setItem('auth_token', token)
  localStorage.setItem('is_authenticated', 'true')
}

export function clearAuth() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('is_authenticated')
}

export function logout() {
  clearAuth()
  // 使用路由导航，而不是直接刷新页面
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}
