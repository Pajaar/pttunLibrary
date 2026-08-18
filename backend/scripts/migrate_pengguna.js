const db = require('../config/database')

const SQL = `
  CREATE TABLE IF NOT EXISTS pengguna (
    id_pengguna INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`

db.promise()
  .query(SQL)
  .then(() => {
    console.log('Tabel pengguna siap (dibuat jika belum ada)')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Gagal membuat tabel pengguna:', err)
    process.exit(1)
  })
