const express = require('express');
const bukuRoutes = require('./bukuRoutes');
const authRoutes = require('./authRoutes');
const penggunaRoutes = require('./penggunaRoutes');
const peminjamanRoutes = require('./peminjamanRoutes');
const PeminjamanModel = require('../models/PeminjamanModel');

const router = express.Router();

// Auto-return peminjaman yang sudah melewati due_date sebelum request diproses,
// supaya stok/status yang dilihat/digunakan selalu up-to-date tanpa aksi manual.
router.use(async (req, res, next) => {
  try {
    await PeminjamanModel.reconcileOverdueLoans();
  } catch (err) {
    console.error('Gagal auto-reconcile peminjaman overdue:', err);
  }
  next();
});

router.use('/buku', bukuRoutes);
router.use('/auth', authRoutes);
router.use('/pengguna', penggunaRoutes);
router.use('/peminjaman', peminjamanRoutes);

module.exports = router;
