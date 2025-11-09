import { exec, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
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

// Store running processes
const runningProcesses = new Map()

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
    logger.info('Step 1/5: Cloning repository...')
    await cloneRepository(project, paths, logger)
    logger.success('Repository cloned successfully')

    // Step 2: Detect Node version
    const requiredVersion = await detectRequiredNodeVersion(paths.source)
    logger.info(`Detected Node version requirement: ${requiredVersion}`)

    let nodeVersion = requiredVersion
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

    // Step 3: Install dependencies
    logger.info('Step 2/5: Installing dependencies...')
    await installDependencies(paths.source, nodeVersion, logger)
    logger.success('Dependencies installed successfully')

    // Step 4: Build project
    logger.info('Step 3/5: Building project...')
    await buildProject(project, paths.source, nodeVersion, logger)
    logger.success('Build completed successfully')

    // Step 5: Start server
    logger.info('Step 4/5: Starting server...')
    await startServer(project, paths, nodeVersion, logger)
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
async function buildProject(project, sourcePath, nodeVersion, logger) {
  const packageJsonPath = path.join(sourcePath, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    logger.warn('No package.json found, skipping build')
    return
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  const buildScript = project.buildCommand || packageJson.scripts?.build

  if (!buildScript) {
    logger.info('No build script found, skipping build')
    return
  }

  await execWithNodeVersion('npm run build', nodeVersion, sourcePath, (data, type) => {
    logger.info(data.trim())
  })
}

/**
 * Start server
 */
async function startServer(project, paths, nodeVersion, logger) {
  const distPath = path.join(paths.source, project.outputDir || 'dist')

  if (!fs.existsSync(distPath)) {
    throw new Error(`Output directory not found: ${distPath}`)
  }

  // Stop existing process if any
  stopServerV3(project.id)

  // 获取 npx 路径
  let npxPath
  if (nodeVersion === 'system') {
    npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  } else {
    const npmPath = getNpmExecutablePath(nodeVersion)
    npxPath = npmPath.replace(/npm(\.cmd)?$/, 'npx$1')
  }

  logger.info(`Node version: ${nodeVersion}`)
  logger.info(`NPX path: ${npxPath}`)
  logger.info(`Serving from: ${distPath}`)
  logger.info(`Port: ${project.port}`)
  logger.info(`Working directory: ${paths.source}`)

  // 检查 npx 是否存在
  if (nodeVersion !== 'system' && !fs.existsSync(npxPath)) {
    throw new Error(`npx not found at: ${npxPath}`)
  }

  return new Promise((resolve, reject) => {
    const args = ['serve', '-s', distPath, '-l', project.port.toString()]
    logger.info(`Spawn command: ${npxPath} ${args.join(' ')}`)

    const serverProcess = spawn(npxPath, args, {
      cwd: paths.source,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    })

    let hasError = false
    let errorOutput = ''

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString().trim()
      logger.info(output)
    })

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString().trim()
      errorOutput += output + '\n'
      logger.warn(output)
    })

    serverProcess.on('error', (error) => {
      hasError = true
      logger.error(`Failed to start server: ${error.message}`)
      reject(error)
    })

    serverProcess.on('exit', (code) => {
      if (code !== 0 && !runningProcesses.has(project.id)) {
        logger.error(`Server process exited with code ${code}`)
        if (errorOutput) {
          logger.error(`Error output: ${errorOutput}`)
        }

        const projectConfig = new ProjectConfig(project.name)
        projectConfig.update({ status: 'stopped' })
        projectIndex.update(project.id, { status: 'stopped' })
      }

      logger.info(`Server exited with code ${code}`)
      runningProcesses.delete(project.id)
    })

    // 保存进程引用
    runningProcesses.set(project.id, serverProcess)

    // 等待服务器启动
    setTimeout(() => {
      if (!hasError) {
        resolve()
      }
    }, 3000)
  })
}

/**
 * Stop server
 */
export function stopServerV3(projectId) {
  const process = runningProcesses.get(projectId)

  if (process) {
    console.log(`Stopping server for project: ${projectId}`)
    process.kill()
    runningProcesses.delete(projectId)
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
  return Array.from(runningProcesses.keys())
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
