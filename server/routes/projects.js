import express from 'express'
import { projectsConfig } from '../utils/config.js'
import { authMiddleware } from '../utils/auth.js'
import { deployProjectV2, stopServerV2, getDeploymentLogs } from '../services/deployment-v2.js'
import net from 'net'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// Check if project name is available
router.get('/check-name/:name', authMiddleware, (req, res) => {
  try {
    const { name } = req.params
    console.log(`Checking project name: "${name}"`)

    const projects = projectsConfig.read()
    console.log(`Existing projects:`, Object.keys(projects))
    console.log(`Existing project names:`, Object.values(projects).map(p => p.name))

    // Check if name already exists
    const exists = Object.values(projects).some(p => p.name === name)
    console.log(`Name "${name}" exists:`, exists)
    console.log(`Returning available:`, !exists)

    res.json({ available: !exists })
  } catch (error) {
    console.error('Error checking project name:', error)
    res.status(500).json({ error: 'Failed to check project name' })
  }
})

// Check if port is available
router.get('/check-port/:port', authMiddleware, (req, res) => {
  try {
    const port = parseInt(req.params.port)

    console.log(`Checking port ${port}`)

    if (port < 1024 || port > 65535) {
      console.log(`Port ${port} invalid range`)
      return res.json({ available: false, error: 'Invalid port range' })
    }

    const projects = projectsConfig.read()

    // Check if port is used by any existing project
    const portInUse = Object.values(projects).some(p => p.port === port)

    if (portInUse) {
      console.log(`Port ${port} in use by project`)
      return res.json({ available: false })
    }

    console.log(`Port ${port} available`)
    // Simplified: Only check project config, not system ports
    // System port check can be unreliable on some platforms
    res.json({ available: true })
  } catch (error) {
    console.error('Error checking port:', error)
    res.status(500).json({ error: 'Failed to check port' })
  }
})

// Get next available port
router.get('/next-available-port', authMiddleware, (req, res) => {
  try {
    const projects = projectsConfig.read()
    const usedPorts = Object.values(projects).map(p => p.port)

    // Start from 3001 and find the first available port
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

// Get all projects
router.get('/', authMiddleware, (req, res) => {
  try {
    const projects = projectsConfig.read()
    const projectList = Object.values(projects)
    res.json(projectList)
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Get single project
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const projects = projectsConfig.read()
    const project = projects[id]

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// Create new project
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, accountId, repository, owner, repo, branch, port } = req.body

    // Validate required fields
    if (!name || !accountId || !repository || !owner || !repo || !branch || !port) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const projects = projectsConfig.read()

    // Check if name already exists
    const nameExists = Object.values(projects).some(p => p.name === name)
    if (nameExists) {
      return res.status(400).json({ error: 'Project name already exists' })
    }

    // Check if port is already in use
    const portInUse = Object.values(projects).some(p => p.port === port)
    if (portInUse) {
      return res.status(400).json({ error: 'Port already in use' })
    }

    // Create project ID
    const projectId = `proj_${Date.now()}`

    // Create project object
    const project = {
      id: projectId,
      name,
      accountId,
      repository,
      owner,
      repo,
      branch,
      port,
      status: 'pending', // pending, building, running, stopped, failed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Save project
    projects[projectId] = project
    projectsConfig.write(projects)

    // TODO: Trigger initial deployment
    // This is where you would:
    // 1. Clone the repository
    // 2. Install dependencies
    // 3. Build the project
    // 4. Start the server

    res.json(project)
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

    const projects = projectsConfig.read()
    const project = projects[id]

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Update project
    projects[id] = {
      ...project,
      ...updates,
      id, // Preserve ID
      createdAt: project.createdAt, // Preserve creation time
      updatedAt: new Date().toISOString()
    }

    projectsConfig.write(projects)

    res.json(projects[id])
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Delete project
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const projects = projectsConfig.read()

    if (!projects[id]) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const project = projects[id]

    // Stop the running project before deleting
    stopServerV2(id)

    // Delete project files from disk
    const projectPath = path.join(process.cwd(), 'projects', project.name)
    if (fs.existsSync(projectPath)) {
      console.log(`Deleting project files: ${projectPath}`)
      fs.rmSync(projectPath, { recursive: true, force: true })
    }

    // Delete project from config
    delete projects[id]
    projectsConfig.write(projects)

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// Deploy a project
router.post('/:id/deploy', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const projects = projectsConfig.read()

    if (!projects[id]) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Start deployment in background
    deployProjectV2(id).catch(error => {
      console.error('Deployment error:', error)
    })

    res.json({ success: true, message: 'Deployment started' })
  } catch (error) {
    console.error('Error starting deployment:', error)
    res.status(500).json({ error: 'Failed to start deployment' })
  }
})

// Stop a project
router.post('/:id/stop', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const projects = projectsConfig.read()

    if (!projects[id]) {
      return res.status(404).json({ error: 'Project not found' })
    }

    stopServerV2(id)

    res.json({ success: true, message: 'Project stopped' })
  } catch (error) {
    console.error('Error stopping project:', error)
    res.status(500).json({ error: 'Failed to stop project' })
  }
})

// Get deployment logs for a project
router.get('/:id/logs', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const logs = getDeploymentLogs(id)

    res.json({ logs })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

export default router
