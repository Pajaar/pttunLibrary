const bcrypt = require('bcryptjs')
const PenggunaModel = require('../models/PenggunaModel')

async function main() {
  const [, , username, password] = process.argv

  if (!username || !password) {
    console.error('Pemakaian: node scripts/seedAdmin.js <username> <password>')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Password minimal 8 karakter')
    process.exit(1)
  }

  const existing = await PenggunaModel.findByUsername(username)
  if (existing) {
    console.error(`Username "${username}" sudah terdaftar`)
    process.exit(1)
  }

  const password_hash = await bcrypt.hash(password, 10)
  const id = await PenggunaModel.createPengguna({ username, password_hash })
  console.log(`Akun admin "${username}" berhasil dibuat (id_pengguna=${id})`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Gagal membuat akun admin:', err)
  process.exit(1)
})
