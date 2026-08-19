const express = require('express');
const bukuRoutes = require('./bukuRoutes');
const authRoutes = require('./authRoutes');
const penggunaRoutes = require('./penggunaRoutes');
const peminjamanRoutes = require('./peminjamanRoutes');
const adminRoutes = require('./adminRoutes');
const PeminjamanModel = require('../models/PeminjamanModel');

const router = express.Router();

// Auto-flag peminjaman yang sudah melewati due_date sebagai 'terlambat' sebelum
// request diproses, supaya status yang dilihat/digunakan selalu up-to-date --
// stok tidak disentuh, buku dianggap masih keluar sampai staf konfirmasi manual.
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
router.use('/admin', adminRoutes);

module.exports = router;
