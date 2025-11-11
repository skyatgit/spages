import express from 'express'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { authMiddleware } from '../utils/auth.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 获取所有可用的网络接口 IP 地址
 */
router.get('/network-interfaces', authMiddleware, (req, res) => {
  try {
    const interfaces = os.networkInterfaces()
    const ipList = []

    // 添加 localhost
    ipList.push({
      name: 'localhost',
      address: 'localhost',
      family: 'IPv4',
      internal: true,
      description: '本机访问'
    })

    // 遍历所有网络接口
    for (const [name, ifaces] of Object.entries(interfaces)) {
      for (const iface of ifaces) {
        // 只返回 IPv4 地址
        if (iface.family === 'IPv4') {
          ipList.push({
            name: name,
            address: iface.address,
            family: iface.family,
            internal: iface.internal,
            description: iface.internal ? '内部地址' : '局域网地址'
          })
        }
      }
    }

    res.json({ interfaces: ipList })
  } catch (error) {
    console.error('Error fetching network interfaces:', error)
    res.status(500).json({ error: 'Failed to fetch network interfaces' })
  }
})

/**
 * 递归计算目录大小（以字节为单位）
 */
function getDirectorySize(dirPath) {
  let totalSize = 0

  try {
    if (!fs.existsSync(dirPath)) {
      return 0
    }

    const files = fs.readdirSync(dirPath)

    for (const file of files) {
      const filePath = path.join(dirPath, file)
      try {
        const stats = fs.statSync(filePath)

        if (stats.isDirectory()) {
          totalSize += getDirectorySize(filePath)
        } else {
          totalSize += stats.size
        }
      } catch (error) {
        // Skip files that can't be accessed
        console.warn(`Could not access ${filePath}:`, error.message)
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}:`, error.message)
  }

  return totalSize
}

/**
 * 将字节转换为 MB，保留两位小数
 */
function bytesToMB(bytes) {
  return parseFloat((bytes / (1024 * 1024)).toFixed(2))
}

/**
 * 获取系统信息
 * GET /api/system/info
 */
router.get('/info', (req, res) => {
  try {
    // 获取平台信息
    const platform = os.platform()
    const platformName = {
      'win32': 'Windows',
      'darwin': 'macOS',
      'linux': 'Linux'
    }[platform] || platform
    
    // 获取 OS 版本
    const osVersion = os.release()
    const arch = os.arch()
    
    // 组合平台字符串
    const platformString = `${platformName} (${arch})`
    
    // 获取 Node.js 版本
    const nodeVersion = process.version
    
    // 获取应用版本（从 package.json）
    let appVersion = '0.1.0'
    try {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageJson = require(packagePath)
      appVersion = packageJson.version || '0.1.0'
    } catch (error) {
      console.warn('Could not read package.json version:', error.message)
    }
    
    res.json({
      success: true,
      data: {
        appVersion,
        nodeVersion,
        platform: platformString
      }
    })
  } catch (error) {
    console.error('Get system info error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get system information'
    })
  }
})

/**
 * 获取存储信息
 * GET /api/system/storage
 */
router.get('/storage', authMiddleware, (req, res) => {
  try {
    const projectsDir = path.resolve(process.cwd(), 'projects')
    const dataDir = path.resolve(process.cwd(), 'data')

    // Calculate projects directory size
    const projectsSize = bytesToMB(getDirectorySize(projectsDir))

    // Calculate dependencies size (node_modules)
    let dependenciesSize = 0
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)
      for (const project of projects) {
        const sourcePath = path.join(projectsDir, project, 'source')
        const nodeModulesPath = path.join(sourcePath, 'node_modules')
        dependenciesSize += getDirectorySize(nodeModulesPath)
      }
    }
    dependenciesSize = bytesToMB(dependenciesSize)

    // Calculate build cache size (真正的构建缓存)
    let cacheSize = 0
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)
      for (const project of projects) {
        const sourcePath = path.join(projectsDir, project, 'source')

        // 只统计真正的缓存文件
        const cachePath = path.join(sourcePath, '.cache')
        const nextPath = path.join(sourcePath, '.next')
        const nuxtPath = path.join(sourcePath, '.nuxt')
        const viteCache = path.join(sourcePath, 'node_modules', '.vite')
        const turboCache = path.join(sourcePath, '.turbo')

        cacheSize += getDirectorySize(cachePath)
        cacheSize += getDirectorySize(nextPath)
        cacheSize += getDirectorySize(nuxtPath)
        cacheSize += getDirectorySize(viteCache)
        cacheSize += getDirectorySize(turboCache)
      }
    }
    cacheSize = bytesToMB(cacheSize)

    // Calculate logs size
    let logsSize = 0
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)
      for (const project of projects) {
        // 日志在 .spages/logs 目录下
        const logsPath = path.join(projectsDir, project, '.spages', 'logs')
        logsSize += getDirectorySize(logsPath)
      }
    }
    // Also check for any global logs
    const globalLogsPath = path.resolve(process.cwd(), 'logs')
    logsSize += getDirectorySize(globalLogsPath)
    logsSize = bytesToMB(logsSize)

    // Total (projects includes everything, so we need to subtract dependencies, cache and logs to avoid double counting)
    const total = projectsSize
    const projectsDataOnly = total - dependenciesSize - cacheSize - logsSize

    res.json({
      success: true,
      data: {
        projects: parseFloat(Math.max(0, projectsDataOnly).toFixed(2)),
        dependencies: parseFloat(dependenciesSize.toFixed(2)),
        cache: parseFloat(cacheSize.toFixed(2)),
        logs: parseFloat(logsSize.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      }
    })
  } catch (error) {
    console.error('Get storage info error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get storage information'
    })
  }
})

/**
 * 清空构建缓存
 * POST /api/system/clear-cache
 */
router.post('/clear-cache', authMiddleware, (req, res) => {
  try {
    const projectsDir = path.resolve(process.cwd(), 'projects')
    let clearedSize = 0
    let clearedCount = 0

    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)

      for (const project of projects) {
        const sourcePath = path.join(projectsDir, project, 'source')

        // 只清理真正的构建缓存（不包括 node_modules）
        // Clear .cache
        const cachePath = path.join(sourcePath, '.cache')
        if (fs.existsSync(cachePath)) {
          const size = getDirectorySize(cachePath)
          fs.rmSync(cachePath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }

        // Clear .next (Next.js)
        const nextPath = path.join(sourcePath, '.next')
        if (fs.existsSync(nextPath)) {
          const size = getDirectorySize(nextPath)
          fs.rmSync(nextPath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }

        // Clear .nuxt (Nuxt.js)
        const nuxtPath = path.join(sourcePath, '.nuxt')
        if (fs.existsSync(nuxtPath)) {
          const size = getDirectorySize(nuxtPath)
          fs.rmSync(nuxtPath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }

        // Clear node_modules/.vite (Vite cache)
        const viteCachePath = path.join(sourcePath, 'node_modules', '.vite')
        if (fs.existsSync(viteCachePath)) {
          const size = getDirectorySize(viteCachePath)
          fs.rmSync(viteCachePath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }

        // Clear .turbo (Turbo cache)
        const turboPath = path.join(sourcePath, '.turbo')
        if (fs.existsSync(turboPath)) {
          const size = getDirectorySize(turboPath)
          fs.rmSync(turboPath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }
      }
    }

    res.json({
      success: true,
      data: {
        clearedSize: bytesToMB(clearedSize),
        clearedCount
      },
      message: `Cleared ${clearedCount} cache directories, freed ${bytesToMB(clearedSize)} MB`
    })
  } catch (error) {
    console.error('Clear cache error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    })
  }
})

/**
 * 清空日志
 * POST /api/system/clear-logs
 */
router.post('/clear-logs', authMiddleware, (req, res) => {
  try {
    const projectsDir = path.resolve(process.cwd(), 'projects')
    let clearedSize = 0
    let clearedCount = 0

    // Clear project logs
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)

      for (const project of projects) {
        // 日志在 .spages/logs 目录下
        const logsPath = path.join(projectsDir, project, '.spages', 'logs')
        if (fs.existsSync(logsPath)) {
          const size = getDirectorySize(logsPath)

          // Clear all log files in the directory
          const logFiles = fs.readdirSync(logsPath)
          for (const logFile of logFiles) {
            const logFilePath = path.join(logsPath, logFile)
            try {
              fs.unlinkSync(logFilePath)
              clearedCount++
            } catch (err) {
              console.warn(`Could not delete log file ${logFilePath}:`, err.message)
            }
          }

          clearedSize += size
        }
      }
    }

    // Clear global logs
    const globalLogsPath = path.resolve(process.cwd(), 'logs')
    if (fs.existsSync(globalLogsPath)) {
      const size = getDirectorySize(globalLogsPath)
      const logFiles = fs.readdirSync(globalLogsPath)

      for (const logFile of logFiles) {
        const logFilePath = path.join(globalLogsPath, logFile)
        try {
          fs.unlinkSync(logFilePath)
          clearedCount++
        } catch (err) {
          console.warn(`Could not delete log file ${logFilePath}:`, err.message)
        }
      }

      clearedSize += size
    }

    res.json({
      success: true,
      data: {
        clearedSize: bytesToMB(clearedSize),
        clearedCount
      },
      message: `Cleared ${clearedCount} log files, freed ${bytesToMB(clearedSize)} MB`
    })
  } catch (error) {
    console.error('Clear logs error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear logs'
    })
  }
})

/**
 * 清空依赖包 (node_modules)
 * POST /api/system/clear-dependencies
 */
router.post('/clear-dependencies', authMiddleware, (req, res) => {
  try {
    const projectsDir = path.resolve(process.cwd(), 'projects')
    let clearedSize = 0
    let clearedCount = 0

    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)

      for (const project of projects) {
        const sourcePath = path.join(projectsDir, project, 'source')
        const nodeModulesPath = path.join(sourcePath, 'node_modules')

        if (fs.existsSync(nodeModulesPath)) {
          const size = getDirectorySize(nodeModulesPath)
          fs.rmSync(nodeModulesPath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }
      }
    }

    res.json({
      success: true,
      data: {
        clearedSize: bytesToMB(clearedSize),
        clearedCount
      },
      message: `Cleared ${clearedCount} node_modules directories, freed ${bytesToMB(clearedSize)} MB`
    })
  } catch (error) {
    console.error('Clear dependencies error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear dependencies'
    })
  }
})

export default router
