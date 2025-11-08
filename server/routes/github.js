import express from 'express'
import axios from 'axios'
import crypto from 'crypto'
import { githubAccountsConfig } from '../utils/config.js'
import { authMiddleware } from '../utils/auth.js'

const router = express.Router()

// Get the base URL from environment or use default
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Create GitHub App using Manifest Flow
router.post('/create-app', authMiddleware, async (req, res) => {
  try {
    // Generate a unique code for this session
    const code = crypto.randomBytes(16).toString('hex')

    // Define the GitHub App manifest
    const manifest = {
      name: `SPages-${Date.now()}`,
      url: BASE_URL,
      hook_attributes: {
        active: false
      },
      redirect_url: `${BASE_URL}/api/github/manifest-callback`,
      callback_urls: [`${BASE_URL}/api/github/callback`],
      setup_url: `${BASE_URL}/api/github/callback`,
      public: false,
      default_permissions: {
        contents: 'read',
        metadata: 'read',
        emails: 'read'
      },
      default_events: []
    }

    // Store manifest with code temporarily (in production, use Redis or database)
    global.githubManifests = global.githubManifests || {}
    global.githubManifests[code] = manifest

    // GitHub manifest creation URL
    const manifestUrl = `https://github.com/settings/apps/new?state=${code}`

    res.json({ url: manifestUrl, code })
  } catch (error) {
    console.error('Error creating manifest:', error)
    res.status(500).json({ error: 'Failed to create manifest' })
  }
})

// Handle manifest callback from GitHub (GET request with code)
router.get('/manifest-callback', async (req, res) => {
  try {
    const { code } = req.query

    if (!code) {
      return res.redirect('/#/settings?error=no_code')
    }

    // Exchange code for App credentials
    const response = await axios.post(
      `https://api.github.com/app-manifests/${code}/conversions`,
      {},
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    const appData = response.data

    // Save the App credentials temporarily (associate with user session)
    const accounts = githubAccountsConfig.read()
    const appAccountId = `gh_app_${appData.id}`

    accounts[appAccountId] = {
      id: appAccountId,
      appId: appData.id,
      clientId: appData.client_id,
      clientSecret: appData.client_secret,
      webhookSecret: appData.webhook_secret,
      pem: appData.pem,
      slug: appData.slug,
      htmlUrl: appData.html_url,
      ownerLogin: appData.owner.login,
      ownerAvatar: appData.owner.avatar_url,
      createdAt: new Date().toISOString()
    }

    githubAccountsConfig.write(accounts)

    // Redirect user to install the newly created app
    const installUrl = `${appData.html_url}/installations/new`
    res.redirect(installUrl)
  } catch (error) {
    console.error('Manifest callback error:', error.response?.data || error.message)
    res.redirect('/#/settings?error=manifest_failed')
  }
})

// Initiate GitHub App creation flow
router.get('/create-app', authMiddleware, (req, res) => {
  try {
    const appName = `SPages-${Date.now()}`

    // Create manifest according to GitHub spec
    // Use example.com for webhook URL since localhost won't work
    const manifest = {
      name: appName,
      url: BASE_URL,
      hook_attributes: {
        url: "https://example.com/webhook",
        active: false
      },
      redirect_url: `${BASE_URL}/api/github/manifest-callback`,
      callback_urls: [`${BASE_URL}/api/github/callback`],
      setup_url: `${BASE_URL}/api/github/callback`,
      description: 'SPages - Self-hosted static site deployment platform',
      public: false,
      request_oauth_on_install: true,
      default_permissions: {
        contents: 'read',
        metadata: 'read'
      }
    }

    // Store manifest temporarily (in a real app, use Redis or database with expiry)
    global.pendingManifests = global.pendingManifests || {}
    const manifestId = Date.now().toString()
    global.pendingManifests[manifestId] = manifest

    // Return URL that frontend will open
    res.json({
      url: `${BASE_URL}/api/github/submit-manifest?id=${manifestId}`
    })
  } catch (error) {
    console.error('Error creating app:', error)
    res.status(500).json({ error: 'Failed to create app' })
  }
})

// Submit manifest to GitHub (this will be called in new tab)
router.get('/submit-manifest', (req, res) => {
  const { id } = req.query

  if (!id || !global.pendingManifests || !global.pendingManifests[id]) {
    return res.status(400).send('Invalid or expired manifest ID')
  }

  const manifest = global.pendingManifests[id]
  delete global.pendingManifests[id] // Clean up

  // Generate HTML form that auto-submits
  // According to GitHub docs example
  const state = crypto.randomBytes(16).toString('hex')
  const manifestJson = JSON.stringify(manifest)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Creating GitHub App...</title>
    </head>
    <body>
      <h2>Redirecting to GitHub...</h2>
      <p>Please wait while we create your GitHub App...</p>
      <form id="manifest-form" method="POST" action="https://github.com/settings/apps/new?state=${state}">
        <input type="text" name="manifest" id="manifest" style="display:none;">
      </form>
      <script>
        document.getElementById('manifest').value = ${JSON.stringify(manifestJson)};
        document.getElementById('manifest-form').submit();
      </script>
    </body>
    </html>
  `

  res.send(html)
})

// Keep the old endpoint for backward compatibility
router.get('/install-url', authMiddleware, (req, res) => {
  // Redirect to new endpoint
  res.redirect('/api/github/create-app')
})

// GitHub App installation callback
router.get('/callback', async (req, res) => {
  const { installation_id, setup_action } = req.query

  // User completed app installation
  if (setup_action === 'install' && installation_id) {
    try {
      // Find the app that was just installed
      const accounts = githubAccountsConfig.read()

      // Find app by checking if it matches the installation
      // Since we don't have OAuth yet, we'll mark this installation for later
      // The user needs to authorize the app to get their user info

      // Get all app accounts and find the most recent one (just created)
      const appAccounts = Object.values(accounts).filter(acc => acc.appId)
      const latestApp = appAccounts.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0]

      if (!latestApp) {
        return res.redirect('/#/settings?error=no_app')
      }

      // Now redirect to OAuth authorization to get user token
      const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${latestApp.clientId}&state=${installation_id}`
      return res.redirect(oauthUrl)
    } catch (error) {
      console.error('Installation callback error:', error)
      return res.redirect('/#/settings?error=install_failed')
    }
  }

  // OAuth callback with code
  const { code, state } = req.query

  if (!code) {
    return res.redirect('/#/settings?error=no_code')
  }

  try {
    // Find the app by installation_id (passed as state)
    const accounts = githubAccountsConfig.read()
    const appAccounts = Object.values(accounts).filter(acc => acc.appId)
    const latestApp = appAccounts.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    )[0]

    if (!latestApp) {
      return res.redirect('/#/settings?error=no_app')
    }

    // Exchange code for user access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: latestApp.clientId,
        client_secret: latestApp.clientSecret,
        code
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    )

    const accessToken = tokenResponse.data.access_token

    if (!accessToken) {
      return res.redirect('/#/settings?error=no_token')
    }

    // Get user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    const user = userResponse.data

    // Get primary email
    let primaryEmail = user.email
    try {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      const emails = emailsResponse.data
      const primary = emails.find(e => e.primary)
      if (primary) primaryEmail = primary.email
    } catch (e) {
      console.log('Could not fetch emails:', e.message)
    }

    // Update the app account with user info
    const userAccountId = `gh_${user.id}_${latestApp.appId}`
    accounts[userAccountId] = {
      id: userAccountId,
      githubId: user.id,
      username: user.login,
      email: primaryEmail,
      avatar: user.avatar_url,
      accessToken,
      appId: latestApp.appId,
      appSlug: latestApp.slug,
      installationId: state, // installation_id from state
      connectedAt: new Date().toISOString()
    }

    githubAccountsConfig.write(accounts)

    res.redirect('/#/settings?success=github_connected')
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message)
    res.redirect('/#/settings?error=auth_failed')
  }
})

// Get all connected GitHub accounts (filter out app configs, only return user accounts)
router.get('/accounts', authMiddleware, (req, res) => {
  try {
    const accounts = githubAccountsConfig.read()
    // Filter to only include user accounts (those with username), not app configs
    const accountList = Object.values(accounts)
      .filter(acc => acc.username) // Only user accounts have username
      .map(acc => ({
        id: acc.id,
        username: acc.username,
        email: acc.email,
        avatar: acc.avatar,
        connectedAt: acc.connectedAt
      }))

    res.json(accountList)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    res.status(500).json({ error: 'Failed to fetch accounts' })
  }
})

// Refresh account info
router.post('/accounts/:id/refresh', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const accounts = githubAccountsConfig.read()
    const account = accounts[id]

    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    // Get updated user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: 'application/vnd.github+json'
      }
    })

    const user = userResponse.data

    // Get user emails
    const emailsResponse = await axios.get('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: 'application/vnd.github+json'
      }
    })

    const primaryEmail = emailsResponse.data.find(e => e.primary)?.email || user.email

    // Update account
    accounts[id] = {
      ...account,
      username: user.login,
      email: primaryEmail,
      avatar: user.avatar_url
    }

    githubAccountsConfig.write(accounts)

    res.json({
      id: accounts[id].id,
      username: accounts[id].username,
      email: accounts[id].email,
      avatar: accounts[id].avatar,
      connectedAt: accounts[id].connectedAt
    })
  } catch (error) {
    console.error('Error refreshing account:', error)
    res.status(500).json({ error: 'Failed to refresh account' })
  }
})

// Remove account
router.delete('/accounts/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const accounts = githubAccountsConfig.read()

    if (!accounts[id]) {
      return res.status(404).json({ error: 'Account not found' })
    }

    delete accounts[id]
    githubAccountsConfig.write(accounts)

    res.json({ success: true })
  } catch (error) {
    console.error('Error removing account:', error)
    res.status(500).json({ error: 'Failed to remove account' })
  }
})

// Get repositories for an account
router.get('/accounts/:id/repositories', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const accounts = githubAccountsConfig.read()
    const account = accounts[id]

    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: 'application/vnd.github+json'
      },
      params: {
        sort: 'updated',
        per_page: 100
      }
    })

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
      defaultBranch: repo.default_branch
    }))

    res.json(repos)
  } catch (error) {
    console.error('Error fetching repositories:', error)
    res.status(500).json({ error: 'Failed to fetch repositories' })
  }
})

// Get branches for a repository
router.get('/accounts/:id/repositories/:owner/:repo/branches', authMiddleware, async (req, res) => {
  try {
    const { id, owner, repo } = req.params
    const accounts = githubAccountsConfig.read()
    const account = accounts[id]

    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: 'application/vnd.github+json'
      }
    })

    const branches = response.data.map(branch => branch.name)
    res.json(branches)
  } catch (error) {
    console.error('Error fetching branches:', error)
    res.status(500).json({ error: 'Failed to fetch branches' })
  }
})

export default router
