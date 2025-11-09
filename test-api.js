import axios from 'axios'
import jwt from 'jsonwebtoken'

const testAPI = async () => {
  console.log('Testing API endpoints...\n')

  // Generate a test token
  const JWT_SECRET = process.env.JWT_SECRET || 'spages-secret-key-change-in-production'
  const token = jwt.sign({ username: 'admin' }, JWT_SECRET, { expiresIn: '7d' })

  console.log('Generated test token:', token.substring(0, 20) + '...')

  const client = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  try {
    console.log('\n1. Testing project name check...')
    const nameResult = await client.get('/projects/check-name/test-project')
    console.log('✅ Response:', nameResult.data)
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data || error.message)
  }

  try {
    console.log('\n2. Testing port check...')
    const portResult = await client.get('/projects/check-port/3001')
    console.log('✅ Response:', portResult.data)
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data || error.message)
  }

  try {
    console.log('\n3. Testing get all projects...')
    const projectsResult = await client.get('/projects')
    console.log('✅ Response:', projectsResult.data)
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data || error.message)
  }
}

testAPI().catch(console.error)
