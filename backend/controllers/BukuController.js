const BukuModel = require('../models/BukuModel')

// Get data semua buku
exports.getSemuaBuku = async (req, res) => {
  const { sort, limit } = req.query

  if (sort === 'terbaru') {
    let validLimit = 3
    if (limit !== undefined) {
      const parsed = Number.parseInt(limit, 10)
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 3) {
        validLimit = parsed
      }
    }

    try {
      const buku = await BukuModel.getBukuTerbaru(validLimit)
      return res.json({
        message: 'Data buku terbaru berhasil diambil',
        data: buku,
      })
    }
    catch (error) {
      return res.status(500).json({
        message: 'Gagal mengambil data buku terbaru',
        error: error.message,
      })
    }
  }

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

// Get buku by category
exports.getBukuByCategory = async (req, res) => {
  const { category } = req.params

  try {
    const buku = await BukuModel.getBukuByCategory(category)

    if (buku.length === 0) {
      return res.status(404).json({
        message: 'Tidak ada buku ditemukan untuk kategori ini',
      })
    }

    res.json({
      message: 'Data buku berhasil ditemukan',
      data: buku,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mencari data buku berdasarkan kategori',
      error: error.message,
    })
  }
}

// Get all categories
exports.getCategory = async (req, res) => {
  try {
    const categories = await BukuModel.getCategory()
    res.json({
      message: 'Data kategori berhasil diambil',
      data: categories,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mengambil data kategori',
      error: error.message,
    })
  }
}
