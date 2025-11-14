import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 项目目录结构管理
 *
 * 目录结构：
 * backend/projects/
 *   ├── {projectName}/
 *   │   ├── .spages/
 *   │   │   ├── config.json          # 项目配置
 *   │   │   ├── deployments.json     # 部署历史
 *   │   │   ├── env.json              # 环境变量
 *   │   │   └── logs/                 # 部署日志
 *   │   │       ├── deploy_xxx.log
 *   │   └── source/                   # 源码目录
 *   │       ├── src/
 *   │       ├── package.json
 *   │       └── ...
 */

// 从 backend/server/services/ 向上两级到 backend/
const PROJECTS_DIR = path.resolve(__dirname, '../..', 'projects')
const INDEX_FILE = path.resolve(__dirname, '../..', 'data', 'projects-index.json')

// 确保目录存在
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true })
}

/**
 * 项目路径管理类
 */
export class ProjectPaths {
  constructor(projectName) {
    this.projectName = projectName
    this.root = path.join(PROJECTS_DIR, projectName)
    this.spages = path.join(this.root, '.spages')
    this.source = path.join(this.root, 'source')
    this.logs = path.join(this.spages, 'logs')

    // 配置文件路径
    this.config = path.join(this.spages, 'config.json')
    this.deployments = path.join(this.spages, 'deployments.json')
    this.env = path.join(this.spages, 'env.json')

    // 如果已存在配置，且包含自定义源码根目录（sourceRoot），则覆盖默认的 source 路径
    try {
      if (fs.existsSync(this.config)) {
        const cfg = JSON.parse(fs.readFileSync(this.config, 'utf-8'))
        if (cfg && cfg.sourceRoot && typeof cfg.sourceRoot === 'string') {
          this.source = path.isAbsolute(cfg.sourceRoot)
            ? cfg.sourceRoot
            : path.join(process.cwd(), cfg.sourceRoot)
        }
      }
    } catch (e) {
      console.warn('[ProjectPaths] Failed to read config for sourceRoot override:', e.message)
    }
  }

  /**
   * 初始化项目目录结构
   */
  init() {
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root, { recursive: true })
    }
    if (!fs.existsSync(this.spages)) {
      fs.mkdirSync(this.spages, { recursive: true })
    }
    if (!fs.existsSync(this.logs)) {
      fs.mkdirSync(this.logs, { recursive: true })
    }
    if (!fs.existsSync(this.source)) {
      fs.mkdirSync(this.source, { recursive: true })
    }

    // 初始化空配置文件
    if (!fs.existsSync(this.config)) {
      fs.writeFileSync(this.config, JSON.stringify({}, null, 2))
    }
    if (!fs.existsSync(this.deployments)) {
      fs.writeFileSync(this.deployments, JSON.stringify({ current: null, history: [] }, null, 2))
    }
    if (!fs.existsSync(this.env)) {
      fs.writeFileSync(this.env, JSON.stringify({}, null, 2))
    }
  }

  /**
   * 检查项目目录是否存在
   */
  exists() {
    return fs.existsSync(this.root) && fs.existsSync(this.config)
  }

  /**
   * 删除整个项目目录
   */
  remove() {
    if (!fs.existsSync(this.root)) {
      return
    }

    // 尝试删除，如果失败则重试（Windows 文件占用问题）
    let retries = 3
    let lastError = null

    while (retries > 0) {
      try {
        fs.rmSync(this.root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
        console.log(`[ProjectPaths] Successfully deleted: ${this.root}`)
        return
      } catch (error) {
        lastError = error
        retries--
        if (retries > 0) {
          console.warn(`[ProjectPaths] Delete failed, retrying... (${retries} attempts left)`)
          // 等待一下再重试
          const sleepMs = 500
          const start = Date.now()
          while (Date.now() - start < sleepMs) {
            // 忙等待
          }
        }
      }
    }

    // 所有重试都失败了
    console.error(`[ProjectPaths] Failed to delete after all retries: ${this.root}`, lastError)
    throw new Error(`Failed to delete project directory: ${lastError.message}`)
  }
}

/**
 * 根据项目ID获取项目名称
 */
function getProjectNameById(projectId) {
  try {
    console.log('[getProjectNameById] Looking for project:', projectId)
    console.log('[getProjectNameById] Index file:', INDEX_FILE)

    if (!fs.existsSync(INDEX_FILE)) {
      console.error('[getProjectNameById] Index file does not exist!')
      return null
    }

    const indexData = fs.readFileSync(INDEX_FILE, 'utf-8')
    const index = JSON.parse(indexData)
    console.log('[getProjectNameById] Available projects in index:', Object.keys(index))

    const project = index[projectId]

    if (project) {
      console.log('[getProjectNameById] Found project in index:', project.name)
      return project.name
    }

    console.log('[getProjectNameById] Project not found in index, scanning directories...')

    // 如果索引中没有，扫描 projects 目录
    if (fs.existsSync(PROJECTS_DIR)) {
      const dirs = fs.readdirSync(PROJECTS_DIR)
      console.log('[getProjectNameById] Directories found:', dirs)

      for (const dir of dirs) {
        const configPath = path.join(PROJECTS_DIR, dir, '.spages', 'config.json')
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          console.log(`[getProjectNameById] Checking ${dir}: ID=${config.id}`)
          if (config.id === projectId) {
            console.log('[getProjectNameById] Found matching project:', config.name)
            return config.name
          }
        }
      }
    }

    console.error('[getProjectNameById] Project not found:', projectId)
    return null
  } catch (error) {
    console.error('[getProjectNameById] Error:', error)
    return null
  }
}

/**
 * 项目配置管理
 */
export class ProjectConfig {
  constructor(projectIdOrName) {
    // 如果是项目ID（格式：proj_xxx），先转换为项目名称
    if (projectIdOrName && projectIdOrName.startsWith('proj_')) {
      const projectName = getProjectNameById(projectIdOrName)
      if (!projectName) {
        console.error(`Project not found: ${projectIdOrName}`)
        this.paths = null
        this.projectName = null
        return
      }
      this.paths = new ProjectPaths(projectName)
      this.projectName = projectName
    } else {
      this.paths = new ProjectPaths(projectIdOrName)
      this.projectName = projectIdOrName
    }
  }

  /**
   * 读取项目配置
   */
  read() {
    try {
      if (!this.paths || !fs.existsSync(this.paths.config)) {
        return null
      }
      const data = fs.readFileSync(this.paths.config, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading project config:', error)
      return null
    }
  }

  /**
   * 写入项目配置
   */
  write(config) {
    try {
      config.updatedAt = new Date().toISOString()
      fs.writeFileSync(this.paths.config, JSON.stringify(config, null, 2))
      return true
    } catch (error) {
      console.error('Error writing project config:', error)
      return false
    }
  }

  /**
   * 更新配置字段
   */
  update(updates) {
    const config = this.read()
    if (!config) return false

    Object.assign(config, updates)
    return this.write(config)
  }
}

/**
 * 部署历史管理
 */
export class DeploymentHistory {
  constructor(projectIdOrName) {
    // 如果是项目ID，先转换为项目名称
    if (projectIdOrName && projectIdOrName.startsWith('proj_')) {
      const projectName = getProjectNameById(projectIdOrName)
      if (!projectName) {
        console.error(`Project not found: ${projectIdOrName}`)
        this.paths = null
        return
      }
      this.paths = new ProjectPaths(projectName)
    } else {
      this.paths = new ProjectPaths(projectIdOrName)
    }
  }

  /**
   * 读取部署历史
   */
  read() {
    try {
      if (!this.paths || !fs.existsSync(this.paths.deployments)) {
        return { current: null, history: [] }
      }
      const data = fs.readFileSync(this.paths.deployments, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading deployment history:', error)
      return { current: null, history: [] }
    }
  }

  /**
   * 写入部署历史
   */
  write(data) {
    try {
      fs.writeFileSync(this.paths.deployments, JSON.stringify(data, null, 2))
      return true
    } catch (error) {
      console.error('Error writing deployment history:', error)
      return false
    }
  }

  /**
   * 添加部署记录
   */
  add(deployment) {
    const data = this.read()
    data.history.unshift(deployment) // 最新的在前面
    data.current = deployment.id

    // 只保留最近50次部署历史
    if (data.history.length > 50) {
      data.history = data.history.slice(0, 50)
    }

    return this.write(data)
  }

  /**
   * 更新部署状态
   */
  updateStatus(deploymentId, updates) {
    const data = this.read()
    const deployment = data.history.find(d => d.id === deploymentId)

    if (deployment) {
      Object.assign(deployment, updates)
      return this.write(data)
    }

    return false
  }

  /**
   * 获取最新部署
   */
  getLatest() {
    const data = this.read()
    return data.history[0] || null
  }
}

/**
 * 环境变量管理
 */
export class EnvironmentVars {
  constructor(projectIdOrName) {
    // 如果是项目ID，先转换为项目名称
    if (projectIdOrName && projectIdOrName.startsWith('proj_')) {
      const projectName = getProjectNameById(projectIdOrName)
      if (!projectName) {
        console.error(`Project not found: ${projectIdOrName}`)
        this.paths = null
        return
      }
      this.paths = new ProjectPaths(projectName)
    } else {
      this.paths = new ProjectPaths(projectIdOrName)
    }
  }

  /**
   * 读取环境变量
   */
  read() {
    try {
      if (!this.paths || !fs.existsSync(this.paths.env)) {
        return {}
      }
      const data = fs.readFileSync(this.paths.env, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading env vars:', error)
      return {}
    }
  }

  /**
   * 写入环境变量
   */
  write(vars) {
    try {
      fs.writeFileSync(this.paths.env, JSON.stringify(vars, null, 2))
      return true
    } catch (error) {
      console.error('Error writing env vars:', error)
      return false
    }
  }

  /**
   * 设置单个环境变量
   */
  set(key, value) {
    const vars = this.read()
    vars[key] = value
    return this.write(vars)
  }

  /**
   * 删除环境变量
   */
  delete(key) {
    const vars = this.read()
    delete vars[key]
    return this.write(vars)
  }
}

/**
 * 项目索引管理器
 */
export class ProjectIndexManager {
  constructor() {
    this.indexPath = INDEX_FILE
    this.projectsDir = PROJECTS_DIR
    this.syncInterval = null
    this.ensureIndex()
  }

  /**
   * 确保索引文件存在
   */
  ensureIndex() {
    if (!fs.existsSync(this.indexPath)) {
      fs.writeFileSync(this.indexPath, JSON.stringify({}, null, 2))
    }
  }

  /**
   * 启动定时同步
   */
  startSync(interval = 30000) {
    console.log('Starting project index sync...')
    this.sync() // 立即同步一次
    this.syncInterval = setInterval(() => this.sync(), interval)
  }

  /**
   * 停止同步
   */
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * 同步项目索引
   */
  async sync() {
    console.log('[ProjectIndex] Syncing projects...')
    const projects = {}

    try {
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true })
        fs.writeFileSync(this.indexPath, JSON.stringify({}, null, 2))
        return
      }

      const dirs = fs.readdirSync(this.projectsDir)

      for (const dir of dirs) {
        const configPath = path.join(this.projectsDir, dir, '.spages', 'config.json')

        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

            // 只存储必要的索引信息
            projects[config.id] = {
              name: config.name,
              path: `projects/${dir}`,
              port: config.port,
              status: config.status || 'stopped',
              lastDeploy: config.lastDeploy || null,
              repository: config.repository,
              branch: config.branch,
              url: config.url || null,
              updatedAt: config.updatedAt,
              type: config.type || null,
              managed: config.managed === true,
              mode: config.mode || null
            }
          } catch (error) {
            console.error(`Failed to read config for ${dir}:`, error)
          }
        }
      }

      fs.writeFileSync(this.indexPath, JSON.stringify(projects, null, 2))
      console.log(`[ProjectIndex] Synced ${Object.keys(projects).length} projects`)
    } catch (error) {
      console.error('[ProjectIndex] Failed to sync:', error)
    }
  }

  /**
   * 读取所有项目索引
   */
  getAll() {
    try {
      const data = fs.readFileSync(this.indexPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading index:', error)
      return {}
    }
  }

  /**
   * 获取单个项目索引
   */
  get(projectId) {
    const index = this.getAll()
    return index[projectId] || null
  }

  /**
   * 更新项目索引
   */
  update(projectId, data) {
    const index = this.getAll()
    index[projectId] = {
      ...index[projectId],
      ...data,
      updatedAt: new Date().toISOString()
    }
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2))
  }

  /**
   * 删除项目索引
   */
  delete(projectId) {
    const index = this.getAll()
    delete index[projectId]
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2))
  }
}

/**
 * 获取全局索引管理器实例
 */
export const projectIndex = new ProjectIndexManager()