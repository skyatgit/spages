import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import http from 'http'
import os from 'os'
import { githubAccountsConfig } from '../utils/config.js'
import {
  detectRequiredNodeVersion,
  execWithNodeVersion,
  installNodeVersion,
  getPreferredRuntimeNodeVersion
} from './node-manager.js'
import {
  ProjectPaths,
  ProjectConfig,
  DeploymentHistory,
  projectIndex
} from './project-manager.js'
import { detectFramework } from './framework-detector.js'

// 运行中进程与连接（仅静态服务器）
const runningProcesses = new Map()
const serverConnections = new Map() // 存储每个服务器的活动连接
const deployingProjects = new Map() // 存储正在部署的项目 ID

// SSE 订阅管理
const logSubscribers = new Map() // projectId -> Set of response objects
const projectStateSubscribers = new Map() // projectId -> Set of response objects (单个项目状态)
const allProjectsStateSubscribers = new Set() // Set of response objects (所有项目状态)
const deploymentHistorySubscribers = new Map() // projectId -> Set of response objects (部署历史)

/**
 * 获取服务器访问地址
 * 优先级：项目配置 > 环境变量 > 自动检测局域网 IP > localhost
 * @param {string} projectId - 项目ID（可选）
 */
function getServerHost(projectId = null) {
  // 1. 如果提供了项目ID，优先使用项目配置的 serverHost
  if (projectId) {
    try {
      const projectConfig = new ProjectConfig(projectId)
      const project = projectConfig.read()
      if (project && project.serverHost) {
        return project.serverHost
      }
    } catch (error) {
      // 项目配置读取失败，继续其他方式
    }
  }
  
  // 2. 环境变量（可选）
  if (process.env.SERVER_HOST) {
    return process.env.SERVER_HOST
  }

  // 3. 自动检测首个非内网回环 IPv4
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }

  // 4. 回退 localhost
  return 'localhost'
}

/**
 * 部署日志管理
 */
class DeploymentLogger {
  constructor(projectName, deploymentId, projectId = null) {
    this.projectName = projectName
    this.deploymentId = deploymentId
    this.projectId = projectId
    this.logs = []

    const paths = new ProjectPaths(projectName)
    this.logFile = path.join(paths.logs, `${deploymentId}.log`)
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' })
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const cleanMessage = String(message ?? '') // 不再移除 ANSI，保持原样

    const logEntry = {
      timestamp,
      type,
      message: cleanMessage
    }

    this.logs.push(logEntry)
    const logLine = `[${timestamp}] [${type.toUpperCase()}] ${cleanMessage}\n`
    this.stream.write(logLine)
    console.log(`[${this.projectName}]`, logLine.trim())

    // 实时广播日志到所有订阅者
    if (this.projectId) {
      broadcastLog(this.projectId, logEntry)
    }

    return logEntry
  }

  info(message) {
    return this.log(message, 'info')
  }

  success(message) {
    return this.log(message, 'success')
  }

  error(message) {
    return this.log(message, 'error')
  }

  warn(message) {
    return this.log(message, 'warn')
  }

  close() {
    this.stream.end()
  }

  getLogs() {
    return this.logs
  }
}

/**
 * 部署项目 (V3 - 使用新目录结构)
 * @param {string} projectId - 项目ID
 * @param {object} options - 部署选项
 * @param {string} options.reason - 部署原因：'manual'(手动部署) | 'push'(推送部署) | 'auto'(自动部署) | 'initial'(初始部署)
 * @param {string} options.triggeredBy - 触发者信息
 */
export async function deployProjectV3(projectId, options = {}) {
  const { reason = 'manual', triggeredBy = 'admin' } = options

  const projectConfig = new ProjectConfig(projectId)
  const project = projectConfig.read()

  if (!project) {
    throw new Error('Project not found')
  }

  const paths = new ProjectPaths(project.name)
  const deploymentId = `deploy_${Date.now()}`
  const logger = new DeploymentLogger(project.name, deploymentId, projectId)
  const history = new DeploymentHistory(project.name)

  // 创建部署记录
  const deployment = {
    id: deploymentId,
    timestamp: new Date().toISOString(),
    status: 'building',
    commit: null,
    commitHash: null,
    commitMessage: null,
    commitAuthor: null,
    branch: project.branch,
    reason: reason, // 部署原因
    triggeredBy: triggeredBy, // 触发者
    logFile: `${deploymentId}.log`,
    duration: 0,
    startTime: Date.now()
  }

  history.add(deployment)

  logger.info(`Starting deployment for project: ${project.name}`)

  try {
    // 标记为部署中
    deployingProjects.set(projectId, true)

    // 更新状态为构建中并广播
    updateAndBroadcastProjectState(projectId, { status: 'building' })

    // 广播部署开始（立即显示在部署历史中）
    broadcastDeploymentHistory(projectId, deployment)

    // 步骤 1: 克隆仓库（核心前端项目跳过）
    if (project.type === 'core' && project.managed === true) {
      logger.info('Core frontend detected, skip cloning repository')
    } else {
      logger.info('Step 1/6: Cloning repository...')
      await cloneRepository(project, paths, logger)
      logger.success('Repository cloned successfully')
    }

    // 获取提交信息
    logger.info('Getting commit information...')
    const commitInfo = await getLatestCommitInfo(paths.source, logger)
    if (commitInfo) {
      logger.info(`Commit: ${commitInfo.hash} - ${commitInfo.message}`)
      logger.info(`Author: ${commitInfo.author}`)

      // 更新部署记录中的commit信息
      history.updateStatus(deploymentId, {
        commit: commitInfo.hash.substring(0, 7), // 短hash
        commitHash: commitInfo.hash, // 完整hash
        commitMessage: commitInfo.message,
        commitAuthor: commitInfo.author
      })
    }

    // Step 2: Detect framework
    logger.info('Step 2/6: Detecting framework...')
    const frameworkInfo = detectFramework(paths.source)
    logger.info(`Detected framework: ${frameworkInfo.name}`)
    logger.info(`Build required: ${frameworkInfo.needsBuild}`)
    logger.info(`Output directory: ${frameworkInfo.outputDir}`)

    // Store framework info in project config
    projectConfig.update({
      framework: frameworkInfo.framework,
      buildTool: frameworkInfo.buildTool,
      frameworkType: frameworkInfo.type,
      outputDir: frameworkInfo.outputDir
    })

    // 步骤 3: 检测 Node 版本（始终使用 runtime 版本，不使用系统环境）
    let nodeVersion = null

    if (frameworkInfo.needsBuild) {
      const requiredVersion = await detectRequiredNodeVersion(paths.source)
      logger.info(`Detected Node version requirement: ${requiredVersion}`)

      try {
        if (requiredVersion === 'system') {
          // 未声明具体版本
          try {
            nodeVersion = getPreferredRuntimeNodeVersion()
            logger.info(`Using preferred runtime Node version: v${nodeVersion}`)
          } catch (noRuntimeErr) {
            logger.warn('No runtime Node versions found, installing default v24.11.0...')
            nodeVersion = await installNodeVersion('24.11.0', (progress) => logger.info(progress))
            logger.success(`Runtime Node v${nodeVersion} installed`)
          }

          // 自动固定版本
          try {
            const nvmrcPath = path.join(paths.source, '.nvmrc')
            if (!fs.existsSync(nvmrcPath)) {
              fs.writeFileSync(nvmrcPath, `${nodeVersion}\n`, 'utf-8')
              logger.info(`Pinned Node version via .nvmrc: ${nodeVersion}`)
            }

            if (project.type === 'core') {
              const pkgPath = path.join(paths.source, 'package.json')
              if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
                if (!pkg.engines || !pkg.engines.node) {
                  pkg.engines = pkg.engines || {}
                  pkg.engines.node = nodeVersion
                  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
                  logger.info(`Added engines.node=${nodeVersion} to package.json`)
                }
              }
            }
          } catch (e) {
            logger.warn(`Failed to pin Node version: ${e.message}`)
          }
        } else {
          // 解析并确保版本已安装（已安装则直接返回版本号）
          nodeVersion = await installNodeVersion(requiredVersion, (progress) => {
            logger.info(progress)
          })
          logger.success(`Runtime Node v${nodeVersion} is ready`)
        }
      } catch (error) {
        logger.error(`Failed to resolve/install Node (${requiredVersion}): ${error.message}`)
        nodeVersion = getPreferredRuntimeNodeVersion()
        logger.warn(`Falling back to preferred runtime Node v${nodeVersion}`)
      }
    } else {
      // 静态项目也统一选择 runtime 下的首选 Node 版本（保持一致策略）
      nodeVersion = getPreferredRuntimeNodeVersion()
      logger.info(`Static project: using runtime Node v${nodeVersion}`)
    }

    // 步骤 4: 安装依赖
    if (frameworkInfo.installDeps) {
      logger.info('Step 4/6: Installing dependencies...')
      await installDependencies(paths.source, nodeVersion, logger)
      logger.success('Dependencies installed successfully')
    } else {
      logger.info('Step 4/6: Skipping dependency installation (not required)')
    }

    // 步骤 5: 构建项目
    if (frameworkInfo.needsBuild) {
      logger.info('Step 5/6: Building project...')
      await buildProject(project, paths.source, nodeVersion, logger, frameworkInfo)
      logger.success('Build completed successfully')
    } else {
      logger.info('Step 5/6: Skipping build (static project)')
    }

    // 步骤 6: 启动服务器
    logger.info('Step 6/6: Starting server...')
    
    // 在启动新服务器之前，先停止旧的服务器（如果正在运行）
    // 这样确保构建完成后才停止，避免系统前端在构建期间无法访问
    if (runningProcesses.has(projectId)) {
      logger.info('Stopping existing server before starting new one...')
      stopServerV3(projectId)
      // 等待端口释放
      await new Promise(resolve => setTimeout(resolve, 500))
      logger.info('Old server stopped, port released')
    }
    
    await startServer(project, paths, nodeVersion, logger, frameworkInfo)
    logger.success(`Server started on port ${project.port}`)

    // 更新状态为运行中并广播
    const duration = Date.now() - deployment.startTime
    const serverHost = getServerHost(projectId) // 传入 projectId
    const url = `http://${serverHost}:${project.port}`

    updateAndBroadcastProjectState(projectId, {
      status: 'running',
      lastDeploy: new Date().toISOString(),
      url: url,
      nodeVersion
    })

    history.updateStatus(deploymentId, {
      status: 'success',
      duration,
      url: url
    })

    logger.success('✅ Deployment completed successfully!')
    logger.close()

    // 移除部署中标记
    deployingProjects.delete(projectId)

    // 广播部署历史更新
    const completedDeployment = history.read().history[0] // 获取最新的部署记录
    if (completedDeployment) {
      broadcastDeploymentHistory(projectId, completedDeployment)
    }

    return { success: true, logs: logger.getLogs() }
  } catch (error) {
    logger.error(`❌ Deployment failed: ${error.message}`)
    logger.close()

    // 移除部署中标记
    deployingProjects.delete(projectId)

    const duration = Date.now() - deployment.startTime
    updateAndBroadcastProjectState(projectId, { status: 'failed' })

    history.updateStatus(deploymentId, {
      status: 'failed',
      duration,
      error: error.message
    })

    // 广播部署历史更新
    const failedDeployment = history.read().history[0]
    if (failedDeployment) {
      broadcastDeploymentHistory(projectId, failedDeployment)
    }

    throw error
  }
}

/**
 * Clone repository
 */
async function cloneRepository(project, paths, logger) {
  if (fs.existsSync(paths.source) && fs.readdirSync(paths.source).length > 0) {
    logger.info('Source directory exists, pulling latest changes...')
    try {
      await execWithNodeVersion('git pull', 'system', paths.source, (data) => {
        logger.info(data.trim())
      })
      return
    } catch (error) {
      logger.warn('Pull failed, removing and re-cloning...')
      fs.rmSync(paths.source, { recursive: true, force: true })
      fs.mkdirSync(paths.source, { recursive: true })
    }
  }

  const accounts = githubAccountsConfig.read()
  const account = Object.values(accounts).find(acc => acc.id === project.accountId)

  if (!account || !account.accessToken) {
    throw new Error('GitHub account not found or access token missing')
  }

  const cloneUrl = `https://x-access-token:${account.accessToken}@github.com/${project.repository}.git`

  return new Promise((resolve, reject) => {
    const child = exec(`git clone -b ${project.branch} ${cloneUrl} "${paths.source}"`)

    child.stdout?.on('data', (data) => logger.info(data.toString().trim()))
    child.stderr?.on('data', (data) => logger.info(data.toString().trim()))

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Git clone failed with exit code ${code}`))
      }
    })

    child.on('error', reject)
  })
}

/**
 * 获取最新的commit信���
 * @param {string} sourcePath - 源码目录
 * @param {DeploymentLogger} logger - 日志记录器
 * @returns {Promise<{hash: string, message: string, author: string, date: string}>}
 */
async function getLatestCommitInfo(sourcePath, logger) {
  try {
    // 获取���新commit的详细信息
    // %H: 完整hash, %s: commit message, %an: author name, %ae: author email, %ai: author date
    const gitCommand = 'git log -1 --pretty=format:"%H|%s|%an <%ae>|%ai"'


    return new Promise((resolve, reject) => {
      exec(gitCommand, { cwd: sourcePath }, (error, stdout, stderr) => {
        if (error) {
          logger.warn(`Failed to get commit info: ${error.message}`)
          resolve(null)
          return
        }

        const output = stdout.trim()
        if (!output) {
          resolve(null)
          return
        }

        const [hash, message, author, date] = output.split('|')
        resolve({
          hash: hash || 'unknown',
          message: message || 'No commit message',
          author: author || 'Unknown',
          date: date || new Date().toISOString()
        })
      })
    })
  } catch (error) {
    logger.warn(`Error getting commit info: ${error.message}`)
    return null
  }
}

/**
 * Install dependencies
 */
async function installDependencies(sourcePath, nodeVersion, logger) {
  if (!fs.existsSync(path.join(sourcePath, 'package.json'))) {
    logger.warn('No package.json found, skipping dependency installation')
    return
  }

  await execWithNodeVersion('npm install', nodeVersion, sourcePath, (data) => {
    logger.info(data.trim())
  })
}

/**
 * Build project（统一使用 npm run build）
 */
async function buildProject(project, sourcePath, nodeVersion, logger, frameworkInfo) {
  const packageJsonPath = path.join(sourcePath, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    logger.warn('No package.json found, skipping build')
    return
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  // 框架检测 > 项目自定义 > package.json scripts.build
  const buildCommand = frameworkInfo.buildCommand || project.buildCommand || packageJson.scripts?.build

  if (!buildCommand) {
    logger.info('No build script found, skipping build')
    return
  }

  logger.info(`Build command: ${buildCommand}`)

  await execWithNodeVersion('npm run build', nodeVersion, sourcePath, (data) => {
    logger.info(data.trim())
  })
}

/**
 * Start server（仅静态文件服务，不支持 dev 模式）
 */
async function startServer(project, paths, nodeVersion, logger, frameworkInfo) {
  const outputDir = frameworkInfo.outputDir || project.outputDir || 'dist'
  const distPath = path.join(paths.source, outputDir)

  // 所有项目（包含核心前端）一律走静态服务
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build directory not found: ${outputDir}. Please deploy the project first.`)
  }

  logger.info(`Serving from: ${distPath}`)
  logger.info(`Port: ${project.port}`)
  logger.info('Starting built-in static file server...')
  return startStaticServer(project, distPath, logger)
}

/**
 * Start static file server using Node.js built-in http module
 * 通用的静态文件服务器，支持所有项目类型
 */
function startStaticServer(project, distPath, logger) {
  return new Promise((resolve, reject) => {
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.xml': 'application/xml; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'font/otf',
      '.txt': 'text/plain; charset=utf-8',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.wasm': 'application/wasm'
    }

    const server = http.createServer((req, res) => {
      // 解析 URL，保留查询参数
      const fullUrl = req.url
      const urlPath = fullUrl.split('?')[0]

      // 反向代理 API 请求到后端 (localhost:3000)
      if (urlPath.startsWith('/api/')) {
        const proxyOptions = {
          hostname: 'localhost',
          port: 3000,
          path: fullUrl,
          method: req.method,
          headers: req.headers
        }
        const proxyReq = http.request(proxyOptions, (proxyRes) => {
          // 复制后端响应头（包括 SSE 的 text/event-stream）
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
          proxyRes.pipe(res)
        })
        proxyReq.on('error', (err) => {
          console.error('[StaticServer] API proxy error:', err.message)
          res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'Bad gateway', detail: err.message }))
        })
        // 将前端请求体转发（支持 POST / PUT / PATCH 等）
        req.pipe(proxyReq)
        return
      }

      let filePath = path.join(distPath, urlPath === '/' ? 'index.html' : urlPath)

      // 安全检查：防止路径遍历攻击
      const normalizedPath = path.normalize(filePath)
      if (!normalizedPath.startsWith(distPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' })
        res.end('403 Forbidden')
        logger.warn(`Path traversal attempt blocked: ${req.url}`)
        return
      }

      // 检查文件是否存在
      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // 如果是目录，尝试 index.html
          if (stats && stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html')
            if (!fs.existsSync(filePath)) {
              // 目录但没有 index.html，尝试返回根 index.html（SPA 路由）
              filePath = path.join(distPath, 'index.html')
            }
          } else {
            // 文件不存在，返回 index.html（SPA 路由支持）
            filePath = path.join(distPath, 'index.html')
          }

          // 如果 index.html 也不存在
          if (!fs.existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('404 Not Found')
            return
          }
        }

        // 获取 MIME 类型
        const ext = path.extname(filePath).toLowerCase()
        const contentType = mimeTypes[ext] || 'application/octet-stream'

        // 读取并返回文件
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            res.end('500 Internal Server Error')
            logger.error(`Error reading file ${filePath}: ${err.message}`)
            return
          }

          // 设置缓存头（静态资源缓存 1 小时）
          const headers = {
            'Content-Type': contentType,
            'Content-Length': data.length
          }

          // 对于不是 HTML 的文件，添加缓存
          if (ext !== '.html') {
            headers['Cache-Control'] = 'public, max-age=3600'
          }

          res.writeHead(200, headers)
          res.end(data)
        })
      })
    })

    // 错误处理
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${project.port} is already in use`)
        reject(new Error(`Port ${project.port} is already in use`))
      } else {
        logger.error(`Failed to start static server: ${error.message}`)
        reject(error)
      }
    })

    // 跟踪所有连接，以便在停止时立即关闭
    const connections = new Set()

    server.on('connection', (conn) => {
      connections.add(conn)
      conn.on('close', () => {
        connections.delete(conn)
      })
    })

    // 启动服务器
    server.listen(project.port, () => {
      logger.info(`Static server started on http://localhost:${project.port}`)
      logger.info(`Serving directory: ${distPath}`)
      runningProcesses.set(project.id, server)
      serverConnections.set(project.id, connections)
      resolve()
    })
  })
}

/**
 * Start server - 启动已编译的项目（不重新部署）
 */
export async function startServerV3(projectId) {
  console.log(`[startServerV3] Starting server for project: ${projectId}`)

  const projectConfig = new ProjectConfig(projectId)
  const project = projectConfig.read()
  if (!project) throw new Error('Project not found')

  // 已在运行则直接返回
  if (runningProcesses.has(projectId)) {
    console.log(`[startServerV3] Server already running for project: ${projectId}`)
    return { success: true, message: 'Server already running' }
  }

  const paths = new ProjectPaths(project.name)

  // 静态目录检查
  const outputDir = project.outputDir || 'dist'
  const distPath = path.join(paths.source, outputDir)
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build directory not found: ${outputDir}. Please deploy the project first.`)
  }

  console.log(`[startServerV3] Starting static server from: ${distPath}`)

  const logger = {
    info: (msg) => console.log(`[startServerV3] ${msg}`),
    success: (msg) => console.log(`[startServerV3] ✅ ${msg}`),
    error: (msg) => console.error(`[startServerV3] ❌ ${msg}`)
  }

  await startStaticServer(project, distPath, logger)

  console.log(`[startServerV3] Server started successfully on port ${project.port}`)

  const serverHost = getServerHost(projectId)
  const url = `http://${serverHost}:${project.port}`

  updateAndBroadcastProjectState(projectId, {
    status: 'running',
    url
  })

  console.log(`[startServerV3] Project accessible at: ${url}`)

  return { success: true, message: 'Server started successfully', url }
}

/**
 * Stop server - 简化版本，只处理 HTTP 服务器
 * 所有项目现在都使用内置的 HTTP 服务器，不再有子进程
 * 这使得停止功能完全跨平台，无需任何平台特定代码
 */
export function stopServerV3(projectId) {
  const server = runningProcesses.get(projectId)
  const connections = serverConnections.get(projectId)

  if (server) {
    console.log(`[stopServerV3] Stopping HTTP server for project: ${projectId}`)

    try {
      if (connections) {
        console.log(`[stopServerV3] Destroying ${connections.size} active connections`)
        for (const conn of connections) {
          conn.destroy()
        }
        serverConnections.delete(projectId)
      }

      server.close((err) => {
        if (err) {
          console.error(`[stopServerV3] Error closing server: ${err.message}`)
        } else {
          console.log(`[stopServerV3] HTTP server closed successfully for project: ${projectId}`)
        }
      })

      runningProcesses.delete(projectId)

      updateAndBroadcastProjectState(projectId, {
        status: 'stopped',
        url: null
      })

      return true
    } catch (error) {
      console.error(`[stopServerV3] Failed to stop server: ${error.message}`)
      return false
    }
  }

  console.warn(`[stopServerV3] No running server for project: ${projectId}`)
  return false
}

/**
 * Get deployment logs for a project
 */
export function getDeploymentLogs(projectId, deploymentId = null) {
  const projectConfig = new ProjectConfig(projectId)
  const project = projectConfig.read()

  if (!project) {
    return []
  }

  const paths = new ProjectPaths(project.name)
  const history = new DeploymentHistory(project.name)

  // 如果指定了 deploymentId，读取特定的日志
  if (deploymentId) {
    const logFile = path.join(paths.logs, `${deploymentId}.log`)
    if (fs.existsSync(logFile)) {
      return parseLogFile(logFile)
    }
    return []
  }

  // 否则读取最新的日志
  const latest = history.getLatest()
  if (!latest) {
    return []
  }

  const logFile = path.join(paths.logs, latest.logFile)
  if (fs.existsSync(logFile)) {
    return parseLogFile(logFile)
  }

  return []
}

/**
 * Parse log file
 */
function parseLogFile(logFile) {
  try {
    const logContent = fs.readFileSync(logFile, 'utf-8')
    const lines = logContent.split(/\n/) // 保留内部换行
    const entries = []
    let current = null
    const pattern = /^\[(.*?)\] \[([A-Z]+)] (.*)$/

    for (let rawLine of lines) {
      if (!rawLine) continue
      const line = rawLine.replace(/\r$/, '') // 统一移除行尾 CR
      const match = line.match(pattern)
      if (match) {
        // 新日志行
        current = {
          timestamp: match[1],
          type: match[2].toLowerCase(),
          message: match[3]
        }
        entries.push(current)
      } else if (current) {
        // 续行：追加到上一条日志的 message
        current.message += '\n' + line
      } else {
        // 文件开头的孤立行（无时间戳格式），忽略或可选择保留；此处忽略
        continue
      }
    }

    return entries
  } catch (error) {
    console.error('Error parsing log file:', error)
    return []
  }
}

/**
 * Get all running processes
 */
export function getRunningProcessesV3() {
  const servers = []
  for (const [projectId, server] of runningProcesses.entries()) {
    // 获取服务器监听的地址
    const address = server.address()
    servers.push({
      projectId,
      port: address ? address.port : 'unknown',
      type: 'http_server'
    })
  }
  return servers
}

/**
 * Debug: List all running servers
 */
export function debugRunningProcesses() {
  console.log('[Debug] Current running HTTP servers:')
  for (const [projectId, server] of runningProcesses.entries()) {
    const address = server.address()
    console.log(`  - Project: ${projectId}`)
    console.log(`    Type: HTTP Server`)
    console.log(`    Port: ${address ? address.port : 'unknown'}`)
    console.log(`    Listening: ${server.listening}`)
  }
  console.log(`[Debug] Total: ${runningProcesses.size} servers`)
}

/**
 * Get real-time project status (not from stored config)
 * Returns: 'running', 'building', 'stopped', 'failed'
 */
export function getProjectRealStatus(projectId) {
  // 检查是否正在部署
  if (deployingProjects.has(projectId)) {
    return 'building'
  }

  // 检查服务器是否在运行
  const server = runningProcesses.get(projectId)
  if (server && server.listening === true) {
    return 'running'
  }

  // 检查配置文件中的失败状态（failed 状态需要保留，因为它不会自动恢复）
  const projectConfig = new ProjectConfig(projectId)
  const project = projectConfig.read()
  if (project && project.status === 'failed') {
    return 'failed'
  }

  return 'stopped'
}

/**
 * Check if a project is actually running (based on runningProcesses Map, not stored status)
 * @deprecated Use getProjectRealStatus instead
 */
export function isProjectRunning(projectId) {
  const server = runningProcesses.get(projectId)
  return server && server.listening === true
}

/**
 * Get deployment history
 */
export function getDeploymentHistory(projectId) {
  const projectConfig = new ProjectConfig(projectId)
  const project = projectConfig.read()

  if (!project) {
    return []
  }

  const history = new DeploymentHistory(project.name)
  const data = history.read()
  return data.history || []
}

/**
 * 广播日志到所有订阅者
 */
function broadcastLog(projectId, logEntry) {
  const subscribers = logSubscribers.get(projectId)
  if (!subscribers || subscribers.size === 0) {
    return
  }

  const data = JSON.stringify(logEntry)
  const message = `data: ${data}\n\n`

  // 发送给所有订阅者
  for (const res of subscribers) {
    try {
      res.write(message)
    } catch (error) {
      // 连接已断开，从订阅者列表中移除
      console.error(`[SSE] Failed to send log to subscriber:`, error.message)
      subscribers.delete(res)
    }
  }
}

/**
 * 添加日志订阅者
 */
export function subscribeToLogs(projectId, res) {
  if (!logSubscribers.has(projectId)) {
    logSubscribers.set(projectId, new Set())
  }

  logSubscribers.get(projectId).add(res)
  console.log(`[SSE] New subscriber for project ${projectId}, total: ${logSubscribers.get(projectId).size}`)

  // 当连接关闭时，移除订阅者
  res.on('close', () => {
    const subscribers = logSubscribers.get(projectId)
    if (subscribers) {
      subscribers.delete(res)
      console.log(`[SSE] Subscriber disconnected from project ${projectId}, remaining: ${subscribers.size}`)

      // 如果没有订阅者了，清理 Map
      if (subscribers.size === 0) {
        logSubscribers.delete(projectId)
      }
    }
  })
}

/**
 * 取消订阅
 */
export function unsubscribeFromLogs(projectId, res) {
  const subscribers = logSubscribers.get(projectId)
  if (subscribers) {
    subscribers.delete(res)
    if (subscribers.size === 0) {
      logSubscribers.delete(projectId)
    }
  }
}

/**
 * 广播项目状态变化到所有订阅者
 */
export function broadcastProjectState(projectId, stateData) {
  // 1. 广播到单个项目的订阅者
  const projectSubscribers = projectStateSubscribers.get(projectId)
  if (projectSubscribers && projectSubscribers.size > 0) {
    const message = `data: ${JSON.stringify({ type: 'state', data: stateData })}\n\n`
    for (const res of projectSubscribers) {
      try {
        res.write(message)
      } catch (error) {
        console.error(`[SSE] Failed to send state to subscriber:`, error.message)
        projectSubscribers.delete(res)
      }
    }
  }

  // 2. 广播到所有项目列表的订阅者
  if (allProjectsStateSubscribers.size > 0) {
    const message = `data: ${JSON.stringify({ type: 'project.update', projectId, data: stateData })}\n\n`
    for (const res of allProjectsStateSubscribers) {
      try {
        res.write(message)
      } catch (error) {
        console.error(`[SSE] Failed to send state to all-projects subscriber:`, error.message)
        allProjectsStateSubscribers.delete(res)
      }
    }
  }
}

/**
 * 广播项目删除事件到所有订阅者
 */
export function broadcastProjectDeleted(projectId) {
  console.log(`[SSE] Broadcasting project deleted: ${projectId}`)

  // 广播到所有项目列表的订阅者
  if (allProjectsStateSubscribers.size > 0) {
    const message = `data: ${JSON.stringify({ type: 'project.deleted', projectId })}\n\n`
    for (const res of allProjectsStateSubscribers) {
      try {
        res.write(message)
      } catch (error) {
        console.error(`[SSE] Failed to send delete event to subscriber:`, error.message)
        allProjectsStateSubscribers.delete(res)
      }
    }
  }

  // 清理该项目的订阅者（如果有）
  const projectSubscribers = projectStateSubscribers.get(projectId)
  if (projectSubscribers) {
    projectStateSubscribers.delete(projectId)
  }
}

/**
 * 订阅单个项目状态
 */
export function subscribeToProjectState(projectId, res) {
  if (!projectStateSubscribers.has(projectId)) {
    projectStateSubscribers.set(projectId, new Set())
  }

  projectStateSubscribers.get(projectId).add(res)
  console.log(`[SSE] New project state subscriber for ${projectId}, total: ${projectStateSubscribers.get(projectId).size}`)

  res.on('close', () => {
    const subscribers = projectStateSubscribers.get(projectId)
    if (subscribers) {
      subscribers.delete(res)
      console.log(`[SSE] Project state subscriber disconnected from ${projectId}, remaining: ${subscribers.size}`)

      if (subscribers.size === 0) {
        projectStateSubscribers.delete(projectId)
      }
    }
  })
}

/**
 * 订阅所有项目状态
 */
export function subscribeToAllProjectsState(res) {
  allProjectsStateSubscribers.add(res)
  console.log(`[SSE] New all-projects subscriber, total: ${allProjectsStateSubscribers.size}`)

  res.on('close', () => {
    allProjectsStateSubscribers.delete(res)
    console.log(`[SSE] All-projects subscriber disconnected, remaining: ${allProjectsStateSubscribers.size}`)
  })
}

/**
 * 更新项目状态并广播（统一接口）
 * @param {string} projectId - 项目ID
 * @param {object} updates - 状态更新数据
 */
export function updateAndBroadcastProjectState(projectId, updates) {
  const projectConfig = new ProjectConfig(projectId)
  const project = projectConfig.read()

  if (!project) {
    console.error(`[SSE] Project not found: ${projectId}`)
    return
  }

  // 更新配置
  projectConfig.update(updates)

  // 更新索引
  projectIndex.update(projectId, {
    ...updates,
    updatedAt: new Date().toISOString()
  })

  // 广播状态变化
  const stateData = {
    id: projectId,
    ...project,
    ...updates,
    updatedAt: new Date().toISOString()
  }

  broadcastProjectState(projectId, stateData)
  console.log(`[SSE] Broadcasted state update for project ${projectId}:`, updates)
}

/**
 * 广播部署历史更新
 */
export function broadcastDeploymentHistory(projectId, deployment) {
  const subscribers = deploymentHistorySubscribers.get(projectId)
  if (!subscribers || subscribers.size === 0) {
    return
  }

  const message = `data: ${JSON.stringify({ type: 'deployment.completed', data: deployment })}\n\n`

  for (const res of subscribers) {
    try {
      res.write(message)
    } catch (error) {
      console.error(`[SSE] Failed to send deployment history to subscriber:`, error.message)
      subscribers.delete(res)
    }
  }

  console.log(`[SSE] Broadcasted deployment history for project ${projectId}`)
}

/**
 * 订阅部署历史
 */
export function subscribeToDeploymentHistory(projectId, res) {
  if (!deploymentHistorySubscribers.has(projectId)) {
    deploymentHistorySubscribers.set(projectId, new Set())
  }

  deploymentHistorySubscribers.get(projectId).add(res)
  console.log(`[SSE] New deployment history subscriber for ${projectId}, total: ${deploymentHistorySubscribers.get(projectId).size}`)

  res.on('close', () => {
    const subscribers = deploymentHistorySubscribers.get(projectId)
    if (subscribers) {
      subscribers.delete(res)
      console.log(`[SSE] Deployment history subscriber disconnected from ${projectId}, remaining: ${subscribers.size}`)

      if (subscribers.size === 0) {
        deploymentHistorySubscribers.delete(projectId)
      }
    }
  })
}