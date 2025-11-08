import apiClient from './index'

export const githubAPI = {
  // Get GitHub OAuth URL
  getAuthUrl() {
    return apiClient.get('/github/auth-url')
  },

  // Exchange code for token
  exchangeToken(code) {
    return apiClient.post('/github/token', { code })
  },

  // Get user repositories
  getRepositories() {
    return apiClient.get('/github/repositories')
  },

  // Get repository details
  getRepository(owner, repo) {
    return apiClient.get(`/github/repositories/${owner}/${repo}`)
  }
}
