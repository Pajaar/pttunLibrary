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

// Auto-flag: peminjaman yang sudah lewat due_date otomatis ditandai
// 'terlambat' (bukan 'dikembalikan') tanpa perlu aksi manual staf. Stok
// tidak disentuh -- buku masih dianggap keluar sampai staf mengonfirmasi
// pengembalian fisik lewat PATCH /:id/status.
exports.reconcileOverdueLoans = async () => {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })
  const today = dateFormatter.format(new Date())

  await db.promise().query(
    `UPDATE peminjaman
     SET status = 'terlambat'
     WHERE status = 'dipinjam' AND due_date < ?`,
    [today],
  )
}

exports.getSemuaPeminjaman = async () => {
  const [rows] = await db.promise().query(
    `SELECT p.id_peminjaman, p.id_detail, p.nama_peminjam, p.no_telpon,
            DATE_FORMAT(p.tanggal_pinjam, '%Y-%m-%d') AS tanggal_pinjam,
            p.durasi_hari,
            DATE_FORMAT(p.due_date, '%Y-%m-%d') AS due_date,
            p.status,
            b.judul_buku
     FROM peminjaman p
     JOIN detail_buku d ON d.id_buku = p.id_detail
     JOIN buku b ON b.id_buku = d.id_buku
     ORDER BY p.tanggal_pinjam DESC, p.id_peminjaman DESC`,
  )

  return rows
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
        'UPDATE detail_buku SET stok_tersedia = stok_tersedia + 1 WHERE id_buku = ? AND stok_tersedia < total_buku',
        [existing.id_detail],
      )
    } else if (status !== 'dikembalikan' && existing.status === 'dikembalikan') {
      await connection.query(
        'UPDATE detail_buku SET stok_tersedia = stok_tersedia - 1 WHERE id_buku = ? AND stok_tersedia > 0',
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

function hitungDueDate(tanggal_pinjam, durasi_hari) {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })
  const dueDateObj = new Date(`${tanggal_pinjam}T00:00:00Z`)
  dueDateObj.setUTCDate(dueDateObj.getUTCDate() + durasi_hari)
  return dateFormatter.format(dueDateObj)
}

exports.updatePeminjaman = async (id_peminjaman, data) => {
  const { nama_peminjam, no_telpon, durasi_hari } = data

  const connection = await db.promise().getConnection()
  try {
    await connection.beginTransaction()

    const [existingRows] = await connection.query(
      `SELECT *, DATE_FORMAT(tanggal_pinjam, '%Y-%m-%d') AS tanggal_pinjam_str
       FROM peminjaman WHERE id_peminjaman = ? FOR UPDATE`,
      [id_peminjaman],
    )
    const existing = existingRows[0]
    if (!existing) {
      await connection.rollback()
      return null
    }

    const due_date = hitungDueDate(existing.tanggal_pinjam_str, durasi_hari)

    await connection.query(
      `UPDATE peminjaman
       SET nama_peminjam = ?, no_telpon = ?, durasi_hari = ?, due_date = ?
       WHERE id_peminjaman = ?`,
      [nama_peminjam, no_telpon, durasi_hari, due_date, id_peminjaman],
    )

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  const [rows] = await db.promise().query(
    `SELECT p.*, b.judul_buku
     FROM peminjaman p
     JOIN detail_buku d ON d.id_buku = p.id_detail
     JOIN buku b ON b.id_buku = d.id_buku
     WHERE p.id_peminjaman = ?`,
    [id_peminjaman],
  )
  return rows[0]
}

exports.deletePeminjaman = async (id_peminjaman) => {
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
      return false
    }

    await connection.query('DELETE FROM peminjaman WHERE id_peminjaman = ?', [id_peminjaman])

    if (existing.status === 'dipinjam') {
      await connection.query(
        'UPDATE detail_buku SET stok_tersedia = stok_tersedia + 1 WHERE id_buku = ? AND stok_tersedia < total_buku',
        [existing.id_detail],
      )
    }

    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

exports.cekPeminjaman = async ({ nama_peminjam, no_telpon }) => {
  const [rows] = await db.promise().query(
    `SELECT p.id_peminjaman, p.id_detail, p.nama_peminjam, p.no_telpon,
            DATE_FORMAT(p.tanggal_pinjam, '%Y-%m-%d') AS tanggal_pinjam,
            p.durasi_hari,
            DATE_FORMAT(p.due_date, '%Y-%m-%d') AS due_date,
            p.status,
            b.judul_buku
     FROM peminjaman p
     JOIN detail_buku d ON d.id_buku = p.id_detail
     JOIN buku b ON b.id_buku = d.id_buku
     WHERE LOWER(TRIM(p.nama_peminjam)) = LOWER(?)
       AND TRIM(p.no_telpon) = ?
     ORDER BY p.tanggal_pinjam DESC, p.id_peminjaman DESC`,
    [nama_peminjam, no_telpon],
  )
  return rows
}
