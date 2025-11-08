import express from 'express'

const router = express.Router()

// Project CRUD routes will be implemented here
router.get('/', (req, res) => {
  res.json([])
})

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id })
})

router.post('/', (req, res) => {
  res.json({ message: 'Project created' })
})

router.put('/:id', (req, res) => {
  res.json({ message: 'Project updated' })
})

router.delete('/:id', (req, res) => {
  res.json({ message: 'Project deleted' })
})

export default router
