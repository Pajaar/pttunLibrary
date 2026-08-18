const db = require('../config/database')
const pool = db.promise()

const SELECT_CATEGORY = `SELECT * FROM category ORDER BY id_category`

const BASE_CATEGORY = `SELECT * FROM category`

exports.getCategory = async () => {
  const [rows] = await pool.query(SELECT_CATEGORY)
  return rows
}

exports.getCategoryById = async (id_category) => {
  const [rows] = await pool.query(`${BASE_CATEGORY} WHERE id_category = ?`, [id_category])
  return rows[0]
}

exports.searchCategory = async (keyword) => {
  const searchKeyword = `%${keyword}%`
  const [rows] = await pool.query(
    `${BASE_CATEGORY} WHERE nama_category LIKE ? ORDER BY id_category`,
    [searchKeyword],
  )
  return rows
}

exports.createCategory = async (data) => {
  const { nama_category } = data

  const [result] = await pool.query(
    'INSERT INTO category (nama_category) VALUES (?)',
    [nama_category],
  )
  return result.insertId
}

exports.updateCategory = async (id_category, data) => {
  const { nama_category } = data

  await pool.query(
    'UPDATE category SET nama_category = ? WHERE id_category = ?',
    [nama_category, id_category],
  )
}

exports.countBukuByCategory = async (id_category) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM buku WHERE id_category = ?',
    [id_category],
  )
  return rows[0].total
}

exports.deleteCategory = async (id_category) => {
  const [result] = await pool.query('DELETE FROM category WHERE id_category = ?', [id_category])
  return result.affectedRows > 0
}
