import express from 'express'
import os from 'os'
import path from 'path'
import { authMiddleware } from '../utils/auth.js'

const router = express.Router()

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
    
    // 组合平台字符串
    const platformString = `${platformName} (${os.arch()})`
    
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

export default router
