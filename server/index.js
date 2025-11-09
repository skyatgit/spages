import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initApp } from './utils/init.js'
import authRoutes from './routes/auth.js'
import githubRoutes from './routes/github.js'
import projectsRoutes from './routes/projects-v3.js'
import systemRoutes from './routes/system.js'
import { authMiddleware } from './utils/auth.js'
import { projectIndex } from './services/project-manager.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// Initialize application
await initApp()

// Start project index sync (every 30 seconds)
projectIndex.startSync(30000)
console.log('Project index sync started')

// Middleware
app.use(cors())
app.use(express.json())

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/github', githubRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/system', systemRoutes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist')
  app.use(express.static(distPath))

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
