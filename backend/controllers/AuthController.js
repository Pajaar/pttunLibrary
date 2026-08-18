const bcrypt = require('bcryptjs')
const PenggunaModel = require('../models/PenggunaModel')

exports.login = async (req, res) => {
  const { username, password } = req.body

  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ message: 'Username wajib diisi' })
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Password wajib diisi' })
  }

  try {
    const pengguna = await PenggunaModel.findByUsername(username.trim())
    if (!pengguna) {
      return res.status(401).json({ message: 'Username atau password salah' })
    }

    const cocok = await bcrypt.compare(password, pengguna.password_hash)
    if (!cocok) {
      return res.status(401).json({ message: 'Username atau password salah' })
    }

    req.session.userId = pengguna.id_pengguna

    res.json({
      message: 'Login berhasil',
      data: { username: pengguna.username },
    })
  } catch (error) {
    console.error('Gagal memproses login:', error)
    res.status(500).json({ message: 'Gagal memproses login' })
  }
}

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Gagal logout:', err)
      return res.status(500).json({ message: 'Gagal logout' })
    }
    res.clearCookie('connect.sid')
    res.json({ message: 'Logout berhasil' })
  })
}

exports.me = async (req, res) => {
  try {
    const pengguna = await PenggunaModel.findById(req.session.userId)
    if (!pengguna) {
      return res.status(401).json({ message: 'Sesi tidak valid' })
    }
    res.json({
      message: 'Sesi aktif',
      data: { username: pengguna.username },
    })
  } catch (error) {
    console.error('Gagal mengambil data sesi:', error)
    res.status(500).json({ message: 'Gagal mengambil data sesi' })
  }
}
