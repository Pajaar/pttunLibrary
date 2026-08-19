const PeminjamanModel = require('../models/PeminjamanModel')

const STATUS_VALUES = ['dipinjam', 'dikembalikan', 'terlambat']

exports.buatPeminjaman = async (req, res) => {
  const { id_detail, nama_peminjam, no_telpon, durasi_hari, konfirmasi_tanggung_jawab } = req.body

  const parsedIdDetail = Number.parseInt(id_detail, 10)
  if (!Number.isInteger(parsedIdDetail)) {
    return res.status(400).json({ message: 'id_detail wajib diisi dan berupa angka' })
  }

  if (typeof nama_peminjam !== 'string' || nama_peminjam.trim() === '') {
    return res.status(400).json({ message: 'Nama peminjam wajib diisi' })
  }

  if (typeof no_telpon !== 'string' || no_telpon.trim() === '') {
    return res.status(400).json({ message: 'Nomor telepon wajib diisi' })
  }

  let parsedDurasi = 7
  if (durasi_hari !== undefined) {
    parsedDurasi = Number.parseInt(durasi_hari, 10)
    if (!Number.isInteger(parsedDurasi) || parsedDurasi < 1 || parsedDurasi > 7) {
      return res.status(400).json({ message: 'durasi_hari harus berupa angka antara 1 dan 7' })
    }
  }

  if (konfirmasi_tanggung_jawab !== true) {
    return res.status(400).json({ message: 'Pernyataan tanggung jawab wajib disetujui' })
  }

  try {
    const result = await PeminjamanModel.buatPeminjaman({
      id_detail: parsedIdDetail,
      nama_peminjam: nama_peminjam.trim(),
      no_telpon: no_telpon.trim(),
      durasi_hari: parsedDurasi,
    })

    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }
    if (result.error === 'OUT_OF_STOCK') {
      return res.status(400).json({ message: 'Buku sedang tidak tersedia' })
    }

    res.json({
      message: 'Peminjaman berhasil diajukan',
      data: result.data,
    })
  } catch (error) {
    console.error('Gagal mengajukan peminjaman:', error)
    res.status(500).json({
      message: 'Gagal mengajukan peminjaman',
    })
  }
}

exports.getSemuaPeminjaman = async (req, res) => {
  try {
    const peminjaman = await PeminjamanModel.getSemuaPeminjaman()
    res.json({
      message: 'Data peminjaman berhasil diambil',
      data: peminjaman,
    })
  } catch (error) {
    console.error('Gagal mengambil data peminjaman:', error)
    res.status(500).json({
      message: 'Gagal mengambil data peminjaman',
    })
  }
}

exports.updateStatusPeminjaman = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!STATUS_VALUES.includes(status)) {
    return res.status(400).json({
      message: `status harus salah satu dari: ${STATUS_VALUES.join(', ')}`,
    })
  }

  try {
    const updated = await PeminjamanModel.updateStatusPeminjaman(id, status)
    if (!updated) {
      return res.status(404).json({ message: 'Data peminjaman tidak ditemukan' })
    }

    res.json({
      message: 'Status peminjaman berhasil diperbarui',
      data: updated,
    })
  } catch (error) {
    console.error('Gagal memperbarui status peminjaman:', error)
    res.status(500).json({
      message: 'Gagal memperbarui status peminjaman',
    })
  }
}

exports.updatePeminjaman = async (req, res) => {
  const { id } = req.params
  const { nama_peminjam, no_telpon, durasi_hari } = req.body

  if (typeof nama_peminjam !== 'string' || !nama_peminjam.trim()) {
    return res.status(400).json({ message: 'Nama peminjam wajib diisi' })
  }
  if (typeof no_telpon !== 'string' || !no_telpon.trim()) {
    return res.status(400).json({ message: 'Nomor telepon wajib diisi' })
  }

  const parsedDurasi = Number.parseInt(durasi_hari, 10)
  if (!Number.isInteger(parsedDurasi) || parsedDurasi < 1 || parsedDurasi > 7) {
    return res.status(400).json({ message: 'Durasi pinjam harus berupa angka antara 1 dan 7 hari' })
  }

  try {
    const updated = await PeminjamanModel.updatePeminjaman(id, {
      nama_peminjam: nama_peminjam.trim(),
      no_telpon: no_telpon.trim(),
      durasi_hari: parsedDurasi,
    })
    if (!updated) {
      return res.status(404).json({ message: 'Data peminjaman tidak ditemukan' })
    }
    res.json({ message: 'Data peminjaman berhasil diperbarui', data: updated })
  } catch (error) {
    console.error('Gagal memperbarui data peminjaman:', error)
    res.status(500).json({ message: 'Gagal memperbarui data peminjaman' })
  }
}

exports.deletePeminjaman = async (req, res) => {
  const { id } = req.params
  try {
    const deleted = await PeminjamanModel.deletePeminjaman(id)
    if (!deleted) {
      return res.status(404).json({ message: 'Data peminjaman tidak ditemukan' })
    }
    res.json({ message: 'Data peminjaman berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus data peminjaman:', error)
    res.status(500).json({ message: 'Gagal menghapus data peminjaman' })
  }
}
