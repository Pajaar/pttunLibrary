const RakModel = require('../models/RakModel')

exports.getRak = async (req, res) => {
  try {
    const rak = await RakModel.getRak()
    res.json({ message: 'Data rak berhasil diambil', data: rak })
  } catch (error) {
    console.error('Gagal mengambil data rak:', error)
    res.status(500).json({ message: 'Gagal mengambil data rak' })
  }
}

exports.searchRak = async (req, res) => {
  const { keyword } = req.query

  if (!keyword) {
    return res.status(400).json({ message: 'Kata kunci pencarian wajib diisi' })
  }

  try {
    const rak = await RakModel.searchRak(keyword)
    res.json({ message: 'Data rak berhasil ditemukan', data: rak })
  } catch (error) {
    console.error('Gagal mencari data rak:', error)
    res.status(500).json({ message: 'Gagal mencari data rak' })
  }
}

exports.createRak = async (req, res) => {
  const { nama_rak } = req.body

  if (!nama_rak || !nama_rak.trim()) {
    return res.status(400).json({ message: 'Nama rak wajib diisi' })
  }

  try {
    const id_rak = await RakModel.createRak(req.body)
    const rak = await RakModel.getRakById(id_rak)
    res.status(201).json({ message: 'Rak berhasil ditambahkan', data: rak })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Nama rak sudah digunakan' })
    }
    console.error('Gagal menambahkan rak:', error)
    res.status(500).json({ message: 'Gagal menambahkan rak' })
  }
}

exports.updateRak = async (req, res) => {
  const { id } = req.params
  const { nama_rak } = req.body

  if (!nama_rak || !nama_rak.trim()) {
    return res.status(400).json({ message: 'Nama rak wajib diisi' })
  }

  try {
    const existing = await RakModel.getRakById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Rak tidak ditemukan' })
    }

    await RakModel.updateRak(id, req.body)
    const rak = await RakModel.getRakById(id)
    res.json({ message: 'Rak berhasil diperbarui', data: rak })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Nama rak sudah digunakan' })
    }
    console.error('Gagal memperbarui rak:', error)
    res.status(500).json({ message: 'Gagal memperbarui rak' })
  }
}

exports.deleteRak = async (req, res) => {
  const { id } = req.params
  try {
    const existing = await RakModel.getRakById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Rak tidak ditemukan' })
    }

    const totalBuku = await RakModel.countBukuByRak(id)
    if (totalBuku > 0) {
      return res.status(409).json({ message: 'Rak masih digunakan oleh buku, tidak bisa dihapus' })
    }

    await RakModel.deleteRak(id)
    res.json({ message: 'Rak berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus rak:', error)
    res.status(500).json({ message: 'Gagal menghapus rak' })
  }
}
