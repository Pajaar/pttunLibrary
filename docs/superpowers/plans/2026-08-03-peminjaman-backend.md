# Backend Peminjaman Buku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three book-borrowing endpoints (submit loan, list loans, update loan status) backing `peminjaman`, replacing the current `501` stub, following this backend's existing `Buku*` patterns.

**Architecture:** `PeminjamanModel.js` gets three functions doing the DB work (one wrapped in a transaction for the borrow flow's stock/race-condition safety); `PeminjamanController.js` gets three handlers doing validation + calling the model; `peminjamanRoutes.js` wires `GET /`, `POST /`, `PATCH /:id/status` to them. No new tables — `peminjaman` already exists in the live DB.

**Tech Stack:** Node.js/Express, mysql2 (`db.promise()`, parameterized queries, `db.promise().getConnection()` for the one transactional flow), Node's built-in `Intl.DateTimeFormat` for Asia/Jakarta date handling (same pattern as `BukuModel.getBukuTerbaru`).

## Global Constraints

- Field names in Indonesian domain convention — no translating to English. (CLAUDE.md)
- No login/auth work of any kind. (CLAUDE.md)
- SQL must use parameterized queries (`?`) — never string interpolation.
- Follow the existing controller response pattern exactly: success → `res.json({ message, data })`; validation failure (400/404) → `res.status(xxx).json({ message })` (no `error` key — matches `BukuController.searchBuku`'s `{ message: 'Kata kunci pencarian wajib diisi' }`); unexpected/server error (500) → `res.status(500).json({ message, error: error.message })`.
- `backend/utils/response.js` exists but is unused by any current controller — do not introduce it here either, for consistency.
- `peminjaman.id_detail` holds the same value as `buku.id_buku` / `detail_buku.id_buku` — there is no separate `detail_buku` PK. All joins from `peminjaman` go `peminjaman.id_detail = detail_buku.id_buku`, then `detail_buku.id_buku = buku.id_buku`.
- `durasi_hari`: optional in the request, defaults to 7, valid range 1–7 inclusive. Outside that range → `400`.
- `POST /api/peminjaman` inserts with `status = 'dipinjam'` immediately (no approval gate) and must run its availability-check + insert + stock-decrement as one transaction, so two simultaneous requests for the last copy of a book cannot both succeed.
- `PATCH /api/peminjaman/:id/status` increments `detail_buku.stok_tersedia` by 1 only when the new status is `dikembalikan` AND the row's previous status was NOT already `dikembalikan` (idempotency guard against double-increment). Transitioning to `terlambat` never touches stock.
- `terlambat` is a **read-time computed value only** for `GET /api/peminjaman` (`due_date` in the past AND stored `status === 'dipinjam'` → reported as `terlambat`). The stored `status` column is never written by the GET endpoint — only `PATCH` writes it.
- No automated test framework in this backend — verification is manual via curl (and a couple of one-off Node scripts, see Task 1's steps) against the running dev server.
- Do not touch `/frontend`, `backend/config/database.js`, or add any login/auth — out of scope.

---

### Task 1: Peminjaman model, controller, routes + manual verification

**Files:**
- Modify: `backend/models/PeminjamanModel.js` — replace the `{ tableName: 'peminjaman' }` stub with `buatPeminjaman`, `getSemuaPeminjaman`, `updateStatusPeminjaman`.
- Modify: `backend/controllers/PeminjamanController.js` — replace the `501` stub `getPeminjaman` with three handlers.
- Modify: `backend/routes/peminjamanRoutes.js` — add `POST /` and `PATCH /:id/status`; repoint the existing `GET /` at the new handler.

**Interfaces:**
- Produces: `PeminjamanModel.buatPeminjaman({ id_detail: number, nama_peminjam: string, no_telpon: string, durasi_hari: number }) => Promise<{ error: 'NOT_FOUND' | 'OUT_OF_STOCK' } | { data: object }>`
- Produces: `PeminjamanModel.getSemuaPeminjaman() => Promise<Array<{ id_peminjaman, id_detail, nama_peminjam, no_telpon, tanggal_pinjam, durasi_hari, due_date, status, judul_buku }>>` (`status` here is the *effective* status, per Global Constraints).
- Produces: `PeminjamanModel.updateStatusPeminjaman(id_peminjaman: number|string, status: string) => Promise<object | null>` (`null` when the row doesn't exist).
- Consumes: nothing from earlier tasks (this is the only task).

- [ ] **Step 1: Replace `backend/models/PeminjamanModel.js`**

```js
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
  const [existingRows] = await db.promise().query(
    'SELECT * FROM peminjaman WHERE id_peminjaman = ?',
    [id_peminjaman],
  )
  const existing = existingRows[0]
  if (!existing) return null

  await db.promise().query(
    'UPDATE peminjaman SET status = ? WHERE id_peminjaman = ?',
    [status, id_peminjaman],
  )

  if (status === 'dikembalikan' && existing.status !== 'dikembalikan') {
    await db.promise().query(
      'UPDATE detail_buku SET stok_tersedia = stok_tersedia + 1 WHERE id_buku = ?',
      [existing.id_detail],
    )
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
```

- [ ] **Step 2: Replace `backend/controllers/PeminjamanController.js`**

```js
const PeminjamanModel = require('../models/PeminjamanModel')

const STATUS_VALUES = ['dipinjam', 'dikembalikan', 'terlambat']

exports.buatPeminjaman = async (req, res) => {
  const { id_detail, nama_peminjam, no_telpon, durasi_hari } = req.body

  const parsedIdDetail = Number.parseInt(id_detail, 10)
  if (!Number.isInteger(parsedIdDetail)) {
    return res.status(400).json({ message: 'id_detail wajib diisi dan berupa angka' })
  }

  if (typeof nama_peminjam !== 'string' || nama_peminjam.trim() === '') {
    return res.status(400).json({ message: 'Nama peminjam wajib diisi' })
  }

  if (typeof no_telpon !== 'string' || no_telpon.trim() === '') {
    return res.status(400).json({ message: 'Nomor telepon wajib diisi' })
  }

  let parsedDurasi = 7
  if (durasi_hari !== undefined) {
    parsedDurasi = Number.parseInt(durasi_hari, 10)
    if (!Number.isInteger(parsedDurasi) || parsedDurasi < 1 || parsedDurasi > 7) {
      return res.status(400).json({ message: 'durasi_hari harus berupa angka antara 1 dan 7' })
    }
  }

  try {
    const result = await PeminjamanModel.buatPeminjaman({
      id_detail: parsedIdDetail,
      nama_peminjam: nama_peminjam.trim(),
      no_telpon: no_telpon.trim(),
      durasi_hari: parsedDurasi,
    })

    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }
    if (result.error === 'OUT_OF_STOCK') {
      return res.status(400).json({ message: 'Buku sedang tidak tersedia' })
    }

    res.json({
      message: 'Peminjaman berhasil diajukan',
      data: result.data,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mengajukan peminjaman',
      error: error.message,
    })
  }
}

exports.getSemuaPeminjaman = async (req, res) => {
  try {
    const peminjaman = await PeminjamanModel.getSemuaPeminjaman()
    res.json({
      message: 'Data peminjaman berhasil diambil',
      data: peminjaman,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mengambil data peminjaman',
      error: error.message,
    })
  }
}

exports.updateStatusPeminjaman = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!STATUS_VALUES.includes(status)) {
    return res.status(400).json({
      message: `status harus salah satu dari: ${STATUS_VALUES.join(', ')}`,
    })
  }

  try {
    const updated = await PeminjamanModel.updateStatusPeminjaman(id, status)
    if (!updated) {
      return res.status(404).json({ message: 'Data peminjaman tidak ditemukan' })
    }

    res.json({
      message: 'Status peminjaman berhasil diperbarui',
      data: updated,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Gagal memperbarui status peminjaman',
      error: error.message,
    })
  }
}
```

- [ ] **Step 3: Replace `backend/routes/peminjamanRoutes.js`**

```js
const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');

const router = express.Router();

router.get('/', peminjamanController.getSemuaPeminjaman);
router.post('/', peminjamanController.buatPeminjaman);
router.patch('/:id/status', peminjamanController.updateStatusPeminjaman);

module.exports = router;
```

- [ ] **Step 4: Start the backend dev server**

Use the preview tool (`preview_start` with `{"name": "backend"}` — the `.claude/launch.json` entry for this already exists from a prior task). Confirm the startup log: `Server backend berjalan di http://localhost:5000`. If it fails with a DB connection error, STOP and report BLOCKED — do not modify `backend/config/database.js`; ask for MySQL to be started.

- [ ] **Step 5: Find a book with stock to borrow, and record its starting stock**

```bash
curl -s "http://localhost:5000/api/buku" | node -e "
  let d='';process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    const body = JSON.parse(d);
    const withStock = body.data.find(b => b.stok_tersedia > 0);
    console.log(JSON.stringify(withStock));
  });
"
```

Note the `id_buku` and `stok_tersedia` from the output — call these `TEST_ID` and `TEST_STOCK` for the rest of this task's steps.

- [ ] **Step 6: `POST /api/peminjaman` happy path — borrow succeeds, stock drops by 1**

```bash
curl -s -X POST "http://localhost:5000/api/peminjaman" \
  -H "Content-Type: application/json" \
  -d '{"id_detail": TEST_ID, "nama_peminjam": "Budi Santoso", "no_telpon": "081234567890"}'
```

Expected: `200`, `data` includes `id_peminjaman`, `status: "dipinjam"`, `judul_buku`, `due_date` = 7 days after `tanggal_pinjam` (default `durasi_hari`). Note the returned `id_peminjaman` as `TEST_LOAN_ID`.

Then confirm stock dropped:
```bash
curl -s "http://localhost:5000/api/buku/TEST_ID" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.stok_tersedia))"
```
Expected: `TEST_STOCK - 1`.

- [ ] **Step 7: Validation — missing fields and bad `durasi_hari` are rejected with 400**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/peminjaman" -H "Content-Type: application/json" -d '{"id_detail": TEST_ID, "no_telpon": "0812"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/peminjaman" -H "Content-Type: application/json" -d '{"id_detail": TEST_ID, "nama_peminjam": "Budi"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/peminjaman" -H "Content-Type: application/json" -d '{"id_detail": TEST_ID, "nama_peminjam": "Budi", "no_telpon": "0812", "durasi_hari": 10}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/peminjaman" -H "Content-Type: application/json" -d '{"id_detail": 99999999, "nama_peminjam": "Budi", "no_telpon": "0812"}'
```

Expected: `400`, `400`, `400`, `404` respectively (missing `nama_peminjam`, missing `no_telpon`, `durasi_hari` out of range, nonexistent `id_detail`).

- [ ] **Step 8: Out-of-stock rejection — drain `TEST_STOCK - 1` remaining copies, then confirm the next borrow is rejected**

`TEST_STOCK - 1` copies remain after Step 6. Loop that many more successful borrows (reusing the same curl from Step 6, each returns a new `id_peminjaman` — collect all of them, including the one from Step 6, into a list called `ALL_LOAN_IDS` for cleanup in Step 10), until stock hits 0. Then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/peminjaman" -H "Content-Type: application/json" -d '{"id_detail": TEST_ID, "nama_peminjam": "Budi", "no_telpon": "0812"}'
```

Expected: `400` (`"Buku sedang tidak tersedia"`), and `GET /api/buku/TEST_ID` still shows `stok_tersedia: 0` (unchanged by the rejected attempt).

- [ ] **Step 9: `GET /api/peminjaman` — list includes `judul_buku`, ordered by `tanggal_pinjam DESC`**

```bash
curl -s "http://localhost:5000/api/peminjaman" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const b=JSON.parse(d);console.log('count:',b.data.length);console.log('sample:',b.data[0])})"
```

Expected: includes all loans created in Steps 6 and 8, each with `judul_buku` present and matching `TEST_ID`'s book.

- [ ] **Step 10: `PATCH /:id/status` to `dikembalikan` restores stock; calling it twice doesn't double-credit**

```bash
curl -s -X PATCH "http://localhost:5000/api/peminjaman/TEST_LOAN_ID/status" -H "Content-Type: application/json" -d '{"status": "dikembalikan"}'
curl -s "http://localhost:5000/api/buku/TEST_ID" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.stok_tersedia))"
```
Expected: stock is now `1` (was `0` after Step 8).

```bash
curl -s -X PATCH "http://localhost:5000/api/peminjaman/TEST_LOAN_ID/status" -H "Content-Type: application/json" -d '{"status": "dikembalikan"}'
curl -s "http://localhost:5000/api/buku/TEST_ID" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.stok_tersedia))"
```
Expected: stock is **still `1`** (not `2`) — the double-increment guard held.

- [ ] **Step 11: `PATCH /:id/status` rejects an invalid status value**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH "http://localhost:5000/api/peminjaman/TEST_LOAN_ID/status" -H "Content-Type: application/json" -d '{"status": "hilang"}'
```
Expected: `400`.

- [ ] **Step 12: `terlambat` computed status — verify without a scheduler**

There's no endpoint to backdate `due_date`, and no test framework, so use a one-off Node script that reuses the existing DB pool to backdate one test loan's `due_date`, verify, then restore it:

```bash
cat > /tmp/backdate-test.js <<'EOF'
const db = require('./backend/config/database')
const id = process.argv[2]
const action = process.argv[3] // 'backdate' or 'restore'

async function main() {
  if (action === 'backdate') {
    await db.promise().query(
      "UPDATE peminjaman SET due_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id_peminjaman = ?",
      [id],
    )
    console.log('backdated')
  } else if (action === 'check-raw') {
    const [rows] = await db.promise().query(
      'SELECT status FROM peminjaman WHERE id_peminjaman = ?',
      [id],
    )
    console.log('raw status in DB:', rows[0].status)
  } else {
    await db.promise().query(
      "UPDATE peminjaman SET due_date = DATE_ADD(tanggal_pinjam, INTERVAL durasi_hari DAY) WHERE id_peminjaman = ?",
      [id],
    )
    console.log('restored')
  }
  process.exit(0)
}
main()
EOF
node /tmp/backdate-test.js ANOTHER_LOAN_ID backdate
```

Pick `ANOTHER_LOAN_ID` from `ALL_LOAN_IDS` (Step 8) that is still `dipinjam` (not the one marked `dikembalikan` in Step 10). Then:

```bash
curl -s "http://localhost:5000/api/peminjaman" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const row=JSON.parse(d).data.find(r=>String(r.id_peminjaman)===process.argv[1]);console.log(row.status)})" ANOTHER_LOAN_ID
```
Expected: `terlambat` (the computed/effective status in the API response).

Now prove the underlying DB column was **not** written by that GET call — this is the core claim of decision #3, so verify it directly, not just infer it:
```bash
node /tmp/backdate-test.js ANOTHER_LOAN_ID check-raw
```
Expected: `raw status in DB: dipinjam` — still the original stored value, proving `GET /api/peminjaman` only computed a derived value in the response and never issued a write.

Then restore the row and clean up:
```bash
node /tmp/backdate-test.js ANOTHER_LOAN_ID restore
rm /tmp/backdate-test.js
```

- [ ] **Step 13: Self-review**

Confirm: field names Indonesian throughout; no string-interpolated SQL anywhere (grep the two model functions for template literals containing `${` next to SQL keywords — there should be none in query strings, only in the `INSERT`/`SELECT` templates which use `?` placeholders); `backend/utils/response.js` was not imported; `backend/config/database.js` was not modified; no frontend files touched.

- [ ] **Step 14: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are inside the worktree directory you were told to work from, on the branch you were told to commit to. If either doesn't match, STOP and report back — do not commit.

```bash
git add backend/models/PeminjamanModel.js backend/controllers/PeminjamanController.js backend/routes/peminjamanRoutes.js
git commit -m "$(cat <<'EOF'
Implement backend peminjaman endpoints (submit, list, update status)

POST /api/peminjaman borrows immediately (no approval gate) inside a
transaction that guards the last-copy race condition. GET /api/peminjaman
computes an effective 'terlambat' status at read time without writing to
the DB. PATCH /:id/status restores stock on return, guarded against
double-increment.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message** — this is a hard requirement.
