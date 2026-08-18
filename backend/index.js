const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('./config/database');

const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET belum diisi di backend/.env');
  process.exit(1);
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Diperlukan di belakang reverse proxy TLS-terminating (Railway) agar
// express-session mengenali koneksi sebagai HTTPS dan cookie `secure` bisa terpasang.
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8 jam
  },
}));

app.get('/', (req, res) => {
  res.json({
    message: 'API Perpustakaan PTTUN berjalan',
  });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: 'Rute tidak ditemukan',
  });
});

app.listen(PORT, () => {
  console.log(`Server backend berjalan di http://localhost:${PORT}`);
});
