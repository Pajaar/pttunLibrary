const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');
const { writeLimiter, readLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', writeLimiter, peminjamanController.buatPeminjaman);
router.get('/cek', readLimiter, peminjamanController.cekPeminjaman);

module.exports = router;
