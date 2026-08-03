const db = require('../config/database')

exports.buatPeminjaman = async ({ id_detail, nama_peminjam, no_telpon, durasi_hari }) => {
  const connection = await db.promise().getConnection()
  try {
    await connection.beginTransaction()

    const [existingRows] = await connection.query(
      'SELECT id_buku FROM detail_buku WHERE id_buku = ?',
      [id_detail],
    )
    if (existingRows.length === 0) {
      await connection.rollback()
      return { error: 'NOT_FOUND' }
    }

    const [stockResult] = await connection.query(
      'UPDATE detail_buku SET stok_tersedia = stok_tersedia - 1 WHERE id_buku = ? AND stok_tersedia > 0',
      [id_detail],
    )
    if (stockResult.affectedRows === 0) {
      await connection.rollback()
      return { error: 'OUT_OF_STOCK' }
    }

    const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })
    const tanggal_pinjam = dateFormatter.format(new Date())
    const dueDateObj = new Date(`${tanggal_pinjam}T00:00:00Z`)
    dueDateObj.setUTCDate(dueDateObj.getUTCDate() + durasi_hari)
    const due_date = dateFormatter.format(dueDateObj)

    const [insertResult] = await connection.query(
      `INSERT INTO peminjaman (id_detail, nama_peminjam, no_telpon, tanggal_pinjam, durasi_hari, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'dipinjam')`,
      [id_detail, nama_peminjam, no_telpon, tanggal_pinjam, durasi_hari, due_date],
    )

    const [rows] = await connection.query(
      `SELECT p.*, b.judul_buku
       FROM peminjaman p
       JOIN detail_buku d ON d.id_buku = p.id_detail
       JOIN buku b ON b.id_buku = d.id_buku
       WHERE p.id_peminjaman = ?`,
      [insertResult.insertId],
    )

    await connection.commit()
    return { data: rows[0] }
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

exports.getSemuaPeminjaman = async () => {
  const [rows] = await db.promise().query(
    `SELECT p.id_peminjaman, p.id_detail, p.nama_peminjam, p.no_telpon,
            p.tanggal_pinjam, p.durasi_hari, p.due_date, p.status,
            b.judul_buku
     FROM peminjaman p
     JOIN detail_buku d ON d.id_buku = p.id_detail
     JOIN buku b ON b.id_buku = d.id_buku
     ORDER BY p.tanggal_pinjam DESC`,
  )

  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })
  const today = dateFormatter.format(new Date())

  return rows.map((row) => {
    const dueDateStr = dateFormatter.format(new Date(row.due_date))
    const statusEfektif = row.status === 'dipinjam' && dueDateStr < today ? 'terlambat' : row.status
    return { ...row, status: statusEfektif }
  })
}

exports.updateStatusPeminjaman = async (id_peminjaman, status) => {
  const connection = await db.promise().getConnection()
  try {
    await connection.beginTransaction()

    const [existingRows] = await connection.query(
      'SELECT * FROM peminjaman WHERE id_peminjaman = ? FOR UPDATE',
      [id_peminjaman],
    )
    const existing = existingRows[0]
    if (!existing) {
      await connection.rollback()
      return null
    }

    await connection.query(
      'UPDATE peminjaman SET status = ? WHERE id_peminjaman = ?',
      [status, id_peminjaman],
    )

    if (status === 'dikembalikan' && existing.status !== 'dikembalikan') {
      await connection.query(
        'UPDATE detail_buku SET stok_tersedia = stok_tersedia + 1 WHERE id_buku = ?',
        [existing.id_detail],
      )
    }

    const [rows] = await connection.query(
      `SELECT p.*, b.judul_buku
       FROM peminjaman p
       JOIN detail_buku d ON d.id_buku = p.id_detail
       JOIN buku b ON b.id_buku = d.id_buku
       WHERE p.id_peminjaman = ?`,
      [id_peminjaman],
    )

    await connection.commit()
    return rows[0]
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}
