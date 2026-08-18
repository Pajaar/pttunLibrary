const BukuAdminModel = require('../models/BukuAdminModel')

exports.getSemuaBuku = async (req, res) => {
  try {
    const buku = await BukuAdminModel.getSemuaBuku()
    res.json({ message: 'Data buku berhasil diambil', data: buku })
  } catch (error) {
    console.error('Gagal mengambil data buku (admin):', error)
    res.status(500).json({ message: 'Gagal mengambil data buku' })
  }
}

exports.getDashboardStats = async (req, res) => {
  try {
    const statsData = await BukuAdminModel.getDashboardStats()
    res.json({ message: 'Data statistik berhasil diambil', data: statsData })
  } catch (error) {
    console.error('Gagal mengambil data statistik:', error)
    res.status(500).json({ message: 'Gagal mengambil data statistik' })
  }
}

exports.getBukuById = async (req, res) => {
  const { id } = req.params
  try {
    const buku = await BukuAdminModel.getBukuById(id)
    if (!buku) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }
    res.json({ message: 'Data buku berhasil diambil', data: buku })
  } catch (error) {
    console.error('Gagal mengambil data buku by id (admin):', error)
    res.status(500).json({ message: 'Gagal mengambil data buku' })
  }
}

exports.searchBuku = async (req, res) => {
  const { keyword } = req.query

  if (!keyword) {
    return res.status(400).json({ message: 'Kata kunci pencarian wajib diisi' })
  }

  try {
    const buku = await BukuAdminModel.searchBuku(keyword)
    res.json({ message: 'Data buku berhasil ditemukan', data: buku })
  } catch (error) {
    console.error('Gagal mencari data buku (admin):', error)
    res.status(500).json({ message: 'Gagal mencari data buku' })
  }
}

exports.getSection = async (req, res) => {
  try {
    const section = await BukuAdminModel.getSection()
    res.json({ message: 'Data section berhasil diambil', data: section })
  } catch (error) {
    console.error('Gagal mengambil data section:', error)
    res.status(500).json({ message: 'Gagal mengambil data section' })
  }
}

exports.createBuku = async (req, res) => {
  const { judul_buku, id_rak } = req.body

  if (!judul_buku || !judul_buku.trim()) {
    return res.status(400).json({ message: 'Judul buku wajib diisi' })
  }
  if (!id_rak) {
    return res.status(400).json({ message: 'Rak wajib dipilih' })
  }

  try {
    const id_buku = await BukuAdminModel.createBuku(req.body)
    const buku = await BukuAdminModel.getBukuById(id_buku)
    res.status(201).json({ message: 'Buku berhasil ditambahkan', data: buku })
  } catch (error) {
    console.error('Gagal menambahkan buku:', error)
    res.status(500).json({ message: 'Gagal menambahkan buku' })
  }
}

exports.updateBuku = async (req, res) => {
  const { id } = req.params
  const { judul_buku, id_rak } = req.body

  if (!judul_buku || !judul_buku.trim()) {
    return res.status(400).json({ message: 'Judul buku wajib diisi' })
  }
  if (!id_rak) {
    return res.status(400).json({ message: 'Rak wajib dipilih' })
  }

  try {
    const existing = await BukuAdminModel.getBukuById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }

    await BukuAdminModel.updateBuku(id, req.body)
    const buku = await BukuAdminModel.getBukuById(id)
    res.json({ message: 'Buku berhasil diperbarui', data: buku })
  } catch (error) {
    console.error('Gagal memperbarui buku:', error)
    res.status(500).json({ message: 'Gagal memperbarui buku' })
  }
}

exports.deleteBuku = async (req, res) => {
  const { id } = req.params
  try {
    const deleted = await BukuAdminModel.deleteBuku(id)
    if (!deleted) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }
    res.json({ message: 'Buku berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus buku:', error)
    res.status(500).json({ message: 'Gagal menghapus buku' })
  }
}
