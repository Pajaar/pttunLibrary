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

// Rute admin sudah di belakang requireAuth, jadi traffic-nya staf yang login, bukan
// publik anonim — batas lebih longgar supaya entri data massal (mis. katalog buku
// baru) tidak ke-block, tapi tetap ada guard terhadap bug/script yang lepas kendali.
const adminWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak permintaan, silakan coba lagi beberapa saat lagi',
  },
});

module.exports = { writeLimiter, adminWriteLimiter };
