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
  const [rows] = await db.promise().query(
    `SELECT b.id_buku, b.judul_buku, b.id_category,
            c.nama_category,
            d.pengarang, d.penerbit, d.tahun_terbit, d.image_url,
            r.nama_rak, sec.nama_section,
            CASE WHEN d.stok_tersedia > 0 THEN 'Tersedia' ELSE 'Tidak Tersedia' END AS status_buku
     FROM buku b
     JOIN detail_buku d ON b.id_buku = d.id_buku
     LEFT JOIN category c ON b.id_category = c.id_category
     LEFT JOIN rak r ON d.id_rak = r.id_rak
     LEFT JOIN section sec ON d.id_section = sec.id_section
     WHERE b.id_buku = ?`,
    [id_buku],
  )
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

const REKOMENDASI_STOPWORDS = new Set([
  'dan', 'di', 'ke', 'dari', 'untuk', 'atau', 'dengan', 'pada',
  'yang', 'ini', 'itu', 'adalah', 'oleh', 'atas', 'dalam',
])

function tokenizeJudul(judul) {
  return new Set(
    (judul || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !REKOMENDASI_STOPWORDS.has(word)),
  )
}

exports.getBukuRekomendasi = async (id_buku, limit = 6) => {
  const [targetRows] = await db.promise().query(
    `SELECT b.id_category, b.judul_buku, d.pengarang
     FROM buku b
     JOIN detail_buku d ON b.id_buku = d.id_buku
     WHERE b.id_buku = ?`,
    [id_buku],
  )
  const target = targetRows[0]
  if (!target) return []

  const [candidates] = await db.promise().query(
    `SELECT b.id_buku, b.judul_buku, b.id_category,
            c.nama_category, d.pengarang, d.tahun_terbit, d.image_url,
            CASE WHEN d.stok_tersedia > 0 THEN 'Tersedia' ELSE 'Tidak Tersedia' END AS status_buku
     FROM buku b
     JOIN detail_buku d ON b.id_buku = d.id_buku
     LEFT JOIN category c ON b.id_category = c.id_category
     WHERE b.id_buku != ?
       AND (b.id_category = ? OR d.pengarang = ?)`,
    [id_buku, target.id_category, target.pengarang],
  )

  const targetWords = tokenizeJudul(target.judul_buku)

  const scored = candidates.map((candidate) => {
    let score = 0
    if (target.id_category != null && candidate.id_category === target.id_category) score += 2
    if (target.pengarang != null && candidate.pengarang === target.pengarang) score += 3

    const candidateWords = tokenizeJudul(candidate.judul_buku)
    for (const word of candidateWords) {
      if (targetWords.has(word)) score += 1
    }

    return { ...candidate, score }
  })

  return scored
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || (b.tahun_terbit || 0) - (a.tahun_terbit || 0))
    .slice(0, limit)
    .map(({ score: _score, id_category: _id_category, ...rest }) => rest)
}
