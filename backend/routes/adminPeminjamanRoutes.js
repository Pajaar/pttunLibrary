const express = require('express')
const router = express.Router()

const peminjamanController = require('../controllers/PeminjamanController')
const { writeLimiter } = require('../middleware/rateLimiter')

router.get('/', peminjamanController.getSemuaPeminjaman)
router.put('/:id', writeLimiter, peminjamanController.updatePeminjaman)
router.patch('/:id/status', writeLimiter, peminjamanController.updateStatusPeminjaman)
router.delete('/:id', writeLimiter, peminjamanController.deletePeminjaman)

module.exports = router
