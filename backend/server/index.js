import express from 'express'
import cors from 'cors'
import { initApp } from './utils/init.js'
import authRoutes from './routes/auth.js'
import githubRoutes from './routes/github.js'
import projectsRoutes from './routes/projects-v3.js'
import systemRoutes from './routes/system.js'
import { projectIndex } from './services/project-manager.js'
import { mainConfig } from './utils/config.js'
import { deployProjectV3 } from './services/deployment-v3.js'

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

app.listen(PORT, HOST, async () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
  console.log('Backend is only accessible via localhost (not exposed to internet)')
  console.log('[Startup] Auto-deploying system frontend using full pipeline (skip clone, use runtime Node)...')

  // 自动部署系统前端：完整流程（检测框架、使用runtime Node、安装依赖、构建、启动）
  try {
    const config = mainConfig.read()
    const frontendId = config.frontend?.projectId || 'proj_spages_frontend'
    
    console.log(`[Startup] Deploying system frontend: ${frontendId}`)
    
    // deployProjectV3 会执行完整流程：
    // - 跳过克隆（type=core）
    // - 检测框架
    // - 检测并安装 Node 版本（runtime）
    // - npm install（使用 runtime Node）
    // - npm run build（使用 runtime Node）
    // - 启动静态服务器
    await deployProjectV3(frontendId, { 
      reason: 'system-auto-start', 
      triggeredBy: 'backend-startup' 
    })
    
    console.log(`[Startup] ✅ System frontend deployed and started successfully`)
  } catch (error) {
    console.error(`[Startup] ⚠️  Failed to auto-deploy system frontend: ${error.message}`)
    console.log(`[Startup] You can manually deploy it later via the UI`)
  }
})
