import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  config => {
    // Add auth token if exists
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // 获取请求的 URL
      const requestUrl = error.config?.url || ''

      // 如果是凭据更新相关的 API，不自动退出登录
      // 让组件自己处理错误（显示错误提示）
      const isCredentialUpdate = requestUrl.includes('/auth/update-credentials') ||
                                  requestUrl.includes('/auth/change-password') ||
                                  requestUrl.includes('/auth/change-username')

      if (!isCredentialUpdate) {
        // 其他 401 错误（如 token 过期），清除认证并跳转到登录页
        localStorage.removeItem('auth_token')
        localStorage.removeItem('is_authenticated')
        window.location.href = '/login'
      }

      // 凭据更新的 401 错误会被组件的 catch 块捕获并处理
    }
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export default apiClient
