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
 * 将字节转换为 MB
 */
function bytesToMB(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100
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

    // Calculate cache size (node_modules in all projects)
    let cacheSize = 0
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)
      for (const project of projects) {
        const nodeModulesPath = path.join(projectsDir, project, 'node_modules')
        const cachePath = path.join(projectsDir, project, '.cache')
        const distPath = path.join(projectsDir, project, 'dist')

        cacheSize += getDirectorySize(nodeModulesPath)
        cacheSize += getDirectorySize(cachePath)
        // Don't count dist as cache, it's part of project data
      }
    }
    cacheSize = bytesToMB(cacheSize)

    // Calculate logs size
    let logsSize = 0
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)
      for (const project of projects) {
        const logsPath = path.join(projectsDir, project, 'logs')
        logsSize += getDirectorySize(logsPath)
      }
    }
    // Also check for any global logs
    const globalLogsPath = path.resolve(process.cwd(), 'logs')
    logsSize += getDirectorySize(globalLogsPath)
    logsSize = bytesToMB(logsSize)

    // Total (projects includes everything, so we need to subtract cache and logs to avoid double counting)
    const total = projectsSize
    const projectsDataOnly = total - cacheSize - logsSize

    res.json({
      success: true,
      data: {
        projects: Math.max(0, projectsDataOnly),
        cache: cacheSize,
        logs: logsSize,
        total: total
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
        const projectPath = path.join(projectsDir, project)

        // Clear node_modules
        const nodeModulesPath = path.join(projectPath, 'node_modules')
        if (fs.existsSync(nodeModulesPath)) {
          const size = getDirectorySize(nodeModulesPath)
          fs.rmSync(nodeModulesPath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }

        // Clear .cache
        const cachePath = path.join(projectPath, '.cache')
        if (fs.existsSync(cachePath)) {
          const size = getDirectorySize(cachePath)
          fs.rmSync(cachePath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }

        // Clear .next (Next.js)
        const nextPath = path.join(projectPath, '.next')
        if (fs.existsSync(nextPath)) {
          const size = getDirectorySize(nextPath)
          fs.rmSync(nextPath, { recursive: true, force: true })
          clearedSize += size
          clearedCount++
        }

        // Clear .nuxt (Nuxt.js)
        const nuxtPath = path.join(projectPath, '.nuxt')
        if (fs.existsSync(nuxtPath)) {
          const size = getDirectorySize(nuxtPath)
          fs.rmSync(nuxtPath, { recursive: true, force: true })
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
        const logsPath = path.join(projectsDir, project, 'logs')
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

export default router
