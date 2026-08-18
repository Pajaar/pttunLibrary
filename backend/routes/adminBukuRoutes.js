const express = require('express')
const router = express.Router()
const bukuAdminController = require('../controllers/BukuAdminController')
const { writeLimiter } = require('../middleware/rateLimiter')

router.get('/', bukuAdminController.getSemuaBuku)
router.get('/search', bukuAdminController.searchBuku)
router.get('/section', bukuAdminController.getSection)
router.get('/dashboard/stats', bukuAdminController.getDashboardStats)
router.post('/', writeLimiter, bukuAdminController.createBuku)
router.get('/:id', bukuAdminController.getBukuById)
router.put('/:id', writeLimiter, bukuAdminController.updateBuku)
router.delete('/:id', writeLimiter, bukuAdminController.deleteBuku)

module.exports = router
