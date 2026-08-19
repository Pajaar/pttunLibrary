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

// Endpoint cek peminjaman cuma baca (SELECT), tidak menulis ke DB, dan lebih
// wajar dipanggil berulang kali oleh peminjam yang sama (mis. cek status
// beberapa kali). Dipisah dari writeLimiter supaya trafik cek status di
// jaringan bersama (mis. wifi publik perpustakaan) tidak menghabiskan
// jatah yang sama dengan endpoint peminjam baru.
const readLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak permintaan, silakan coba lagi beberapa saat lagi',
  },
});

module.exports = { writeLimiter, adminWriteLimiter, readLimiter };
