// Authentication utilities

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
  window.location.href = '/login'
}
