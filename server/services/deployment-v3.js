import { exec, spawn, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import http from 'http'
import os from 'os'
import { githubAccountsConfig } from '../utils/config.js'
import {
  detectRequiredNodeVersion,
  isNodeVersionInstalled,
  getNodeExecutablePath,
  getNpmExecutablePath,
  getSystemNodeVersion,
  execWithNodeVersion,
  installNodeVersion
} from './node-manager.js'
import {
  ProjectPaths,
  ProjectConfig,
  DeploymentHistory,
  projectIndex
} from './project-manager.js'
import { detectFramework } from './framework-detector.js'

// Store running processes and their connections
const runningProcesses = new Map()
const serverConnections = new Map() // 存储每个服务器的活动连接

/**
 * 部署日志管理
 */
class DeploymentLogger {
  constructor(projectName, deploymentId) {
    this.projectName = projectName
    this.deploymentId = deploymentId
    this.logs = []

    const paths = new ProjectPaths(projectName)
    this.logFile = path.join(paths.logs, `${deploymentId}.log`)
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' })
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      type,
      message
    }

    this.logs.push(logEntry)
    const logLine = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`
    this.stream.write(logLine)
    console.log(`[${this.projectName}]`, logLine.trim())

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
 */
export async function deployProjectV3(projectId) {
  const projectConfig = new ProjectConfig(projectId)
  const project = projectConfig.read()

  if (!project) {
    throw new Error('Project not found')
  }

  const paths = new ProjectPaths(project.name)
  const deploymentId = `deploy_${Date.now()}`
  const logger = new DeploymentLogger(project.name, deploymentId)
  const history = new DeploymentHistory(project.name)

  // 创建部署记录
  const deployment = {
    id: deploymentId,
    timestamp: new Date().toISOString(),
    status: 'building',
    commit: null,
    branch: project.branch,
    logFile: `${deploymentId}.log`,
    duration: 0,
    startTime: Date.now()
  }

  history.add(deployment)

  logger.info(`Starting deployment for project: ${project.name}`)

  try {
    // Update status to building
    projectConfig.update({ status: 'building' })
    projectIndex.update(projectId, { status: 'building' })

    // Step 1: Clone repository
    logger.info('Step 1/6: Cloning repository...')
    await cloneRepository(project, paths, logger)
    logger.success('Repository cloned successfully')

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

    // Step 3: Detect Node version
    let nodeVersion = 'system'

    // Only detect and install Node version if build is needed
    if (frameworkInfo.needsBuild) {
      const requiredVersion = await detectRequiredNodeVersion(paths.source)
      logger.info(`Detected Node version requirement: ${requiredVersion}`)

      nodeVersion = requiredVersion
      if (requiredVersion === 'system') {
        nodeVersion = await getSystemNodeVersion()
        logger.info(`Using system Node version: v${nodeVersion}`)
      } else if (!isNodeVersionInstalled(requiredVersion)) {
        logger.info(`Node v${requiredVersion} not installed, downloading...`)

        try {
          // 自动下载并安装 Node.js
          nodeVersion = await installNodeVersion(requiredVersion, (progress) => {
            logger.info(progress)
          })
          logger.success(`Node v${nodeVersion} installed successfully`)
        } catch (error) {
          logger.error(`Failed to install Node v${requiredVersion}: ${error.message}`)
          logger.warn('Falling back to system Node')
          nodeVersion = await getSystemNodeVersion()
        }
      } else {
        // 已安装，解析具体版本
        const installedVersions = fs.readdirSync(path.join(process.cwd(), 'runtime', 'node-versions'))
          .filter(dir => dir.startsWith('node-v'))
          .map(dir => dir.replace('node-v', ''))

        // 找到匹配的版本
        for (const version of installedVersions) {
          if (requiredVersion.includes(version)) {
            nodeVersion = version
            logger.info(`Using installed Node version: v${nodeVersion}`)
            break
          }
        }
      }
    } else {
      logger.info('Static project detected, using system Node for serving')
      nodeVersion = 'system'
    }

    // Step 4: Install dependencies
    if (frameworkInfo.installDeps) {
      logger.info('Step 4/6: Installing dependencies...')
      await installDependencies(paths.source, nodeVersion, logger)
      logger.success('Dependencies installed successfully')
    } else {
      logger.info('Step 4/6: Skipping dependency installation (not required)')
    }

    // Step 5: Build project
    if (frameworkInfo.needsBuild) {
      logger.info('Step 5/6: Building project...')
      await buildProject(project, paths.source, nodeVersion, logger, frameworkInfo)
      logger.success('Build completed successfully')
    } else {
      logger.info('Step 5/6: Skipping build (static project)')
    }

    // Step 6: Start server
    logger.info('Step 6/6: Starting server...')
    await startServer(project, paths, nodeVersion, logger, frameworkInfo)
    logger.success(`Server started on port ${project.port}`)

    // Update status to running
    const duration = Date.now() - deployment.startTime
    projectConfig.update({
      status: 'running',
      lastDeploy: new Date().toISOString(),
      url: `http://localhost:${project.port}`,
      nodeVersion
    })

    projectIndex.update(projectId, {
      status: 'running',
      lastDeploy: new Date().toISOString(),
      url: `http://localhost:${project.port}`
    })

    history.updateStatus(deploymentId, {
      status: 'success',
      duration,
      url: `http://localhost:${project.port}`
    })

    logger.success('✅ Deployment completed successfully!')
    logger.close()

    return { success: true, logs: logger.getLogs() }
  } catch (error) {
    logger.error(`❌ Deployment failed: ${error.message}`)
    logger.close()

    const duration = Date.now() - deployment.startTime
    projectConfig.update({ status: 'failed' })
    projectIndex.update(projectId, { status: 'failed' })

    history.updateStatus(deploymentId, {
      status: 'failed',
      duration,
      error: error.message
    })

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
 * Install dependencies
 */
async function installDependencies(sourcePath, nodeVersion, logger) {
  if (!fs.existsSync(path.join(sourcePath, 'package.json'))) {
    logger.warn('No package.json found, skipping dependency installation')
    return
  }

  await execWithNodeVersion('npm install', nodeVersion, sourcePath, (data, type) => {
    logger.info(data.trim())
  })
}

/**
 * Build project
 */
async function buildProject(project, sourcePath, nodeVersion, logger, frameworkInfo) {
  const packageJsonPath = path.join(sourcePath, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    logger.warn('No package.json found, skipping build')
    return
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  // Use framework info build command, then fallback to project config, then package.json
  const buildCommand = frameworkInfo.buildCommand || project.buildCommand || packageJson.scripts?.build

  if (!buildCommand) {
    logger.info('No build script found, skipping build')
    return
  }

  logger.info(`Build command: ${buildCommand}`)

  await execWithNodeVersion('npm run build', nodeVersion, sourcePath, (data, type) => {
    logger.info(data.trim())
  })
}

/**
 * Start server
 */
async function startServer(project, paths, nodeVersion, logger, frameworkInfo) {
  // Use framework info output dir, then fallback to project config, then default to 'dist'
  const outputDir = frameworkInfo.outputDir || project.outputDir || 'dist'
  const distPath = path.join(paths.source, outputDir)

  logger.info(`Looking for output directory: ${outputDir}`)

  if (!fs.existsSync(distPath)) {
    throw new Error(`Output directory not found: ${distPath}`)
  }

  // Stop existing process if any
  stopServerV3(project.id)

  logger.info(`Serving from: ${distPath}`)
  logger.info(`Port: ${project.port}`)

  // 所有项目都使用内置的 HTTP 服务器（不再使用 npx serve）
  // 这样可以避免跨平台的进程管理问题，server.close() 在所有平台都工作良好
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
      // 解析 URL，移除查询参数
      const urlPath = req.url.split('?')[0]
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
      // 首先强制关闭所有活动连接
      if (connections) {
        console.log(`[stopServerV3] Destroying ${connections.size} active connections`)
        for (const conn of connections) {
          conn.destroy() // 立即终止连接
        }
        serverConnections.delete(projectId)
      }

      // 然后关闭服务器
      server.close((err) => {
        if (err) {
          console.error(`[stopServerV3] Error closing server: ${err.message}`)
        } else {
          console.log(`[stopServerV3] HTTP server closed successfully for project: ${projectId}`)
        }
      })

      // 立即从 map 中删除
      runningProcesses.delete(projectId)
      return true
    } catch (error) {
      console.error(`[stopServerV3] Error stopping server: ${error.message}`)
      // 即使出错也删除引用，避免泄漏
      runningProcesses.delete(projectId)
      return false
    }
  } else {
    console.log(`[stopServerV3] No running server found for project: ${projectId}`)
    return false
  }
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
    const logs = logContent.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^\[(.*?)\] \[(.*?)\] (.*)$/)
        if (match) {
          return {
            timestamp: match[1],
            type: match[2].toLowerCase(),
            message: match[3]
          }
        }
        return null
      })
      .filter(log => log !== null)

    return logs
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
 * Get deployment history
 */
export function getDeploymentHistory(projectId) {
  const projectConfig = new ProjectConfig(projectId)
  const project = projectConfig.read()

  if (!project) {
    return []
  }

  const history = new DeploymentHistory(project.name)
  return history.read().history
}
