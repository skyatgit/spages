import apiClient from './index'

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
export const removeGithubAccount = async (accountId) => {
  return apiClient.delete(`/github/accounts/${accountId}`)
}

// Get repositories for an account
export const getGithubRepositories = async (accountId) => {
  return apiClient.get(`/github/accounts/${accountId}/repositories`)
}

// Get branches for a repository
export const getGithubBranches = async (accountId, owner, repo) => {
  return apiClient.get(`/github/accounts/${accountId}/repositories/${owner}/${repo}/branches`)
}
