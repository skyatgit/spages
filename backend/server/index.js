import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initApp } from './utils/init.js'
import authRoutes from './routes/auth.js'
import githubRoutes from './routes/github.js'
import projectsRoutes from './routes/projects-v3.js'
import systemRoutes from './routes/system.js'
import { projectIndex, ProjectConfig } from './services/project-manager.js'
import { mainConfig } from './utils/config.js'
import { startServerV3, deployProjectV3 } from './services/deployment-v3.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost' // 只监听 localhost，不暴露到外网

// 初始化应用
await initApp()

// 启动项目索引同步（每 30 秒）
projectIndex.startSync(30000)
console.log('Project index sync started')

// 中间件
app.use(cors())
app.use(express.json())

// API 路由
app.use('/api/auth', authRoutes)
app.use('/api/github', githubRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/system', systemRoutes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// 注意：不再在此处提供生产模式静态托管，前端交由"系统前端项目"受管托管

app.listen(PORT, HOST, async () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
  console.log('Backend is only accessible via localhost (not exposed to internet)')
  console.log('Note: Frontend should be started separately using npm run dev in the frontend directory')

  // 前后端分离后，不再自动启动前端
  // 用户应该手动启动前端：cd frontend && npm run dev
  console.log('[Info] Please start frontend manually: cd frontend && npm run dev')
})