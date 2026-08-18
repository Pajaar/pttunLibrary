const db = require('../config/database')
const pool = db.promise()

const SELECT_RAK = `SELECT * FROM rak ORDER BY id_rak`

const BASE_RAK = `SELECT * FROM rak`

exports.getRak = async () => {
  const [rows] = await pool.query(SELECT_RAK)
  return rows
}

exports.getRakById = async (id_rak) => {
  const [rows] = await pool.query(`${BASE_RAK} WHERE id_rak = ?`, [id_rak])
  return rows[0]
}

exports.searchRak = async (keyword) => {
  const searchKeyword = `%${keyword}%`
  const [rows] = await pool.query(
    `${BASE_RAK} WHERE nama_rak LIKE ? ORDER BY id_rak`,
    [searchKeyword],
  )
  return rows
}

exports.createRak = async (data) => {
  const { nama_rak } = data

  const [result] = await pool.query(
    'INSERT INTO rak (nama_rak) VALUES (?)',
    [nama_rak],
  )
  return result.insertId
}

exports.updateRak = async (id_rak, data) => {
  const { nama_rak } = data

  await pool.query(
    'UPDATE rak SET nama_rak = ? WHERE id_rak = ?',
    [nama_rak, id_rak],
  )
}

exports.countBukuByRak = async (id_rak) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM detail_buku WHERE id_rak = ?',
    [id_rak],
  )
  return rows[0].total
}

exports.deleteRak = async (id_rak) => {
  const [result] = await pool.query('DELETE FROM rak WHERE id_rak = ?', [id_rak])
  return result.affectedRows > 0
}
