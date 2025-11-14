import apiClient from './index'

// 获取共享 GitHub App 配置状态
export const getGithubAppConfig = async () => {
  return apiClient.get('/github/app-config')
}

// 删除共享 GitHub App 配置
export const deleteGithubAppConfig = async () => {
  return apiClient.delete('/github/app-config')
}

// 获取 GitHub App 安装 URL
export const getGithubInstallUrl = async () => {
  return apiClient.get('/github/create-app')
}

// 获取所有已连接的 GitHub 账户
export const getGithubAccounts = async () => {
  return apiClient.get('/github/accounts')
}

// 刷新账户信息
export const refreshGithubAccount = async (accountId) => {
  return apiClient.post(`/github/accounts/${accountId}/refresh`)
}

// 移除 GitHub 账户
export const removeGithubAccount = async (accountId, deleteFromGitHub = false) => {
  const params = deleteFromGitHub ? '?deleteFromGitHub=true' : ''
  return apiClient.delete(`/github/accounts/${accountId}${params}`)
}

// 移除整个用户（所有应用）
export const removeGithubUser = async (githubId) => {
  return apiClient.delete(`/github/users/${githubId}`)
}

// 获取账户的仓库
export const getGithubRepositories = async (accountId) => {
  return apiClient.get(`/github/accounts/${accountId}/repositories`)
}

// 获取仓库的分支
export const getGithubBranches = async (accountId, owner, repo) => {
  return apiClient.get(`/github/accounts/${accountId}/repositories/${owner}/${repo}/branches`)
}
