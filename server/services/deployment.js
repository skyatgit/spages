import { execSync, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { projectsConfig, githubAccountsConfig } from '../utils/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECTS_DIR = path.join(process.cwd(), 'projects')

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })
}

// Store running processes
const runningProcesses = new Map()

/**
 * Deploy a project
 * @param {string} projectId - Project ID
 */
export async function deployProject(projectId) {
  const projects = projectsConfig.read()
  const project = projects[projectId]

  if (!project) {
    throw new Error('Project not found')
  }

  console.log(`Starting deployment for project: ${project.name}`)

  try {
    // Update status to building
    updateProjectStatus(projectId, 'building')

    // Step 1: Clone repository
    await cloneRepository(project)

    // Step 2: Install dependencies
    await installDependencies(project)

    // Step 3: Build project
    await buildProject(project)

    // Step 4: Start server
    await startServer(project)

    // Update status to running
    updateProjectStatus(projectId, 'running', {
      lastDeploy: new Date().toISOString(),
      url: `http://localhost:${project.port}`
    })

    console.log(`✅ Deployment completed for project: ${project.name}`)
  } catch (error) {
    console.error(`❌ Deployment failed for project: ${project.name}`, error)
    updateProjectStatus(projectId, 'failed')
    throw error
  }
}

/**
 * Clone GitHub repository
 */
async function cloneRepository(project) {
  console.log(`📥 Cloning repository: ${project.repository}`)

  const projectPath = path.join(PROJECTS_DIR, project.name)

  // If directory exists, pull latest changes
  if (fs.existsSync(projectPath)) {
    console.log('  Directory exists, pulling latest changes...')
    try {
      execSync('git pull', { cwd: projectPath, stdio: 'inherit' })
      return
    } catch (error) {
      console.log('  Pull failed, removing and re-cloning...')
      fs.rmSync(projectPath, { recursive: true, force: true })
    }
  }

  // Get GitHub account info for authentication
  const accounts = githubAccountsConfig.read()
  const account = Object.values(accounts).find(acc => acc.id === project.accountId)

  if (!account || !account.accessToken) {
    throw new Error('GitHub account not found or access token missing')
  }

  // Clone with authentication
  const cloneUrl = `https://x-access-token:${account.accessToken}@github.com/${project.repository}.git`

  try {
    execSync(`git clone -b ${project.branch} ${cloneUrl} ${projectPath}`, {
      stdio: 'inherit'
    })
    console.log('  ✅ Repository cloned successfully')
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error.message}`)
  }
}

/**
 * Install dependencies
 */
async function installDependencies(project) {
  console.log('📦 Installing dependencies...')

  const projectPath = path.join(PROJECTS_DIR, project.name)

  // Check if package.json exists
  if (!fs.existsSync(path.join(projectPath, 'package.json'))) {
    console.log('  ⚠️  No package.json found, skipping dependency installation')
    return
  }

  try {
    execSync('npm install', { cwd: projectPath, stdio: 'inherit' })
    console.log('  ✅ Dependencies installed successfully')
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error.message}`)
  }
}

/**
 * Build project
 */
async function buildProject(project) {
  console.log('🔨 Building project...')

  const projectPath = path.join(PROJECTS_DIR, project.name)
  const packageJsonPath = path.join(projectPath, 'package.json')

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    console.log('  ⚠️  No package.json found, skipping build')
    return
  }

  // Read package.json to find build script
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  const buildScript = project.buildCommand || packageJson.scripts?.build

  if (!buildScript) {
    console.log('  ℹ️  No build script found, skipping build')
    return
  }

  try {
    execSync(`npm run build`, { cwd: projectPath, stdio: 'inherit' })
    console.log('  ✅ Build completed successfully')
  } catch (error) {
    throw new Error(`Failed to build project: ${error.message}`)
  }
}

/**
 * Start server for the project
 */
async function startServer(project) {
  console.log('🚀 Starting server...')

  const projectPath = path.join(PROJECTS_DIR, project.name)
  const distPath = path.join(projectPath, project.outputDir || 'dist')

  // Check if dist directory exists
  if (!fs.existsSync(distPath)) {
    throw new Error(`Output directory not found: ${distPath}`)
  }

  // Stop existing process if any
  stopServer(project.id)

  // Start serve process
  const serverProcess = spawn('npx', ['serve', '-s', distPath, '-l', project.port.toString()], {
    cwd: projectPath,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  // Store process
  runningProcesses.set(project.id, serverProcess)

  // Log output
  serverProcess.stdout.on('data', (data) => {
    console.log(`[${project.name}] ${data.toString().trim()}`)
  })

  serverProcess.stderr.on('data', (data) => {
    console.error(`[${project.name}] ${data.toString().trim()}`)
  })

  serverProcess.on('exit', (code) => {
    console.log(`[${project.name}] Server exited with code ${code}`)
    runningProcesses.delete(project.id)

    if (code !== 0) {
      updateProjectStatus(project.id, 'stopped')
    }
  })

  // Wait a bit to ensure server started
  await new Promise(resolve => setTimeout(resolve, 2000))

  console.log(`  ✅ Server started on port ${project.port}`)
}

/**
 * Stop server for a project
 */
export function stopServer(projectId) {
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
 * Get all running processes
 */
export function getRunningProcesses() {
  return Array.from(runningProcesses.keys())
}
