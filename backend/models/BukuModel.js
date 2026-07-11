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
    `SELECT * FROM buku
     WHERE judul LIKE ?
     OR pengarang LIKE ?`,
    [searchKeyword, searchKeyword],
  )

  return rows
}

