import express from 'express'
import { mainConfig } from '../utils/config.js'
import { verifyPassword, generateToken, hashPassword } from '../utils/auth.js'

const router = express.Router()

/**
 * 登录接口
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      })
    }

    // 获取管理员配置
    const config = mainConfig.read()
    const admin = config.admin

    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'Admin account not configured'
      })
    }

    // 验证用户名
    if (username !== admin.username) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      })
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, admin.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      })
    }

    // 生成token
    const token = generateToken({
      username: admin.username,
      role: 'admin'
    })

    res.json({
      success: true,
      data: {
        token,
        username: admin.username
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * 修改密码接口
 * POST /api/auth/change-password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // 验证输入
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      })
    }

    // 获取管理员配置
    const config = mainConfig.read()
    const admin = config.admin

    // 验证当前密码
    const isPasswordValid = await verifyPassword(currentPassword, admin.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // 生成新密码哈希
    const hashedPassword = await hashPassword(newPassword)

    // 更新配置
    config.admin.password = hashedPassword
    config.admin.updatedAt = new Date().toISOString()
    mainConfig.write(config)

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * 修改用户名接口
 * POST /api/auth/change-username
 */
router.post('/change-username', async (req, res) => {
  try {
    const { newUsername } = req.body

    // 验证输入
    if (!newUsername) {
      return res.status(400).json({
        success: false,
        message: 'New username is required'
      })
    }

    if (newUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      })
    }

    // 获取管理员配置
    const config = mainConfig.read()

    // 更新用户名
    config.admin.username = newUsername
    config.admin.updatedAt = new Date().toISOString()
    mainConfig.write(config)

    res.json({
      success: true,
      message: 'Username changed successfully',
      data: {
        username: newUsername
      }
    })
  } catch (error) {
    console.error('Change username error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * 验证token接口
 * GET /api/auth/verify
 */
router.get('/verify', (req, res) => {
  // 这个接口会通过authMiddleware自动验证token
  res.json({
    success: true,
    data: {
      username: req.user.username,
      role: req.user.role
    }
  })
})

export default router
