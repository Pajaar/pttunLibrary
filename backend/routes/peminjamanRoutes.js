const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', peminjamanController.getSemuaPeminjaman);
router.post('/', writeLimiter, peminjamanController.buatPeminjaman);
router.patch('/:id/status', writeLimiter, peminjamanController.updateStatusPeminjaman);

module.exports = router;
