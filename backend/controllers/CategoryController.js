const CategoryModel = require('../models/CategoryModel')

exports.getCategory = async (req, res) => {
  try {
    const categories = await CategoryModel.getCategory()
    res.json({ message: 'Data kategori berhasil diambil', data: categories })
  } catch (error) {
    console.error('Gagal mengambil data kategori:', error)
    res.status(500).json({ message: 'Gagal mengambil data kategori' })
  }
}

exports.searchCategory = async (req, res) => {
  const { keyword } = req.query

  if (!keyword) {
    return res.status(400).json({ message: 'Kata kunci pencarian wajib diisi' })
  }

  try {
    const categories = await CategoryModel.searchCategory(keyword)
    res.json({ message: 'Data kategori berhasil ditemukan', data: categories })
  } catch (error) {
    console.error('Gagal mencari data kategori:', error)
    res.status(500).json({ message: 'Gagal mencari data kategori' })
  }
}

exports.createCategory = async (req, res) => {
  const { nama_category } = req.body

  if (!nama_category || !nama_category.trim()) {
    return res.status(400).json({ message: 'Nama kategori wajib diisi' })
  }

  try {
    const id_category = await CategoryModel.createCategory(req.body)
    const category = await CategoryModel.getCategoryById(id_category)
    res.status(201).json({ message: 'Kategori berhasil ditambahkan', data: category })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Nama kategori sudah digunakan' })
    }
    console.error('Gagal menambahkan kategori:', error)
    res.status(500).json({ message: 'Gagal menambahkan kategori' })
  }
}

exports.updateCategory = async (req, res) => {
  const { id } = req.params
  const { nama_category } = req.body

  if (!nama_category || !nama_category.trim()) {
    return res.status(400).json({ message: 'Nama kategori wajib diisi' })
  }

  try {
    const existing = await CategoryModel.getCategoryById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' })
    }

    await CategoryModel.updateCategory(id, req.body)
    const category = await CategoryModel.getCategoryById(id)
    res.json({ message: 'Kategori berhasil diperbarui', data: category })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Nama kategori sudah digunakan' })
    }
    console.error('Gagal memperbarui kategori:', error)
    res.status(500).json({ message: 'Gagal memperbarui kategori' })
  }
}

exports.deleteCategory = async (req, res) => {
  const { id } = req.params
  try {
    const existing = await CategoryModel.getCategoryById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' })
    }

    const totalBuku = await CategoryModel.countBukuByCategory(id)
    if (totalBuku > 0) {
      return res.status(409).json({ message: 'Kategori masih digunakan oleh buku, tidak bisa dihapus' })
    }

    await CategoryModel.deleteCategory(id)
    res.json({ message: 'Kategori berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus kategori:', error)
    res.status(500).json({ message: 'Gagal menghapus kategori' })
  }
}
