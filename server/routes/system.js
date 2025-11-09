import express from 'express'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 获取系统信息
 * GET /api/system/info
 */
router.get('/info', (req, res) => {
  try {
    // 获取数据目录路径
    const dataDir = path.resolve(process.cwd(), 'data')
    
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
        platform: platformString,
        dataDir
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

export default router
