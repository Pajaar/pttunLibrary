const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');

const router = express.Router();

router.get('/', peminjamanController.getPeminjaman);

module.exports = router;
