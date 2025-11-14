import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// JWT Secret (在生产环境中应该使用环境变量)
const JWT_SECRET = process.env.JWT_SECRET || 'spages-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

/**
 * 生成密码哈希
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

/**
 * 验证密码
 */
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

/**
 * 生成JWT token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

/**
 * 认证中间件
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    })
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    })
  }

  req.user = decoded
  next()
}
