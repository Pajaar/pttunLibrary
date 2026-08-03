const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');

const router = express.Router();

router.get('/', peminjamanController.getSemuaPeminjaman);
router.post('/', peminjamanController.buatPeminjaman);
router.patch('/:id/status', peminjamanController.updateStatusPeminjaman);

module.exports = router;
