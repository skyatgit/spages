import apiClient from './index'

// Get shared GitHub App configuration status
export const getGithubAppConfig = async () => {
  return apiClient.get('/github/app-config')
}

// Setup shared GitHub App (one-time)
export const setupGithubApp = async () => {
  return apiClient.post('/github/setup-app')
}

// Get GitHub App creation URL
export const getGithubInstallUrl = async () => {
  return apiClient.get('/github/create-app')
}

// Get all connected GitHub accounts
export const getGithubAccounts = async () => {
  return apiClient.get('/github/accounts')
}

// Refresh account information
export const refreshGithubAccount = async (accountId) => {
  return apiClient.post(`/github/accounts/${accountId}/refresh`)
}

// Remove GitHub account
export const removeGithubAccount = async (accountId, deleteFromGitHub = false) => {
  const params = deleteFromGitHub ? '?deleteFromGitHub=true' : ''
  return apiClient.delete(`/github/accounts/${accountId}${params}`)
}

// Remove entire user (all apps)
export const removeGithubUser = async (githubId) => {
  return apiClient.delete(`/github/users/${githubId}`)
}

// Get repositories for an account
export const getGithubRepositories = async (accountId) => {
  return apiClient.get(`/github/accounts/${accountId}/repositories`)
}

// Get branches for a repository
export const getGithubBranches = async (accountId, owner, repo) => {
  return apiClient.get(`/github/accounts/${accountId}/repositories/${owner}/${repo}/branches`)
}
