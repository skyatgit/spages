import express from 'express'

const router = express.Router()

// GitHub OAuth routes will be implemented here
router.get('/auth-url', (req, res) => {
  res.json({ url: 'https://github.com/login/oauth/authorize' })
})

router.post('/token', (req, res) => {
  res.json({ token: 'placeholder' })
})

router.get('/repositories', (req, res) => {
  res.json([])
})

export default router
