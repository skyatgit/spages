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
 * 统一的凭据更新接口
 * POST /api/auth/update-credentials
 * 可以修改用户名、密码或两者
 */
router.post('/update-credentials', async (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body

    console.log('=== Update Credentials Debug ===')
    console.log('Current password provided:', currentPassword ? '(provided)' : '(empty)')
    console.log('New username provided:', newUsername || '(none)')
    console.log('New password provided:', newPassword ? '(provided)' : '(none)')

    // 1. 当前密码必填
    if (!currentPassword) {
      console.log('Validation failed: current password required')
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      })
    }

    // 2. 至少要修改用户名或密码中的一个
    if (!newUsername && !newPassword) {
      console.log('Validation failed: no new credentials provided')
      return res.status(400).json({
        success: false,
        message: 'Please provide new username or new password'
      })
    }

    // 3. 如果修改密码，验证密码长度
    if (newPassword && newPassword.length < 6) {
      console.log('Validation failed: password too short')
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      })
    }

    // 4. 如果修改用户名，验证用户名长度
    if (newUsername && newUsername.length < 3) {
      console.log('Validation failed: username too short')
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      })
    }

    // 5. 获取管理员配置
    const config = mainConfig.read()
    const admin = config.admin

    console.log('Current admin username:', admin.username)
    console.log('Stored password hash:', admin.password.substring(0, 20) + '...')

    // 6. 验证当前密码（关键步骤）
    const isPasswordValid = await verifyPassword(currentPassword, admin.password)
    console.log('Password verification result:', isPasswordValid)

    if (!isPasswordValid) {
      console.log('Authentication failed: incorrect current password')
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    console.log('✅ Current password verified successfully')

    // 7. 更新凭据
    let updated = []

    // 7.1 更新用户名（如果提供）
    if (newUsername) {
      config.admin.username = newUsername
      updated.push('username')
      console.log('Updated username to:', newUsername)
    }

    // 7.2 更新密码（如果提供）
    if (newPassword) {
      const hashedPassword = await hashPassword(newPassword)
      config.admin.password = hashedPassword
      updated.push('password')
      console.log('Updated password (hashed)')
    }

    // 8. 保存配置
    config.admin.updatedAt = new Date().toISOString()
    mainConfig.write(config)

    console.log('✅ Credentials updated successfully:', updated.join(' and '))
    console.log('=== End Debug ===')

    res.json({
      success: true,
      message: `Successfully updated ${updated.join(' and ')}`,
      data: {
        updated,
        username: config.admin.username
      }
    })
  } catch (error) {
    console.error('Update credentials error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

/**
 * 修改密码接口（保留用于兼容性）
 * POST /api/auth/change-password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    console.log('=== Change Password Debug ===')
    console.log('Current password provided:', currentPassword ? '(provided)' : '(empty)')
    console.log('New password provided:', newPassword ? '(provided)' : '(empty)')

    // 验证输入
    if (!currentPassword || !newPassword) {
      console.log('Validation failed: missing password')
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      })
    }

    if (newPassword.length < 6) {
      console.log('Validation failed: password too short')
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      })
    }

    // 获取管理员配置
    const config = mainConfig.read()
    const admin = config.admin

    console.log('Admin username:', admin.username)
    console.log('Stored password hash:', admin.password.substring(0, 20) + '...')

    // 验证当前密码
    const isPasswordValid = await verifyPassword(currentPassword, admin.password)
    console.log('Password verification result:', isPasswordValid)

    if (!isPasswordValid) {
      console.log('Authentication failed: incorrect password')
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // 生成新密码哈希
    const hashedPassword = await hashPassword(newPassword)
    console.log('New password hashed successfully')

    // 更新配置
    config.admin.password = hashedPassword
    config.admin.updatedAt = new Date().toISOString()
    mainConfig.write(config)

    console.log('Password updated successfully')
    console.log('=== End Debug ===')

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
    const { currentPassword, newUsername } = req.body

    console.log('=== Change Username Debug ===')
    console.log('Current password provided:', currentPassword ? '(provided)' : '(empty)')
    console.log('New username provided:', newUsername)

    // 验证输入
    if (!currentPassword) {
      console.log('Validation failed: missing current password')
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      })
    }

    if (!newUsername) {
      console.log('Validation failed: missing new username')
      return res.status(400).json({
        success: false,
        message: 'New username is required'
      })
    }

    if (newUsername.length < 3) {
      console.log('Validation failed: username too short')
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      })
    }

    // 获取管理员配置
    const config = mainConfig.read()
    const admin = config.admin

    console.log('Current admin username:', admin.username)
    console.log('Stored password hash:', admin.password.substring(0, 20) + '...')

    // 验证当前密码
    const isPasswordValid = await verifyPassword(currentPassword, admin.password)
    console.log('Password verification result:', isPasswordValid)

    if (!isPasswordValid) {
      console.log('Authentication failed: incorrect password')
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // 更新用户名
    config.admin.username = newUsername
    config.admin.updatedAt = new Date().toISOString()
    mainConfig.write(config)

    console.log('Username updated successfully to:', newUsername)
    console.log('=== End Debug ===')

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
