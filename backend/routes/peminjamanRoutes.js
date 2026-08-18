const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', writeLimiter, peminjamanController.buatPeminjaman);

module.exports = router;
