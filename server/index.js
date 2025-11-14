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

// 生产环境下提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist')
  app.use(express.static(distPath))

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
  console.log('Backend is only accessible via localhost (not exposed to internet)')
  console.log('Access via frontend proxy: http://localhost:5173')
})
