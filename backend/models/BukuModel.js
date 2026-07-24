const db = require('../config/database')

exports.getSemuaBuku = async () => {
  const [rows] = await db.promise().query('SELECT * FROM buku')
  return rows
}

exports.getBukuById = async (id_buku) => {
  const [rows] = await db.promise().query('SELECT * FROM buku WHERE id_buku = ?', [id_buku])
  return rows[0]
}

exports.searchBuku = async (keyword) => {
  const searchKeyword = `%${keyword}%`

  const [rows] = await db.promise().query(
    `SELECT b.*, d.pengarang, d.penerbit, d.tahun_terbit, d.halaman, d.stok_tersedia, d.status_buku
    FROM buku b
    JOIN detail_buku d ON b.id_buku = d.id_buku
    WHERE b.judul_buku LIKE ?
    OR d.pengarang LIKE ?`,
    [searchKeyword, searchKeyword],
  )

  return rows
}

