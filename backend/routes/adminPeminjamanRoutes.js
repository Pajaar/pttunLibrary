const express = require('express')
const router = express.Router()

const peminjamanController = require('../controllers/PeminjamanController')
const { adminWriteLimiter } = require('../middleware/rateLimiter')

router.get('/', peminjamanController.getSemuaPeminjaman)
router.put('/:id', adminWriteLimiter, peminjamanController.updatePeminjaman)
router.patch('/:id/status', adminWriteLimiter, peminjamanController.updateStatusPeminjaman)
router.delete('/:id', adminWriteLimiter, peminjamanController.deletePeminjaman)

module.exports = router
