import express from 'express'
import axios from 'axios'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { githubAccountsConfig, githubAppConfig } from '../utils/config.js'
import { authMiddleware } from '../utils/auth.js'

const router = express.Router()

// Helper function to generate unique 8-character identifier
// Uses Base62 encoding (0-9, a-z, A-Z) for better entropy
// Combines timestamp and random data to ensure uniqueness
const generateUniqueId = () => {
  const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

  // Get current timestamp in milliseconds
  const timestamp = Date.now()

  // Generate random bytes for additional entropy
  const randomBytes = crypto.randomBytes(4)

  // Combine timestamp (6 bytes) and random (4 bytes) = 10 bytes total
  const buffer = Buffer.allocUnsafe(10)
  buffer.writeBigUInt64BE(BigInt(timestamp), 0) // Write timestamp (first 8 bytes, we'll use last 6)
  randomBytes.copy(buffer, 6) // Copy 4 random bytes

  // Convert to a large number and then to base62
  // We'll use the last 8 bytes for conversion
  const num = buffer.readBigUInt64BE(2) // Read 8 bytes starting from position 2

  // Convert to base62 (8 characters)
  let result = ''
  let remaining = num

  for (let i = 0; i < 8; i++) {
    const index = Number(remaining % 62n)
    result = base62Chars[index] + result
    remaining = remaining / 62n
  }

  return result
}

// Helper function to generate installation access token
const getInstallationAccessToken = async (installationId) => {
  const appConfig = githubAppConfig.read()

  if (!appConfig.configured || !appConfig.pem || !appConfig.appId) {
    throw new Error('GitHub App not configured')
  }

  // Generate JWT for the app
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iat: now - 60,
    exp: now + (10 * 60),
    iss: appConfig.appId
  }
  const appToken = jwt.sign(payload, appConfig.pem, { algorithm: 'RS256' })

  // Get installation access token
  const response = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${appToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )

  return response.data.token
}

// Get base URL dynamically from request (for proxy support)
const getBaseUrl = (req) => {
  // 如果设置了环境变量，使用环境变量
  if (process.env.BASE_URL) {
    return process.env.BASE_URL
  }

  // 尝试从 Referer 头获取前端地址
  const referer = req.get('referer') || req.get('origin')
  if (referer) {
    try {
      const url = new URL(referer)
      return `${url.protocol}//${url.host}`
    } catch (e) {
      // Referer 解析失败，继续使用默认值
    }
  }

  // 尝试从 Host 头获取（如果是通过代理访问）
  const host = req.get('x-forwarded-host') || req.get('host')
  const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http')

  if (host && host !== 'localhost:3000') {
    // 如果 host 是前端地址（5173端口），直接使用
    if (host.includes(':5173')) {
      return `${protocol}://${host}`
    }
    // 如果是其他端口，可能是通过代理访问，尝试返回前端地址
    const hostWithoutPort = host.split(':')[0]
    return `${protocol}://${hostWithoutPort}:5173`
  }

  // 默认返回 localhost
  return 'http://localhost:5173'
}

// Get shared GitHub App configuration status
router.get('/app-config', authMiddleware, (req, res) => {
  try {
    const appConfig = githubAppConfig.read()

    if (appConfig.configured && appConfig.appId) {
      // Return app info without sensitive data
      res.json({
        configured: true,
        appId: appConfig.appId,
        slug: appConfig.slug,
        htmlUrl: appConfig.htmlUrl,
        createdAt: appConfig.createdAt
      })
    } else {
      res.json({
        configured: false
      })
    }
  } catch (error) {
    console.error('Error getting app config:', error)
    res.status(500).json({ error: 'Failed to get app config' })
  }
})

// Delete shared GitHub App configuration
router.delete('/app-config', authMiddleware, async (req, res) => {
  try {
    const appConfig = githubAppConfig.read()

    if (!appConfig.configured) {
      return res.status(404).json({ error: 'No GitHub App configured' })
    }

    const results = {
      localDeleted: false,
      installationsDeleted: 0,
      errors: []
    }

    // 删除所有关联的 installations
    try {
      const accounts = githubAccountsConfig.read()
      const toDelete = []

      // 找出所有与此 App 关联的 installations
      Object.entries(accounts).forEach(([key, account]) => {
        if (account.appId === appConfig.appId) {
          toDelete.push({ key, account })
        }
      })

      // 尝试从 GitHub 删除每个 installation
      for (const { key, account } of toDelete) {
        if (account.installationId && appConfig.pem) {
          try {
            const now = Math.floor(Date.now() / 1000)
            const payload = {
              iat: now - 60,
              exp: now + (10 * 60),
              iss: appConfig.appId
            }
            const appToken = jwt.sign(payload, appConfig.pem, { algorithm: 'RS256' })

            await axios.delete(
              `https://api.github.com/app/installations/${account.installationId}`,
              {
                headers: {
                  Authorization: `Bearer ${appToken}`,
                  Accept: 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28'
                }
              }
            )
            console.log(`Deleted installation ${account.installationId} from GitHub`)
          } catch (error) {
            console.error(`Failed to delete installation ${account.installationId}:`, error.response?.data || error.message)
            results.errors.push(`Installation ${account.installationId}: ${error.response?.data?.message || error.message}`)
          }
        }

        // 删除本地记录
        delete accounts[key]
        results.installationsDeleted++
      }

      githubAccountsConfig.write(accounts)
    } catch (error) {
      console.error('Error deleting installations:', error)
      results.errors.push(`Installations cleanup failed: ${error.message}`)
    }

    // 删除 App 配置
    githubAppConfig.write({
      configured: false
    })
    results.localDeleted = true

    console.log(`Deleted GitHub App: ${appConfig.slug} (ID: ${appConfig.appId})`)
    console.log(`Deleted ${results.installationsDeleted} installations`)

    // 生成快捷删除链接
    const appDeleteUrl = `https://github.com/settings/apps/${appConfig.slug}/advanced`

    res.json({
      success: true,
      message: 'GitHub App deleted successfully',
      results,
      appDeleteUrl,
      note: 'You need to manually delete the app from GitHub'
    })
  } catch (error) {
    console.error('Error deleting app config:', error)
    res.status(500).json({ error: 'Failed to delete app config' })
  }
})

// Create shared GitHub App - GET version (for direct navigation)
// Note: No authMiddleware here since it's accessed via browser redirect
router.get('/setup-app', async (req, res) => {
  try {
    const appConfig = githubAppConfig.read()

    // Check if already configured
    if (appConfig.configured) {
      const baseUrl = req.query.baseUrl || getBaseUrl(req)
      return res.redirect(`${baseUrl}#/settings?error=app_already_configured`)
    }

    // Get base URL from query parameter (passed from frontend)
    let baseUrl = req.query.baseUrl || getBaseUrl(req)

    // Ensure baseUrl is valid
    if (!baseUrl || baseUrl === 'undefined' || baseUrl === 'null') {
      baseUrl = 'http://localhost:5173' // Fallback to default
    }

    console.log('[GitHub App Setup GET] Query baseUrl:', req.query.baseUrl)
    console.log('[GitHub App Setup GET] Fallback baseUrl:', getBaseUrl(req))
    console.log('[GitHub App Setup GET] Final Base URL:', baseUrl)
    console.log('[GitHub App Setup GET] Base URL type:', typeof baseUrl)
    console.log('[GitHub App Setup GET] Base URL length:', baseUrl ? baseUrl.length : 0)
    console.log('[GitHub App Setup GET] Request headers:', {
      host: req.get('host'),
      'x-forwarded-host': req.get('x-forwarded-host'),
      'x-forwarded-proto': req.get('x-forwarded-proto'),
      protocol: req.protocol
    })

    // Validate baseUrl before creating manifest
    if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
      console.error('[GitHub App Setup GET] Invalid baseUrl, using default')
      baseUrl = 'http://localhost:5173'
    }

    // Define the shared GitHub App manifest
    // Note: No webhook URL - will be configured later on public server
    // Generate unique 8-character identifier
    const uniqueId = generateUniqueId()
    const appName = `SPages-${uniqueId}`

    console.log('[GitHub App Setup GET] Generated App Name:', appName)

    const manifest = {
      name: appName,
      url: baseUrl,
      redirect_url: `${baseUrl}/api/github/setup-callback`,
      callback_urls: [`${baseUrl}/api/github/callback`],
      setup_url: `${baseUrl}/api/github/callback`,
      public: false,
      default_permissions: {
        contents: 'read',
        metadata: 'read',
        emails: 'read'
      },
      default_events: []
    }

    console.log('[GitHub App Setup GET] Manifest:', JSON.stringify(manifest, null, 2))
    console.log('[GitHub App Setup GET] Manifest URL field:', manifest.url)
    console.log('[GitHub App Setup GET] Note: Webhook not configured - configure later on public server')

    // Store manifest temporarily (same pattern as create-app)
    global.pendingSetupManifest = global.pendingSetupManifest || {}
    const manifestId = Date.now().toString()
    global.pendingSetupManifest[manifestId] = manifest

    // Redirect to submit page (same pattern as before)
    res.redirect(`/api/github/submit-setup-manifest?id=${manifestId}`)
  } catch (error) {
    console.error('Error creating app setup:', error)
    const baseUrl = getBaseUrl(req)
    res.redirect(`${baseUrl}#/settings?error=setup_failed`)
  }
})

// Create shared GitHub App - POST version (for API calls)
router.post('/setup-app', authMiddleware, async (req, res) => {
  try {
    const appConfig = githubAppConfig.read()

    // Check if already configured
    if (appConfig.configured) {
      return res.status(400).json({
        error: 'GitHub App already configured',
        appId: appConfig.appId
      })
    }

    const baseUrl = getBaseUrl(req)
    console.log('[GitHub App Setup POST] Base URL:', baseUrl)
    console.log('[GitHub App Setup POST] Request headers:', {
      host: req.get('host'),
      'x-forwarded-host': req.get('x-forwarded-host'),
      'x-forwarded-proto': req.get('x-forwarded-proto'),
      protocol: req.protocol
    })

    // Define the shared GitHub App manifest
    // Note: No webhook URL - will be configured later on public server
    // Generate unique 8-character identifier
    const uniqueId = generateUniqueId()
    const appName = `SPages-${uniqueId}`

    console.log('[GitHub App Setup POST] Generated App Name:', appName)

    const manifest = {
      name: appName,
      url: baseUrl,
      redirect_url: `${baseUrl}/api/github/setup-callback`,
      callback_urls: [`${baseUrl}/api/github/callback`],
      setup_url: `${baseUrl}/api/github/callback`,
      public: false,
      default_permissions: {
        contents: 'read',
        metadata: 'read',
        emails: 'read'
      },
      default_events: []
    }

    console.log('[GitHub App Setup POST] Manifest:', JSON.stringify(manifest, null, 2))
    console.log('[GitHub App Setup POST] Note: Webhook not configured - configure later on public server')

    // Generate a state for this setup
    const state = crypto.randomBytes(16).toString('hex')
    const manifestJson = JSON.stringify(manifest)

    // Return HTML that auto-submits the manifest to GitHub
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Creating GitHub App...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
          }
          h2 {
            color: #2c3e50;
            margin-bottom: 20px;
          }
          p {
            color: #7f8c8d;
            margin-bottom: 30px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🚀 Creating GitHub App...</h2>
          <p>Please wait while we set up your GitHub App...</p>
          <div class="spinner"></div>
        </div>
        <form id="manifest-form" method="POST" action="https://github.com/settings/apps/new?state=${state}">
          <input type="hidden" name="manifest" id="manifest" value="">
        </form>
        <script>
          document.getElementById('manifest').value = ${JSON.stringify(manifestJson)};
          setTimeout(() => {
            document.getElementById('manifest-form').submit();
          }, 1000);
        </script>
      </body>
      </html>
    `

    res.send(html)
  } catch (error) {
    console.error('Error creating app setup:', error)
    res.status(500).json({ error: 'Failed to create app setup' })
  }
})

// Handle setup callback (save shared App config)
router.get('/setup-callback', async (req, res) => {
  try {
    const { code } = req.query

    console.log('[Setup Callback] Received code:', code)
    console.log('[Setup Callback] Full query:', req.query)

    if (!code) {
      // 无法从请求获取 baseUrl，使用默认值
      const baseUrl = getBaseUrl(req)
      console.error('[Setup Callback] No code provided, redirecting with error')
      return res.redirect(`${baseUrl}/settings?error=no_code`)
    }

    console.log('[Setup Callback] Exchanging code for App credentials...')

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

    console.log('[Setup Callback] App created successfully!')
    console.log('[Setup Callback] App ID:', appData.id)
    console.log('[Setup Callback] App Slug:', appData.slug)
    console.log('[Setup Callback] App external_url:', appData.external_url)

    // Extract baseUrl from the callback_url that GitHub stored
    // callback_url format: http://192.168.2.14:5173/api/github/callback
    let baseUrl = getBaseUrl(req) // fallback
    if (appData.external_url) {
      // external_url 就是我们创建时提交的 url
      baseUrl = appData.external_url
    }

    console.log('[Setup Callback] Using baseUrl:', baseUrl)

    // Save as the shared App configuration
    const appConfig = {
      configured: true,
      appId: appData.id,
      clientId: appData.client_id,
      clientSecret: appData.client_secret,
      webhookSecret: appData.webhook_secret,
      pem: appData.pem,
      slug: appData.slug,
      htmlUrl: appData.html_url,
      baseUrl: baseUrl, // 保存 baseUrl 供后续使用
      createdAt: new Date().toISOString()
    }

    console.log('[Setup Callback] Saving app config...')
    githubAppConfig.write(appConfig)
    console.log('[Setup Callback] App config saved successfully!')

    console.log(`Shared GitHub App created: ${appData.slug}`)
    console.log(`Base URL saved: ${baseUrl}`)

    // Redirect to settings with success
    console.log('[Setup Callback] Redirecting to:', `${baseUrl}/settings?success=app_configured`)
    res.redirect(`${baseUrl}/settings?success=app_configured`)
  } catch (error) {
    console.error('Setup callback error:', error.response?.data || error.message)
    const baseUrl = getBaseUrl(req)
    res.redirect(`${baseUrl}/settings?error=setup_failed`)
  }
})

// Create GitHub App using Manifest Flow (deprecated - use setup-app instead)
router.post('/create-app', authMiddleware, async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req)

    // Generate a unique code for this session
    const code = crypto.randomBytes(16).toString('hex')

    // Define the GitHub App manifest
    // Note: No webhook URL - will be configured later on public server
    // Generate unique 8-character identifier
    const uniqueId = generateUniqueId()
    const appName = `SPages-${uniqueId}`

    const manifest = {
      name: appName,
      url: baseUrl,
      redirect_url: `${baseUrl}/api/github/manifest-callback`,
      callback_urls: [`${baseUrl}/api/github/callback`],
      setup_url: `${baseUrl}/api/github/callback`,
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
    const baseUrl = getBaseUrl(req)

    if (!code) {
      return res.redirect(`${baseUrl}/settings?error=no_code`)
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
    const baseUrl = getBaseUrl(req)
    res.redirect(`${baseUrl}/settings?error=manifest_failed`)
  }
})

// Initiate GitHub App creation flow (deprecated - use setup-app instead)
// Now used to install the shared App
router.get('/create-app', authMiddleware, (req, res) => {
  try {
    // Check if shared App is configured
    const appConfig = githubAppConfig.read()

    if (!appConfig.configured || !appConfig.appId) {
      return res.status(400).json({
        error: 'GitHub App not configured',
        message: 'Please configure GitHub App in system settings first'
      })
    }

    // Return installation URL for the shared App
    res.json({
      url: `${appConfig.htmlUrl}/installations/new`
    })
  } catch (error) {
    console.error('Error getting app:', error)
    res.status(500).json({ error: 'Failed to get app' })
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
  const state = crypto.randomBytes(16).toString('hex')
  const manifestJson = JSON.stringify(manifest)

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Creating GitHub App...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          text-align: center;
        }
        h2 {
          color: #2c3e50;
          margin-bottom: 20px;
        }
        p {
          color: #7f8c8d;
          margin-bottom: 30px;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🚀 Creating GitHub App...</h2>
        <p>Please wait while we create your GitHub App...</p>
        <div class="spinner"></div>
      </div>
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

// Submit setup manifest to GitHub (for shared App setup)
router.get('/submit-setup-manifest', (req, res) => {
  const { id } = req.query

  console.log('[Submit Setup Manifest] Request ID:', id)

  if (!id || !global.pendingSetupManifest || !global.pendingSetupManifest[id]) {
    console.error('[Submit Setup Manifest] Invalid or expired manifest ID')
    return res.status(400).send('Invalid or expired manifest ID')
  }

  const manifest = global.pendingSetupManifest[id]
  delete global.pendingSetupManifest[id] // Clean up

  console.log('[Submit Setup Manifest] Manifest:', JSON.stringify(manifest, null, 2))

  // Validate manifest has required fields
  if (!manifest.url || typeof manifest.url !== 'string' || manifest.url.trim() === '') {
    console.error('[Submit Setup Manifest] Invalid manifest.url:', manifest.url)
    return res.status(400).send('Invalid manifest: url field is missing or empty')
  }

  // Generate HTML form that auto-submits
  const state = crypto.randomBytes(16).toString('hex')
  const manifestJson = JSON.stringify(manifest)

  console.log('[Submit Setup Manifest] State:', state)
  console.log('[Submit Setup Manifest] Manifest JSON length:', manifestJson.length)
  console.log('[Submit Setup Manifest] Manifest.url:', manifest.url)
  console.log('[Submit Setup Manifest] Submitting to GitHub...')

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Creating GitHub App...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          text-align: center;
        }
        h2 {
          color: #2c3e50;
          margin-bottom: 20px;
        }
        p {
          color: #7f8c8d;
          margin-bottom: 30px;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🚀 Setting up GitHub App...</h2>
        <p>Please wait while we create your shared GitHub App...</p>
        <div class="spinner"></div>
      </div>
      <form id="manifest-form" method="POST" action="https://github.com/settings/apps/new?state=${state}">
        <input type="text" name="manifest" id="manifest" style="display:none;">
      </form>
      <script>
        // manifestJson is already a JSON string, don't stringify again
        document.getElementById('manifest').value = ${JSON.stringify(manifestJson)};
        console.log('Manifest length:', document.getElementById('manifest').value.length);
        console.log('Manifest preview:', document.getElementById('manifest').value.substring(0, 200));
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
  console.log('[Callback] Received request')
  console.log('[Callback] Query params:', req.query)

  const { installation_id, setup_action } = req.query

  // Get the shared App config first to get baseUrl
  const appConfig = githubAppConfig.read()
  const baseUrl = appConfig.baseUrl || getBaseUrl(req)

  console.log('[Callback] App configured:', appConfig.configured)
  console.log('[Callback] Using baseUrl:', baseUrl)

  // User completed app installation
  if (setup_action === 'install' && installation_id) {
    console.log('[Callback] Processing app installation, installation_id:', installation_id)

    try {
      if (!appConfig.configured) {
        console.error('[Callback] App not configured!')
        return res.redirect(`${baseUrl}/settings?error=no_app`)
      }

      console.log('[Callback] Redirecting to OAuth authorization...')
      // Now redirect to OAuth authorization to get user token
      const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${appConfig.clientId}&state=${installation_id}`
      console.log('[Callback] OAuth URL:', oauthUrl)
      return res.redirect(oauthUrl)
    } catch (error) {
      console.error('Installation callback error:', error)
      return res.redirect(`${baseUrl}/settings?error=install_failed`)
    }
  }

  // OAuth callback with code
  const { code, state } = req.query

  console.log('[Callback] OAuth callback, code:', code ? 'present' : 'missing')
  console.log('[Callback] State (installation_id):', state)

  if (!code) {
    console.error('[Callback] No code provided!')
    return res.redirect(`${baseUrl}/settings?error=no_code`)
  }

  try {

    if (!appConfig.configured) {
      console.error('[Callback] App not configured!')
      return res.redirect(`${baseUrl}/settings?error=no_app`)
    }

    console.log('[Callback] Exchanging code for access token...')

    // Exchange code for user access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: appConfig.clientId,
        client_secret: appConfig.clientSecret,
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
      return res.redirect(`${baseUrl}/settings?error=no_token`)
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

    // Save installation record (not in app config, but in accounts)
    const accounts = githubAccountsConfig.read()
    const installationId = `installation_${user.id}`

    accounts[installationId] = {
      id: installationId,
      appId: appConfig.appId,
      appSlug: appConfig.slug,
      githubId: user.id,
      username: user.login,
      email: primaryEmail,
      avatar: user.avatar_url,
      accessToken,
      installationId: state, // installation_id from state
      connectedAt: new Date().toISOString()
    }

    githubAccountsConfig.write(accounts)

    console.log(`User ${user.login} connected to shared App`)
    console.log('[OAuth Callback] Base URL:', baseUrl)
    console.log('[OAuth Callback] Redirect URL:', `${baseUrl}/settings?success=github_connected`)

    res.redirect(`${baseUrl}/settings?success=github_connected`)
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message)
    res.redirect(`${baseUrl}/settings?error=auth_failed`)
  }
})

// Get all connected GitHub accounts
router.get('/accounts', authMiddleware, (req, res) => {
  try {
    const accounts = githubAccountsConfig.read()

    const installations = []

    // Iterate through all installation records
    Object.values(accounts).forEach(account => {
      if (account.username && account.installationId) {
        // This is an installation record
        installations.push({
          id: account.id,
          appId: account.appId,
          appSlug: account.appSlug,
          githubId: account.githubId,
          username: account.username,
          email: account.email,
          avatar: account.avatar,
          accessToken: account.accessToken,
          installationId: account.installationId,
          connectedAt: account.connectedAt
        })
      }
    })

    // Sort by connected time
    installations.sort((a, b) => new Date(b.connectedAt) - new Date(a.connectedAt))

    res.json({
      authorized: installations,
      unauthorized: [] // No more orphaned apps
    })
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

// Remove account (delete installation)
router.delete('/accounts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { deleteFromGitHub } = req.query
    const accounts = githubAccountsConfig.read()

    if (!accounts[id]) {
      return res.status(404).json({ error: 'Account not found' })
    }

    const account = accounts[id]
    const results = {
      localDeleted: false,
      installationDeleted: false,
      appDeleteUrl: null,
      errors: []
    }

    // If requested, delete from GitHub
    if (deleteFromGitHub === 'true' && account.installationId) {
      // Get shared App config for JWT generation
      const appConfig = githubAppConfig.read()

      if (appConfig.configured && appConfig.pem) {
        try {
          const now = Math.floor(Date.now() / 1000)
          const payload = {
            iat: now - 60,
            exp: now + (10 * 60),
            iss: appConfig.appId
          }
          const appToken = jwt.sign(payload, appConfig.pem, { algorithm: 'RS256' })

          // Delete the installation
          await axios.delete(
            `https://api.github.com/app/installations/${account.installationId}`,
            {
              headers: {
                Authorization: `Bearer ${appToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
              }
            }
          )
          results.installationDeleted = true
          console.log(`Deleted installation ${account.installationId} from GitHub`)
        } catch (error) {
          console.error('Failed to delete installation:', error.response?.data || error.message)
          results.errors.push(`Installation deletion failed: ${error.response?.data?.message || error.message}`)
        }
      }
    }

    // Delete local installation record
    delete accounts[id]
    githubAccountsConfig.write(accounts)
    results.localDeleted = true

    console.log(`Deleted installation for user: ${account.username}`)

    res.json({
      success: true,
      message: 'Installation deleted',
      results
    })
  } catch (error) {
    console.error('Error removing account:', error)
    res.status(500).json({ error: 'Failed to remove account' })
  }
})

// Remove user endpoint is no longer needed since we don't group by user
// But keep it for compatibility (it will just delete the app)
router.delete('/users/:githubId', authMiddleware, (req, res) => {
  try {
    const { githubId } = req.params
    const accounts = githubAccountsConfig.read()

    const githubIdNum = parseInt(githubId)
    let deletedCount = 0

    // Find all apps for this user
    const toDelete = []
    Object.entries(accounts).forEach(([key, app]) => {
      if (app.githubId === githubIdNum) {
        toDelete.push(key)
      }
    })

    // Delete all marked items
    toDelete.forEach(key => {
      delete accounts[key]
      deletedCount++
    })

    githubAccountsConfig.write(accounts)

    res.json({
      success: true,
      message: `Deleted ${deletedCount} apps`,
      deletedCount
    })
  } catch (error) {
    console.error('Error removing user:', error)
    res.status(500).json({ error: 'Failed to remove user' })
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

    if (!account.installationId) {
      return res.status(400).json({ error: 'No installation ID found for this account' })
    }

    // Get fresh installation access token
    const accessToken = await getInstallationAccessToken(account.installationId)

    const response = await axios.get('https://api.github.com/installation/repositories', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json'
      },
      params: {
        per_page: 100
      }
    })

    const repos = response.data.repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at
    }))

    // 按更新时间降序排序（最近更新的在前）
    repos.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.pushedAt || a.createdAt)
      const dateB = new Date(b.updatedAt || b.pushedAt || b.createdAt)
      return dateB - dateA
    })

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

    if (!account.installationId) {
      return res.status(400).json({ error: 'No installation ID found for this account' })
    }

    // Get fresh installation access token
    const accessToken = await getInstallationAccessToken(account.installationId)

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
