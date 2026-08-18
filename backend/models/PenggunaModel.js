const db = require('../config/database')

exports.findByUsername = async (username) => {
  const [rows] = await db.promise().query(
    'SELECT * FROM pengguna WHERE username = ?',
    [username],
  )
  return rows[0]
}

exports.findById = async (id_pengguna) => {
  const [rows] = await db.promise().query(
    'SELECT * FROM pengguna WHERE id_pengguna = ?',
    [id_pengguna],
  )
  return rows[0]
}

exports.createPengguna = async ({ username, password_hash }) => {
  const [result] = await db.promise().query(
    'INSERT INTO pengguna (username, password_hash) VALUES (?, ?)',
    [username, password_hash],
  )
  return result.insertId
}
