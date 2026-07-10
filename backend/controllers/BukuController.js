const BukuModel = require('../models/BukuModel')

exports.getSemuaBuku = async (req, res) => {
  try {
    const buku = await BukuModel.getSemuaBuku()
    res.json({
      message: 'Data buku berhasil diambil',
      data: buku,
    })
  } catch (error) {

    res.status(500).json({
      message: 'Gagal mengambil data buku',
      error: error.message,
    })
  }
}
