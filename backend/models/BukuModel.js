const db = require('../config/database')

exports.getSemuaBuku = async () => {
  const [rows] = await db.promise().query(
    `SELECT b.id_buku, b.judul_buku,
            c.nama_category,
            MIN(d.pengarang) AS pengarang, MIN(d.penerbit) AS penerbit,
            MIN(d.tahun_terbit) AS tahun_terbit,
            SUM(d.stok_tersedia) AS stok_tersedia,
            CASE WHEN SUM(d.stok_tersedia) > 0 THEN 'Tersedia' ELSE 'Tidak Tersedia' END AS status_buku,
            MIN(d.image_url) AS image_url,
            MIN(r.nama_rak) AS nama_rak, MIN(sec.nama_section) AS nama_section
     FROM buku b
     INNER JOIN detail_buku d ON b.id_buku = d.id_buku
     LEFT JOIN category c ON b.id_category = c.id_category
     LEFT JOIN rak r ON d.id_rak = r.id_rak
     LEFT JOIN section sec ON d.id_section = sec.id_section
     GROUP BY b.id_buku, b.judul_buku, c.nama_category`
  )
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

exports.getBukuByCategory = async (key_category) => {
  const [rows] = await db.promise().query(
    `SELECT b.*, c.nama_category
    FROM buku b
    JOIN category c ON b.id_category = c.id_category
    WHERE c.nama_category = ?`,
    [key_category],
  )

  return rows
}

exports.getCategory = async () => {
  const [rows] = await db.promise().query(
    'SELECT * FROM category WHERE nama_category IS NOT NULL AND nama_category != ""',
  )
  return rows
}

exports.getBukuTerbaru = async (limit) => {
  const [rows] = await db.promise().query(
    `SELECT b.id_buku, b.judul_buku, d.image_url, d.pengarang, d.created_at, c.nama_category
     FROM buku b
     INNER JOIN detail_buku d ON b.id_buku = d.id_buku
     LEFT JOIN category c ON b.id_category = c.id_category
     ORDER BY d.created_at DESC, b.id_buku DESC
     LIMIT ?`,
    [limit],
  )

  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })

  return rows.map(({ created_at, ...row }) => ({
    ...row,
    tanggal_ditambahkan: created_at ? formatter.format(new Date(created_at)) : null,
  }))
}
