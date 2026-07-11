const BukuModel = require('../models/BukuModel')

// Get data semua buku
exports.getSemuaBuku = async (req, res) => {
  try {
    const buku = await BukuModel.getSemuaBuku()
    res.json({
      message: 'Data buku berhasil diambil',
      data: buku,
    })
  }
  catch (error) {

    res.status(500).json({
      message: 'Gagal mengambil data buku',
      error: error.message,
    })
  }
}

// Get data buku by id
exports.getBukuById = async (req, res) => {
  const { id } = req.params
  try {
    const buku = await BukuModel.getBukuById(id)
    if (!buku) {
      return res.status(404).json({
        message: 'Buku tidak ditemukan',
      })
    }
    res.json({
      message: 'Data buku berhasil diambil',
      data: buku,
    })
  }
  catch (error) {
    res.status(500).json({
      message: 'Gagal mengambil data buku',
      error: error.message,
    })
  }
}

// Get buku by search query
exports.searchBuku = async (req, res) => {
  const { keyword } = req.query

  if (!keyword) {
    return res.status(400).json({
      message: 'Kata kunci pencarian wajib diisi',
    })
  }

  try {
    const buku = await BukuModel.searchBuku(keyword)

    res.json({
      message: 'Data buku berhasil ditemukan',
      data: buku,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mencari data buku',
      error: error.message,
    })
  }
}
