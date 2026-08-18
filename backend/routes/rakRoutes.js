const express = require('express')
const router = express.Router()

const rakController = require('../controllers/RakController')
const { writeLimiter } = require('../middleware/rateLimiter')

router.get('/', rakController.getRak)
router.get('/search', rakController.searchRak)
router.post('/', writeLimiter, rakController.createRak)
router.put('/:id', writeLimiter, rakController.updateRak)
router.delete('/:id', writeLimiter, rakController.deleteRak)

module.exports = router
