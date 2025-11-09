import { exec, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { projectsConfig, githubAccountsConfig } from '../utils/config.js'
import {
  detectRequiredNodeVersion,
  isNodeVersionInstalled,
  getNodeExecutablePath,
  getNpmExecutablePath,
  getSystemNodeVersion,
  execWithNodeVersion
} from './node-manager.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECTS_DIR = path.join(process.cwd(), 'projects')
const LOGS_DIR = path.join(process.cwd(), 'data', 'logs')

// Ensure directories exist
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })
}
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

// Store running processes and log streams
const runningProcesses = new Map()
const deploymentLogs = new Map()

/**
 * 部署日志管理
 */
class DeploymentLogger {
  constructor(projectId) {
    this.projectId = projectId
    this.logs = []
    this.logFile = path.join(LOGS_DIR, `${projectId}-${Date.now()}.log`)
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' })
    deploymentLogs.set(projectId, this)
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
    console.log(`[${this.projectId}]`, logLine.trim())

    // TODO: 通过 WebSocket 推送到前端
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
 * Deploy a project (improved version)
 */
export async function deployProjectV2(projectId) {
  const logger = new DeploymentLogger(projectId)

  const projects = projectsConfig.read()
  const project = projects[projectId]

  if (!project) {
    throw new Error('Project not found')
  }

  logger.info(`Starting deployment for project: ${project.name}`)

  try {
    // Update status to building
    updateProjectStatus(projectId, 'building')

    // Step 1: Clone repository
    logger.info('Step 1/5: Cloning repository...')
    await cloneRepository(project, logger)
    logger.success('Repository cloned successfully')

    // Step 2: Detect Node version
    const projectPath = path.join(PROJECTS_DIR, project.name)
    const requiredVersion = await detectRequiredNodeVersion(projectPath)
    logger.info(`Detected Node version requirement: ${requiredVersion}`)

    let nodeVersion = requiredVersion
    if (requiredVersion === 'system') {
      nodeVersion = await getSystemNodeVersion()
      logger.info(`Using system Node version: v${nodeVersion}`)
    } else if (!isNodeVersionInstalled(requiredVersion)) {
      logger.warn(`Node v${requiredVersion} not installed, using system Node`)
      nodeVersion = await getSystemNodeVersion()
    }

    project.nodeVersion = nodeVersion

    // Step 3: Install dependencies
    logger.info('Step 2/5: Installing dependencies...')
    await installDependencies(project, nodeVersion, logger)
    logger.success('Dependencies installed successfully')

    // Step 4: Build project
    logger.info('Step 3/5: Building project...')
    await buildProject(project, nodeVersion, logger)
    logger.success('Build completed successfully')

    // Step 5: Start server
    logger.info('Step 4/5: Starting server...')
    await startServer(project, nodeVersion, logger)
    logger.success(`Server started on port ${project.port}`)

    // Update status to running
    updateProjectStatus(projectId, 'running', {
      lastDeploy: new Date().toISOString(),
      url: `http://localhost:${project.port}`,
      nodeVersion
    })

    logger.success('✅ Deployment completed successfully!')
    logger.close()

    return { success: true, logs: logger.getLogs() }
  } catch (error) {
    logger.error(`❌ Deployment failed: ${error.message}`)
    logger.close()
    updateProjectStatus(projectId, 'failed')
    throw error
  }
}

/**
 * Clone repository (unchanged)
 */
async function cloneRepository(project, logger) {
  const projectPath = path.join(PROJECTS_DIR, project.name)

  if (fs.existsSync(projectPath)) {
    logger.info('Directory exists, pulling latest changes...')
    try {
      await execWithNodeVersion('git pull', 'system', projectPath, (data) => {
        logger.info(data.trim())
      })
      return
    } catch (error) {
      logger.warn('Pull failed, removing and re-cloning...')
      fs.rmSync(projectPath, { recursive: true, force: true })
    }
  }

  const accounts = githubAccountsConfig.read()
  const account = Object.values(accounts).find(acc => acc.id === project.accountId)

  if (!account || !account.accessToken) {
    throw new Error('GitHub account not found or access token missing')
  }

  const cloneUrl = `https://x-access-token:${account.accessToken}@github.com/${project.repository}.git`

  return new Promise((resolve, reject) => {
    const child = exec(`git clone -b ${project.branch} ${cloneUrl} "${projectPath}"`)

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
async function installDependencies(project, nodeVersion, logger) {
  const projectPath = path.join(PROJECTS_DIR, project.name)

  if (!fs.existsSync(path.join(projectPath, 'package.json'))) {
    logger.warn('No package.json found, skipping dependency installation')
    return
  }

  await execWithNodeVersion('npm install', nodeVersion, projectPath, (data, type) => {
    logger.info(data.trim())
  })
}

/**
 * Build project
 */
async function buildProject(project, nodeVersion, logger) {
  const projectPath = path.join(PROJECTS_DIR, project.name)
  const packageJsonPath = path.join(projectPath, 'package.json')

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

  await execWithNodeVersion('npm run build', nodeVersion, projectPath, (data, type) => {
    logger.info(data.trim())
  })
}

/**
 * Start server
 */
async function startServer(project, nodeVersion, logger) {
  const projectPath = path.join(PROJECTS_DIR, project.name)
  const distPath = path.join(projectPath, project.outputDir || 'dist')

  if (!fs.existsSync(distPath)) {
    throw new Error(`Output directory not found: ${distPath}`)
  }

  // Stop existing process if any
  stopServerV2(project.id)

  const npxPath = getNpmExecutablePath(nodeVersion).replace('npm', 'npx')
  const serverProcess = spawn(npxPath, ['serve', '-s', distPath, '-l', project.port.toString()], {
    cwd: projectPath,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  runningProcesses.set(project.id, serverProcess)

  serverProcess.stdout.on('data', (data) => {
    logger.info(data.toString().trim())
  })

  serverProcess.stderr.on('data', (data) => {
    logger.warn(data.toString().trim())
  })

  serverProcess.on('exit', (code) => {
    logger.info(`Server exited with code ${code}`)
    runningProcesses.delete(project.id)

    if (code !== 0) {
      updateProjectStatus(project.id, 'stopped')
    }
  })

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000))
}

/**
 * Stop server
 */
export function stopServerV2(projectId) {
  const process = runningProcesses.get(projectId)

  if (process) {
    console.log(`Stopping server for project: ${projectId}`)
    process.kill()
    runningProcesses.delete(projectId)
    updateProjectStatus(projectId, 'stopped')
  }
}

/**
 * Update project status
 */
function updateProjectStatus(projectId, status, updates = {}) {
  const projects = projectsConfig.read()

  if (projects[projectId]) {
    projects[projectId] = {
      ...projects[projectId],
      status,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    projectsConfig.write(projects)
  }
}

/**
 * Get deployment logs for a project
 */
export function getDeploymentLogs(projectId) {
  // First check if there's an active logger
  const logger = deploymentLogs.get(projectId)
  if (logger) {
    return logger.getLogs()
  }

  // If no active logger, read from the most recent log file
  try {
    const logFiles = fs.readdirSync(LOGS_DIR)
      .filter(file => file.startsWith(`${projectId}-`) && file.endsWith('.log'))
      .sort()
      .reverse()

    if (logFiles.length === 0) {
      return []
    }

    // Read the most recent log file
    const latestLogFile = path.join(LOGS_DIR, logFiles[0])
    const logContent = fs.readFileSync(latestLogFile, 'utf-8')

    // Parse log lines back into structured format
    const logs = logContent.split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Parse format: [2024-01-09T12:34:56.789Z] [INFO] message
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
    console.error('Error reading log file:', error)
    return []
  }
}

/**
 * Get all running processes
 */
export function getRunningProcessesV2() {
  return Array.from(runningProcesses.keys())
}
