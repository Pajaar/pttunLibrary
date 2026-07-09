const express = require('express');
const bukuRoutes = require('./bukuRoutes');
const authRoutes = require('./authRoutes');
const penggunaRoutes = require('./penggunaRoutes');
const peminjamanRoutes = require('./peminjamanRoutes');

const router = express.Router();

router.use('/buku', bukuRoutes);
router.use('/auth', authRoutes);
router.use('/pengguna', penggunaRoutes);
router.use('/peminjaman', peminjamanRoutes);

module.exports = router;
