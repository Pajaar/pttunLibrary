const express = require('express')
const router = express.Router()
const bukuAdminController = require('../controllers/BukuAdminController')
const { adminWriteLimiter } = require('../middleware/rateLimiter')

router.get('/', bukuAdminController.getSemuaBuku)
router.get('/search', bukuAdminController.searchBuku)
router.get('/section', bukuAdminController.getSection)
router.get('/dashboard/stats', bukuAdminController.getDashboardStats)
router.post('/', adminWriteLimiter, bukuAdminController.createBuku)
router.get('/:id', bukuAdminController.getBukuById)
router.put('/:id', adminWriteLimiter, bukuAdminController.updateBuku)
router.delete('/:id', adminWriteLimiter, bukuAdminController.deleteBuku)

module.exports = router
