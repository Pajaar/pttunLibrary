const db = require('../config/database')

exports.getSemuaBuku = async () => {
  const [rows] = await db.promise().query('SELECT * FROM buku')
  return rows
}
