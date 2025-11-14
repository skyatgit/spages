import { mainConfig } from './config.js'
import { hashPassword } from './auth.js'
import { projectIndex, ProjectPaths, ProjectConfig } from '../services/project-manager.js'

/**
 * 初始化默认管理员账号
 */
export async function initDefaultAdmin() {
  const config = mainConfig.read()

  // 如果已经存在管理员配置，则不需要初始化
  if (config.admin && config.admin.username) {
    console.log('Admin account already exists')
    return
  }

  // 创建默认管理员账号: admin/admin
  const defaultUsername = 'admin'
  const defaultPassword = 'admin'
  const hashedPassword = await hashPassword(defaultPassword)

  config.admin = {
    username: defaultUsername,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  mainConfig.write(config)
  console.log('Default admin account created: admin/admin')
  console.log('⚠️  Please change the default password after first login!')
}

/**
 * 初始化系统前端受管项目（如果不存在则创建占位配置）
 */
function ensureSystemFrontendProject() {
  try {
    const config = mainConfig.read()

    // 前端受管默认配置
    if (!config.frontend) {
      config.frontend = {
        projectId: 'proj_spages_frontend',
        defaultPort: 5173,
        autoRestart: true
      }
      mainConfig.write(config)
      console.log('[Init] Default frontend config created')
    }

    const frontendId = config.frontend.projectId || 'proj_spages_frontend'
    const index = projectIndex.getAll()

    if (!index[frontendId]) {
      // 在 projects 目录下创建一个受管占位项目 spages-frontend
      const name = 'spages-frontend'
      const paths = new ProjectPaths(name)
      paths.init()

      // 写入配置，sourceRoot 指向项目根目录的 frontend 目录（相对于 backend）
      const projectConfig = new ProjectConfig(name)
      const cfg = {
        id: frontendId,
        name,
        accountId: null,
        repository: null,
        owner: null,
        repo: null,
        branch: null,
        serverHost: null,
        port: config.frontend.defaultPort || 5173,
        buildCommand: 'npm run build',
        outputDir: 'dist',
        sourceRoot: '../frontend', // 从 backend 指向 frontend
        status: 'stopped',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastDeploy: null,
        url: null,
        nodeVersion: null,
        type: 'core',
        managed: true
      }
      projectConfig.write(cfg)

      // 更新索引
      projectIndex.update(frontendId, {
        name,
        path: `projects/${name}`,
        port: cfg.port,
        status: cfg.status,
        branch: cfg.branch,
        url: cfg.url
      })

      console.log('[Init] System frontend project created in index')
    }
  } catch (e) {
    console.error('[Init] ensureSystemFrontendProject failed:', e)
  }
}

/**
 * 初始化应用配置
 */
export async function initApp() {
  console.log('Initializing SPages application...')

  // 初始化默认管理员
  await initDefaultAdmin()

  // 初始化其他配置
  const config = mainConfig.read()

  if (!config.githubAccounts) {
    config.githubAccounts = []
  }

  if (!config.settings) {
    config.settings = {
      maxProjects: 50,
      nodeVersions: [],
      cleanupOldBuilds: true,
      maxBuildAge: 30 // 天数
    }
  }

  mainConfig.write(config)

  // 初始化系统前端受管项目
  ensureSystemFrontendProject()

  console.log('Application initialized successfully!')
}