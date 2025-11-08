import { mainConfig } from './config.js'
import { hashPassword } from './auth.js'

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
      dataDir: 'SPages',
      maxProjects: 50,
      nodeVersions: [],
      cleanupOldBuilds: true,
      maxBuildAge: 30 // days
    }
  }

  mainConfig.write(config)
  console.log('Application initialized successfully!')
}
