import express from 'express'
import { authMiddleware, verifyToken } from '../utils/auth.js'
import {
  deployProjectV3,
  startServerV3,
  stopServerV3,
  getDeploymentLogs,
  getDeploymentHistory,
  debugRunningProcesses,
  getProjectRealStatus,
  subscribeToLogs,
  subscribeToProjectState,
  subscribeToAllProjectsState,
  broadcastProjectDeleted,
  subscribeToDeploymentHistory
} from '../services/deployment-v3.js'
import {
  ProjectPaths,
  ProjectConfig,
  DeploymentHistory,
  EnvironmentVars,
  projectIndex
} from '../services/project-manager.js'

const router = express.Router()

// 检查项目名称是否可用
router.get('/check-name/:name', authMiddleware, (req, res) => {
  try {
    const { name } = req.params
    console.log(`Checking project name: "${name}"`)

    const allProjects = projectIndex.getAll()
    const exists = Object.values(allProjects).some(p => p.name === name)

    console.log(`Name "${name}" exists:`, exists)
    res.json({ available: !exists })
  } catch (error) {
    console.error('Error checking project name:', error)
    res.status(500).json({ error: 'Failed to check project name' })
  }
})

// 检查端口是否可用
router.get('/check-port/:port', authMiddleware, (req, res) => {
  try {
    const port = parseInt(req.params.port)
    console.log(`Checking port ${port}`)

    if (port < 1024 || port > 65535) {
      console.log(`Port ${port} invalid range`)
      return res.json({ available: false, error: 'Invalid port range' })
    }

    const allProjects = projectIndex.getAll()
    const portInUse = Object.values(allProjects).some(p => p.port === port)

    if (portInUse) {
      console.log(`Port ${port} in use by project`)
      return res.json({ available: false })
    }

    console.log(`Port ${port} available`)
    res.json({ available: true })
  } catch (error) {
    console.error('Error checking port:', error)
    res.status(500).json({ error: 'Failed to check port' })
  }
})

// 获取下一个可用端口
router.get('/next-available-port', authMiddleware, (req, res) => {
  try {
    const allProjects = projectIndex.getAll()
    const usedPorts = Object.values(allProjects).map(p => p.port)

    // 从 3001 开始找到第一个可用端口
    let port = 3001
    while (usedPorts.includes(port)) {
      port++
    }

    console.log(`Next available port: ${port}`)
    res.json({ port })
  } catch (error) {
    console.error('Error getting next available port:', error)
    res.status(500).json({ error: 'Failed to get next available port' })
  }
})

// 获取所有项目（从索引中）
router.get('/', authMiddleware, (req, res) => {
  try {
    const projects = projectIndex.getAll()
    // 为每个项目对象添加 ID 并使用实时状态
    const projectList = Object.entries(projects).map(([id, project]) => {
      // 获取真实的实时状态（基于 runningProcesses 和 deployingProjects）
      const actualStatus = getProjectRealStatus(id)

      return {
        id,
        ...project,
        status: actualStatus // 使用真实状态，不使用存储的状态
      }
    })
    res.json(projectList)
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// SSE: Real-time all projects state stream
router.get('/state/stream', (req, res) => {
  const { token } = req.query

  // 验证 token
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 发送连接成功消息
  res.write('data: {"type":"connected","message":"Projects state stream connected"}\n\n')

  // 订阅所有项目状态
  subscribeToAllProjectsState(res)

  // 发送当前所有项目状态
  try {
    const projects = projectIndex.getAll()
    const projectList = Object.entries(projects).map(([id, project]) => {
      const actualStatus = getProjectRealStatus(id)
      return {
        id,
        ...project,
        status: actualStatus
      }
    })

    // 发送初始状态
    res.write(`data: ${JSON.stringify({ type: 'initial', data: projectList })}\n\n`)
  } catch (error) {
    console.error('Error sending initial projects state:', error)
  }

  // 保持连接
  req.on('close', () => {
    console.log('[SSE] All-projects state client disconnected')
  })
})

// Get single project (full details)
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const projectConfig = new ProjectConfig(id)
    const project = projectConfig.read()

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // 获取真实的实时状态（基于 runningProcesses 和 deployingProjects）
    const actualStatus = getProjectRealStatus(id)

    res.json({
      ...project,
      status: actualStatus // 使用真实状态，不使用存储的状态
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// SSE: Real-time single project state stream
router.get('/:id/state/stream', (req, res) => {
  const { id } = req.params
  const { token } = req.query

  // 验证 token
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 发送连接成功消息
  res.write('data: {"type":"connected","message":"Project state stream connected"}\n\n')

  // 订阅项目状态
  subscribeToProjectState(id, res)

  // 发送当前项目状态
  try {
    const projectConfig = new ProjectConfig(id)
    const project = projectConfig.read()

    if (project) {
      const actualStatus = getProjectRealStatus(id)
      const stateData = {
        ...project,
        status: actualStatus
      }
      res.write(`data: ${JSON.stringify({ type: 'state', data: stateData })}\n\n`)
    }
  } catch (error) {
    console.error('Error sending initial project state:', error)
  }

  // 保持连接
  req.on('close', () => {
    console.log(`[SSE] Project state client disconnected from ${id}`)
  })
})

// Create new project
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, accountId, repository, owner, repo, branch, serverHost, port, buildCommand, outputDir } = req.body

    // Validate required fields
    if (!name || !accountId || !repository || !owner || !repo || !branch || !port) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const allProjects = projectIndex.getAll()

    // 检查名称是否已存在
    const nameExists = Object.values(allProjects).some(p => p.name === name)
    if (nameExists) {
      return res.status(400).json({ error: 'Project name already exists' })
    }

    // 检查端口是否已被使用
    const portInUse = Object.values(allProjects).some(p => p.port === port)
    if (portInUse) {
      return res.status(400).json({ error: 'Port already in use' })
    }

    // Create project ID
    const projectId = `proj_${Date.now()}`

    // Initialize project directory structure
    const paths = new ProjectPaths(name)
    paths.init()

    // Create project config
    const projectConfig = new ProjectConfig(name)
    const config = {
      id: projectId,
      name,
      accountId,
      repository,
      owner,
      repo,
      branch,
      serverHost: serverHost || null, // 保存用户选择的服务器 IP
      port: parseInt(port),
      buildCommand: buildCommand || 'npm run build',
      outputDir: outputDir || 'dist',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastDeploy: null,
      url: null,
      nodeVersion: null
    }

    projectConfig.write(config)

    // Add to index
    projectIndex.update(projectId, {
      name,
      accountId,
      repository,
      owner,
      repo,
      path: `projects/${name}`,
      port: parseInt(port),
      status: 'pending',
      branch,
      lastDeploy: null,
      url: null,
      updatedAt: new Date().toISOString()
    })

    res.json({ success: true, project: config })
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Update project
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const projectConfig = new ProjectConfig(id)
    const project = projectConfig.read()

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Update config
    projectConfig.update(updates)

    // Update index
    projectIndex.update(id, {
      name: updates.name || project.name,
      port: updates.port || project.port,
      status: updates.status || project.status,
      repository: updates.repository || project.repository,
      branch: updates.branch || project.branch,
      url: updates.url || project.url
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const projectConfig = new ProjectConfig(id)
    const project = projectConfig.read()

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    console.log(`[Delete Project] Stopping project: ${id}`)

    // 删除前停止运行中的项目
    stopServerV3(id)

    // 等待进程完全终止并释放文件句柄（在 Windows 上很重要）
    console.log('[Delete Project] Waiting for file handles to be released...')
    await new Promise(resolve => setTimeout(resolve, 500))

    console.log(`[Delete Project] Deleting directory: ${project.name}`)

    // Delete project directory
    const paths = new ProjectPaths(project.name)
    paths.remove()

    console.log('[Delete Project] Deleting from index...')

    // Delete from index
    projectIndex.delete(id)

    console.log('[Delete Project] Broadcasting delete event...')

    // 广播项目删除事件到所有 SSE 订阅者
    broadcastProjectDeleted(id)

    console.log('[Delete Project] Project deleted successfully')

    res.json({ success: true })
  } catch (error) {
    console.error('[Delete Project] Error:', error)
    res.status(500).json({ error: `Failed to delete project: ${error.message}` })
  }
})

// Deploy a project
router.post('/:id/deploy', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { reason = 'manual', triggeredBy = 'admin' } = req.body

    const projectConfig = new ProjectConfig(id)
    const project = projectConfig.read()

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Start deployment in background
    deployProjectV3(id, { reason, triggeredBy }).catch(error => {
      console.error('Deployment error:', error)
    })

    res.json({ success: true, message: 'Deployment started' })
  } catch (error) {
    console.error('Error starting deployment:', error)
    res.status(500).json({ error: 'Failed to start deployment' })
  }
})

// Start a project (without redeploying)
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    console.log(`[Start Project] Received request to start project: ${id}`)

    const projectConfig = new ProjectConfig(id)
    const project = projectConfig.read()

    if (!project) {
      console.error(`[Start Project] Project not found: ${id}`)
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    console.log(`[Start Project] Project found: ${project.name}`)

    // 启动服务器
    await startServerV3(id)

    console.log(`[Start Project] Project started successfully: ${id}`)
    res.json({
      success: true,
      message: 'Project started successfully'
    })
  } catch (error) {
    console.error(`[Start Project] Error: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start server process'
    })
  }
})

// Stop a project
router.post('/:id/stop', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    console.log(`[Stop Project] Received request to stop project: ${id}`)

    debugRunningProcesses()

    const projectConfig = new ProjectConfig(id)
    const project = projectConfig.read()

    if (!project) {
      console.error(`[Stop Project] Project not found: ${id}`)
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    console.log(`[Stop Project] Project found: ${project.name}`)
    const stopped = stopServerV3(id)

    if (stopped) {
      projectConfig.update({ status: 'stopped' })
      projectIndex.update(id, { status: 'stopped' })

      console.log(`[Stop Project] Project stopped successfully: ${id}`)
      res.json({
        success: true,
        message: 'Project stopped successfully'
      })
    } else {
      console.error(`[Stop Project] Failed to stop server: ${id}`)
      res.status(500).json({
        success: false,
        error: 'Failed to stop server process'
      })
    }
  } catch (error) {
    console.error('[Stop Project] Error:', error)
    console.error('[Stop Project] Stack:', error.stack)
    res.status(500).json({
      success: false,
      error: `Failed to stop project: ${error.message}`
    })
  }
})

// Get deployment logs for a project
router.get('/:id/logs', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const { deploymentId } = req.query

    const logs = getDeploymentLogs(id, deploymentId)
    res.json({ logs })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// SSE: Real-time log streaming
router.get('/:id/logs/stream', (req, res) => {
  const { id } = req.params
  const { token } = req.query

  // 从 URL 参数验证 token（因为 EventSource 不支持自定义 headers）
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  // 验证 token
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲

  // 发送初始连接成功消息
  res.write('data: {"type":"connected","message":"Log stream connected"}\n\n')

  // 订阅日志
  subscribeToLogs(id, res)

  // 发送历史日志（可选，如果需要在连接时发送最近的日志）
  try {
    const logs = getDeploymentLogs(id)
    if (logs && logs.length > 0) {
      // 只发送最近10条日志
      const recentLogs = logs.slice(-10)
      for (const log of recentLogs) {
        const data = JSON.stringify(log)
        res.write(`data: ${data}\n\n`)
      }
    }
  } catch (error) {
    console.error('Error sending historical logs:', error)
  }

  // 保持连接，直到客户端断开
  req.on('close', () => {
    console.log(`[SSE] Client disconnected from project ${id}`)
  })
})

// 获取项目的部署历史
router.get('/:id/deployments', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const history = getDeploymentHistory(id)
    res.json({ deployments: history })
  } catch (error) {
    console.error('Error fetching deployment history:', error)
    res.status(500).json({ error: 'Failed to fetch deployment history' })
  }
})

// SSE: Real-time deployment history stream
router.get('/:id/deployments/stream', (req, res) => {
  const { id } = req.params
  const { token } = req.query

  // 验证 token
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 发送连接成功消息
  res.write('data: {"type":"connected","message":"Deployment history stream connected"}\n\n')

  // 订阅部署历史
  subscribeToDeploymentHistory(id, res)

  // 保持连接
  req.on('close', () => {
    console.log(`[SSE] Deployment history client disconnected from ${id}`)
  })
})

// Get environment variables
router.get('/:id/env', authMiddleware, (req, res) => {
  try {
    const { id } = req.params

    // EnvironmentVars now supports project ID directly
    const envVars = new EnvironmentVars(id)
    const vars = envVars.read()

    res.json({ env: vars })
  } catch (error) {
    console.error('Error fetching env vars:', error)
    res.status(500).json({ error: 'Failed to fetch environment variables' })
  }
})

// Update environment variables
router.put('/:id/env', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const { env } = req.body

    // EnvironmentVars now supports project ID directly
    const envVars = new EnvironmentVars(id)
    envVars.write(env)

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating env vars:', error)
    res.status(500).json({ error: 'Failed to update environment variables' })
  }
})

export default router
