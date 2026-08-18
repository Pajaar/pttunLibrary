const express = require('express')
const router = express.Router()

const rakController = require('../controllers/RakController')
const { adminWriteLimiter } = require('../middleware/rateLimiter')

router.get('/', rakController.getRak)
router.get('/search', rakController.searchRak)
router.post('/', adminWriteLimiter, rakController.createRak)
router.put('/:id', adminWriteLimiter, rakController.updateRak)
router.delete('/:id', adminWriteLimiter, rakController.deleteRak)

module.exports = router
