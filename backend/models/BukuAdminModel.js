const db = require('../config/database')
const pool = db.promise()

const SELECT_BUKU = `
  SELECT b.id_buku, b.judul_buku, b.id_category, c.nama_category,
         d.id_detail, d.pengarang, d.penerbit, d.tahun_terbit, d.halaman,
         d.id_rak, r.nama_rak, d.id_section, sec.nama_section,
         d.total_buku, d.stok_tersedia, d.status_buku, d.image_url
  FROM buku b
  INNER JOIN detail_buku d ON b.id_buku = d.id_buku
  LEFT JOIN category c ON b.id_category = c.id_category
  LEFT JOIN rak r ON d.id_rak = r.id_rak
  LEFT JOIN section sec ON d.id_section = sec.id_section
`

exports.getDashboardStats = async () => {
  const [buku] = await pool.query('SELECT COUNT(*) AS total FROM buku')
  const [category] = await pool.query('SELECT COUNT(*) AS total FROM category')
  const [rak] = await pool.query('SELECT COUNT(*) AS total FROM rak')
  const [stok] = await pool.query('SELECT SUM(total_buku) AS total_fisik FROM detail_buku')

  return {
    total_judul_buku: buku[0].total || 0,
    total_kategori: category[0].total || 0,
    total_rak: rak[0].total || 0,
    total_eksemplar: stok[0].total_fisik || 0,
  }
}

exports.getSemuaBuku = async () => {
  const [rows] = await pool.query(`${SELECT_BUKU} ORDER BY b.id_buku DESC`)
  return rows
}

exports.getBukuById = async (id_buku) => {
  const [rows] = await pool.query(`${SELECT_BUKU} WHERE b.id_buku = ?`, [id_buku])
  return rows[0]
}

exports.searchBuku = async (keyword) => {
  const searchKeyword = `%${keyword}%`
  const [rows] = await pool.query(
    `${SELECT_BUKU} WHERE b.judul_buku LIKE ? OR d.pengarang LIKE ? ORDER BY b.id_buku DESC`,
    [searchKeyword, searchKeyword],
  )
  return rows
}

exports.getSection = async () => {
  const [rows] = await pool.query('SELECT * FROM section ORDER BY nama_section')
  return rows
}

exports.createBuku = async (data) => {
  const {
    judul_buku,
    id_category,
    pengarang,
    penerbit,
    tahun_terbit,
    halaman,
    id_rak,
    id_section,
    total_buku,
    image_url,
  } = data

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [bukuResult] = await connection.query(
      'INSERT INTO buku (judul_buku, id_category) VALUES (?, ?)',
      [judul_buku, id_category ?? null],
    )
    const id_buku = bukuResult.insertId
    const jumlah = total_buku ?? 1

    await connection.query(
      `INSERT INTO detail_buku
        (id_buku, pengarang, penerbit, tahun_terbit, halaman, id_rak, id_section, total_buku, stok_tersedia, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_buku,
        pengarang ?? null,
        penerbit ?? null,
        tahun_terbit ?? null,
        halaman ?? null,
        id_rak,
        id_section ?? null,
        jumlah,
        jumlah,
        image_url ?? null,
      ],
    )

    await connection.commit()
    return id_buku
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

exports.updateBuku = async (id_buku, data) => {
  const {
    judul_buku,
    id_category,
    pengarang,
    penerbit,
    tahun_terbit,
    halaman,
    id_rak,
    id_section,
    total_buku,
    stok_tersedia,
    image_url,
  } = data

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    await connection.query(
      'UPDATE buku SET judul_buku = ?, id_category = ? WHERE id_buku = ?',
      [judul_buku, id_category ?? null, id_buku],
    )

    await connection.query(
      `UPDATE detail_buku
       SET pengarang = ?, penerbit = ?, tahun_terbit = ?, halaman = ?,
           id_rak = ?, id_section = ?, total_buku = ?, stok_tersedia = ?, image_url = ?
       WHERE id_buku = ?`,
      [
        pengarang ?? null,
        penerbit ?? null,
        tahun_terbit ?? null,
        halaman ?? null,
        id_rak,
        id_section ?? null,
        total_buku,
        stok_tersedia,
        image_url ?? null,
        id_buku,
      ],
    )

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

exports.deleteBuku = async (id_buku) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query('DELETE FROM detail_buku WHERE id_buku = ?', [id_buku])
    const [result] = await connection.query('DELETE FROM buku WHERE id_buku = ?', [id_buku])
    await connection.commit()
    return result.affectedRows > 0
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
