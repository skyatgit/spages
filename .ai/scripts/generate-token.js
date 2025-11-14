import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'spages-secret-key-change-in-production'

const token = jwt.sign({ username: 'admin' }, JWT_SECRET, { expiresIn: '7d' })

console.log('\n=== Test Token Generated ===')
console.log(token)
console.log('\nUse this token in test-api.js or browser localStorage')
console.log('localStorage.setItem("auth_token", "' + token + '")')
console.log('================================\n')
