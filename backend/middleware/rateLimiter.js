const rateLimit = require('express-rate-limit');

// Endpoint peminjaman menulis ke DB (insert peminjaman + update stok_tersedia) dan
// tidak ada auth di depannya, jadi dibatasi per-IP supaya tidak bisa dispam otomatis.
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak permintaan, silakan coba lagi beberapa saat lagi',
  },
});

module.exports = { writeLimiter };
