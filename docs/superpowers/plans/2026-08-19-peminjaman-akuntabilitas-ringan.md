# Peminjaman Lightweight Accountability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `reconcileOverdueLoans` bug that silently marks overdue loans "returned," add a required commitment checkbox to the borrow form, and let a borrower check their own loan status/history without any login — three independent, login-free changes to the public `peminjaman` flow.

**Architecture:** Backend-first, bottom-up: fix the existing overdue-handling query, add one more required field to the existing borrow endpoint's validation, then add a new read-only public endpoint (`GET /api/peminjaman/cek`) backed by a new model function. Frontend last: a new lookup page consuming that endpoint, then the borrow form's commitment checkbox + a link tying the two flows together.

**Tech Stack:** Node.js/Express, mysql2 (`db.promise()`, parameterized queries) on the backend; Vue 3 `<script setup>`, vue-router on the frontend. No test framework in this codebase — verification is manual, via curl (backend) and the browser preview tool (frontend), matching the existing plans in `docs/superpowers/plans/`.

## Global Constraints

- Field names stay in Indonesian domain convention — no translating to English. (CLAUDE.md)
- No login/auth work of any kind, for borrowers or otherwise. (CLAUDE.md)
- Do not touch anything under `frontend/src/views/admin/`, `frontend/src/layouts/AdminLayout.vue`, `backend/routes/adminRoutes.js`, or `backend/routes/adminPeminjamanRoutes.js` — the admin dashboard is out of scope for this session (explicit user instruction).
- SQL must use parameterized queries (`?`) — never string interpolation.
- Response pattern, unchanged from the existing codebase: success → `res.json({ message, data })`; validation failure (400/404) → `res.status(xxx).json({ message })` (no `error` key); unexpected/server error (500) → `res.status(500).json({ message })` (no `error` key either — this codebase intentionally does not leak raw DB errors to clients, see `docs/superpowers/specs/2026-08-18-dashboard-merge-design.md` §7).
- `peminjaman.id_detail` holds the same value as `buku.id_buku` / `detail_buku.id_buku` — there is no separate `detail_buku` PK.
- A loan transitioning to `'terlambat'` never touches `detail_buku.stok_tersedia` — only a transition to `'dikembalikan'` (via the existing, unchanged admin `PATCH /:id/status`) restores stock.
- The commitment checkbox field (`konfirmasi_tanggung_jawab`) is validated as required but **never persisted** to the `peminjaman` table — no new DB column.
- The new lookup endpoint (`GET /api/peminjaman/cek`) matches `nama_peminjam` case-insensitively (trimmed) and `no_telpon` as an exact trimmed match — no phone-number format normalization is introduced.
- No automated test framework in this codebase — verification is manual via curl (backend) and the browser preview tool (frontend), against the running dev server.
- Full design rationale: `docs/superpowers/specs/2026-08-19-peminjaman-akuntabilitas-ringan-design.md`.

---

### Task 1: Fix `reconcileOverdueLoans`, simplify `getSemuaPeminjaman`

**Files:**
- Modify: `backend/models/PeminjamanModel.js:57-95`
- Modify: `backend/routes/index.js:11-12`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `PeminjamanModel.reconcileOverdueLoans() => Promise<void>` (unchanged signature, new behavior — no longer touches `stok_tersedia`). `PeminjamanModel.getSemuaPeminjaman() => Promise<Array<{ id_peminjaman, id_detail, nama_peminjam, no_telpon, tanggal_pinjam, durasi_hari, due_date, status, judul_buku }>>` (unchanged signature/shape — `status` is now the raw stored column, since it's already correct by read time thanks to the fixed middleware). Both are already consumed by `backend/routes/adminPeminjamanRoutes.js` and `frontend/src/views/admin/LoanMonitoringView.vue` (admin dashboard) — confirmed those only read `loan.status` directly and expect `'terlambat'`/`'dikembalikan'`/`'dipinjam'` as string values, so this task requires no admin-side change.

- [ ] **Step 1: Replace `backend/models/PeminjamanModel.js:57-95`**

Current content (lines 57-95):

```js
// Auto-return: peminjaman yang sudah lewat due_date otomatis ditandai
// dikembalikan dan stoknya dikembalikan, tanpa perlu aksi manual staf.
exports.reconcileOverdueLoans = async () => {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })
  const today = dateFormatter.format(new Date())

  await db.promise().query(
    `UPDATE peminjaman p
     JOIN detail_buku d ON d.id_buku = p.id_detail
     SET p.status = 'dikembalikan',
         d.stok_tersedia = LEAST(d.stok_tersedia + 1, d.total_buku)
     WHERE p.status != 'dikembalikan'
       AND p.due_date < ?`,
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

  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })
  const today = dateFormatter.format(new Date())

  return rows.map((row) => {
    const statusEfektif = row.status === 'dipinjam' && row.due_date < today ? 'terlambat' : row.status
    return { ...row, status: statusEfektif }
  })
}
```

Replace with:

```js
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
```

- [ ] **Step 2: Replace `backend/routes/index.js:11-12`**

Current content:

```js
// Auto-return peminjaman yang sudah melewati due_date sebelum request diproses,
// supaya stok/status yang dilihat/digunakan selalu up-to-date tanpa aksi manual.
```

Replace with:

```js
// Auto-flag peminjaman yang sudah melewati due_date sebagai 'terlambat' sebelum
// request diproses, supaya status yang dilihat/digunakan selalu up-to-date --
// stok tidak disentuh, buku dianggap masih keluar sampai staf konfirmasi manual.
```

- [ ] **Step 3: Start the backend dev server**

Use the preview tool (`preview_start` with `{"name": "backend"}`). Confirm the
startup log shows the server running with no errors. If it fails with a DB
connection error, STOP and report BLOCKED — do not modify
`backend/config/database.js`.

- [ ] **Step 4: Create a test loan and note its id**

Find a book with stock, then borrow it:

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

Note `id_buku` as `TEST_ID`. Then:

```bash
curl -s -X POST "http://localhost:5000/api/peminjaman" \
  -H "Content-Type: application/json" \
  -d '{"id_detail": TEST_ID, "nama_peminjam": "Reconcile Test", "no_telpon": "081200000001", "konfirmasi_tanggung_jawab": true}'
```

Note the returned `id_peminjaman` as `TEST_LOAN_ID` and `due_date` from the
response. This request will get a `400` for the not-yet-added
`konfirmasi_tanggung_jawab` check from Task 2 if Task 2 already landed first
— since this plan executes Task 1 before Task 2, that field does not exist
yet and is simply ignored by the current validation; the call succeeds with
`status: "dipinjam"`.

- [ ] **Step 5: Backdate the test loan's `due_date`, then trigger the middleware**

There's no endpoint to backdate `due_date`, so use a one-off Node script
that reuses the existing DB pool:

```bash
cat > /tmp/backdate-test.js <<'EOF'
const db = require('./backend/config/database')
const id = process.argv[2]
const action = process.argv[3] // 'backdate', 'check-raw', or 'restore'

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
node /tmp/backdate-test.js TEST_LOAN_ID backdate
```

- [ ] **Step 6: Confirm the loan auto-flags to `'terlambat'` without touching stock**

Record `TEST_ID`'s current `stok_tersedia`:

```bash
curl -s "http://localhost:5000/api/buku/TEST_ID" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.stok_tersedia))"
```

Then make any request (this fires the `reconcileOverdueLoans` middleware),
and check the raw DB status directly:

```bash
curl -s "http://localhost:5000/api/buku" > /dev/null
node /tmp/backdate-test.js TEST_LOAN_ID check-raw
```

Expected: `raw status in DB: terlambat`. Then re-check `stok_tersedia` on
`TEST_ID` with the same curl as above — expected: **unchanged** from before
this step (proves the fix: no more silent stock restoration on overdue).

- [ ] **Step 7: Confirm idempotency — running the middleware again doesn't error or change anything further**

```bash
curl -s "http://localhost:5000/api/buku" > /dev/null
node /tmp/backdate-test.js TEST_LOAN_ID check-raw
```

Expected: still `raw status in DB: terlambat`, no error in the server log.

- [ ] **Step 8: Confirm staff can still manually mark it `'dikembalikan'` and stock restores**

```bash
curl -s -X PATCH "http://localhost:5000/api/peminjaman/TEST_LOAN_ID/status" -H "Content-Type: application/json" -d '{"status": "dikembalikan"}'
curl -s "http://localhost:5000/api/buku/TEST_ID" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.stok_tersedia))"
```

Expected: `200` from the PATCH, and `stok_tersedia` is now 1 higher than it
was after Step 6 (stock restored exactly once, via the manual staff action —
not by the auto-flag).

- [ ] **Step 9: Clean up the scratch script**

```bash
rm /tmp/backdate-test.js
```

(No need to delete `TEST_LOAN_ID` — it's left in a correct final state,
`'dikembalikan'`, same as real usage would produce.)

- [ ] **Step 10: Self-review**

Confirm: no string-interpolated SQL introduced (the two queries in this task
use only `?` placeholders); the comment in `backend/routes/index.js` matches
the new behavior; `backend/routes/adminPeminjamanRoutes.js` was not modified;
no frontend files touched.

- [ ] **Step 11: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`.
Confirm you are inside the correct working directory and branch. If either
doesn't match what you were told to work from, STOP and report back.

```bash
git add backend/models/PeminjamanModel.js backend/routes/index.js
git commit -m "$(cat <<'EOF'
Fix reconcileOverdueLoans to stop conflating overdue with returned

Overdue loans now auto-flag to 'terlambat' without touching stock,
instead of being silently marked 'dikembalikan' with stock restored.
Only a staff-confirmed PATCH to 'dikembalikan' now restores stock.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**

---

### Task 2: Require a commitment confirmation on `POST /api/peminjaman`

**Files:**
- Modify: `backend/controllers/PeminjamanController.js:6-29`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `POST /api/peminjaman` now requires `konfirmasi_tanggung_jawab: true` in the request body — `400` with `{ message: 'Pernyataan tanggung jawab wajib disetujui' }` if missing or not exactly `true`. This is consumed by Task 5 (the frontend checkbox that sets this field).

- [ ] **Step 1: Replace `backend/controllers/PeminjamanController.js:6-29`**

Current content (lines 6-29):

```js
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
```

Replace with:

```js
exports.buatPeminjaman = async (req, res) => {
  const { id_detail, nama_peminjam, no_telpon, durasi_hari, konfirmasi_tanggung_jawab } = req.body

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

  if (konfirmasi_tanggung_jawab !== true) {
    return res.status(400).json({ message: 'Pernyataan tanggung jawab wajib disetujui' })
  }

  try {
```

- [ ] **Step 2: Confirm (or start) the backend dev server**

Use `preview_start` with `{"name": "backend"}` if not already running from
Task 1.

- [ ] **Step 3: Verify the new field is required**

Find a book with stock (same technique as Task 1 Step 4), call it
`TEST_ID`. Then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/peminjaman" \
  -H "Content-Type: application/json" \
  -d '{"id_detail": TEST_ID, "nama_peminjam": "Budi", "no_telpon": "0812"}'
```

Expected: `400` (field missing entirely).

```bash
curl -s -X POST "http://localhost:5000/api/peminjaman" \
  -H "Content-Type: application/json" \
  -d '{"id_detail": TEST_ID, "nama_peminjam": "Budi", "no_telpon": "0812", "konfirmasi_tanggung_jawab": false}'
```

Expected: `400`, body `{"message":"Pernyataan tanggung jawab wajib disetujui"}`.

- [ ] **Step 4: Verify a valid submission (with the field `true`) still succeeds**

```bash
curl -s -X POST "http://localhost:5000/api/peminjaman" \
  -H "Content-Type: application/json" \
  -d '{"id_detail": TEST_ID, "nama_peminjam": "Budi Confirm Test", "no_telpon": "081200000002", "konfirmasi_tanggung_jawab": true}'
```

Expected: `200`, `data.status === "dipinjam"`.

- [ ] **Step 5: Self-review**

Confirm: the new check sits after the existing three validations and before
the `try` block (matching existing ordering/style); no other line in the
file was touched; the check is a strict `!== true` comparison (not a
truthiness check), so a string `"true"` from a malformed client would still
be rejected.

- [ ] **Step 6: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`
and confirm they match where you're expected to be.

```bash
git add backend/controllers/PeminjamanController.js
git commit -m "$(cat <<'EOF'
Require commitment confirmation on peminjaman submission

POST /api/peminjaman now rejects requests missing
konfirmasi_tanggung_jawab: true, mirroring the existing
nama_peminjam/no_telpon validation style. Not persisted to the
peminjaman table -- submission gate only, no new column.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**

---

### Task 3: Public loan lookup endpoint — `GET /api/peminjaman/cek`

**Files:**
- Modify: `backend/models/PeminjamanModel.js` (append a new export)
- Modify: `backend/controllers/PeminjamanController.js` (append a new export)
- Modify: `backend/routes/peminjamanRoutes.js`

**Interfaces:**
- Consumes: nothing from other tasks (independent of Tasks 1-2; only needs
  the existing `peminjaman`/`detail_buku`/`buku` schema and `writeLimiter`).
- Produces: `PeminjamanModel.cekPeminjaman({ nama_peminjam: string, no_telpon:
  string }) => Promise<Array<{ id_peminjaman, id_detail, nama_peminjam,
  no_telpon, tanggal_pinjam, durasi_hari, due_date, status, judul_buku }>>`
  (empty array when nothing matches). `GET /api/peminjaman/cek?nama_peminjam=
  ...&no_telpon=...` — consumed by Task 4's frontend page.

- [ ] **Step 1: Add `cekPeminjaman` to `backend/models/PeminjamanModel.js`**

Append this new export at the end of the file (after `deletePeminjaman`):

```js

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
```

- [ ] **Step 2: Add `cekPeminjaman` to `backend/controllers/PeminjamanController.js`**

Append this new export at the end of the file (after `deletePeminjaman`):

```js

exports.cekPeminjaman = async (req, res) => {
  const { nama_peminjam, no_telpon } = req.query

  if (typeof nama_peminjam !== 'string' || nama_peminjam.trim() === '') {
    return res.status(400).json({ message: 'Nama peminjam wajib diisi' })
  }

  if (typeof no_telpon !== 'string' || no_telpon.trim() === '') {
    return res.status(400).json({ message: 'Nomor telepon wajib diisi' })
  }

  try {
    const peminjaman = await PeminjamanModel.cekPeminjaman({
      nama_peminjam: nama_peminjam.trim(),
      no_telpon: no_telpon.trim(),
    })
    res.json({
      message: 'Data peminjaman berhasil diambil',
      data: peminjaman,
    })
  } catch (error) {
    console.error('Gagal mengambil data peminjaman:', error)
    res.status(500).json({
      message: 'Gagal mengambil data peminjaman',
    })
  }
}
```

- [ ] **Step 3: Replace `backend/routes/peminjamanRoutes.js`**

Current content:

```js
const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', writeLimiter, peminjamanController.buatPeminjaman);

module.exports = router;
```

Replace with:

```js
const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', writeLimiter, peminjamanController.buatPeminjaman);
router.get('/cek', writeLimiter, peminjamanController.cekPeminjaman);

module.exports = router;
```

- [ ] **Step 4: Confirm (or start) the backend dev server**

Use `preview_start` with `{"name": "backend"}` if not already running.

- [ ] **Step 5: Create a known test loan to search for**

Find a book with stock (`TEST_ID`, same technique as before), then:

```bash
curl -s -X POST "http://localhost:5000/api/peminjaman" \
  -H "Content-Type: application/json" \
  -d '{"id_detail": TEST_ID, "nama_peminjam": "Cek Lookup Test", "no_telpon": "081277778888", "konfirmasi_tanggung_jawab": true}'
```

Note the returned `judul_buku` for comparison in the next step.

- [ ] **Step 6: Verify an exact-match lookup finds it**

```bash
curl -s "http://localhost:5000/api/peminjaman/cek?nama_peminjam=Cek%20Lookup%20Test&no_telpon=081277778888"
```

Expected: `200`, `data` contains one entry with `judul_buku` matching Step
5's response and `status: "dipinjam"`.

- [ ] **Step 7: Verify case-insensitive name matching**

```bash
curl -s "http://localhost:5000/api/peminjaman/cek?nama_peminjam=CEK%20LOOKUP%20TEST&no_telpon=081277778888"
```

Expected: same result as Step 6 (still matches despite different
capitalization).

- [ ] **Step 8: Verify phone number is an exact match (documented limitation)**

```bash
curl -s "http://localhost:5000/api/peminjaman/cek?nama_peminjam=Cek%20Lookup%20Test&no_telpon=0812-7777-8888"
```

Expected: `200`, `data: []` — a differently-formatted phone number does not
match, confirming the documented limitation from the design spec (no
normalization).

- [ ] **Step 9: Verify no-match returns an empty array, not an error**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/peminjaman/cek?nama_peminjam=Nobody%20Here&no_telpon=000000"
curl -s "http://localhost:5000/api/peminjaman/cek?nama_peminjam=Nobody%20Here&no_telpon=000000"
```

Expected: `200`, body `{"message":"Data peminjaman berhasil diambil","data":[]}`.

- [ ] **Step 10: Verify missing params are rejected**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/peminjaman/cek?nama_peminjam=Cek%20Lookup%20Test"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/peminjaman/cek?no_telpon=081277778888"
```

Expected: `400`, `400`.

- [ ] **Step 11: Self-review**

Confirm: the new SQL query uses only `?` placeholders (no interpolation);
`cekPeminjaman` was added to `peminjamanRoutes.js` (public, unauthenticated
router) and not to `adminPeminjamanRoutes.js`; the route reuses the existing
`writeLimiter` import already present in the file (no new middleware file
created); response shape for both success and empty-result cases matches
`{ message, data }`.

- [ ] **Step 12: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`
and confirm they match where you're expected to be.

```bash
git add backend/models/PeminjamanModel.js backend/controllers/PeminjamanController.js backend/routes/peminjamanRoutes.js
git commit -m "$(cat <<'EOF'
Add public loan lookup endpoint (GET /api/peminjaman/cek)

Borrowers can check their own loan status/history without an account
by re-submitting the same name + phone number used to borrow. Name
matching is case-insensitive; phone matching is an exact trimmed
match, consistent with this codebase's existing lack of phone format
validation.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**

---

### Task 4: "Cek Peminjaman" page (frontend)

**Files:**
- Modify: `frontend/src/services/loanService.js`
- Modify: `frontend/src/router/index.js:29-38`
- Modify: `frontend/src/layouts/GuestLayout.vue:239-257`
- Create: `frontend/src/views/CekPeminjamanView.vue`

**Interfaces:**
- Consumes: `GET /api/peminjaman/cek` from Task 3; `apiRequest` from
  `frontend/src/services/api.js` (already fixed to surface backend error
  messages, per `docs/superpowers/plans/2026-08-03-peminjaman-form.md`
  Task 1 — already merged to `main`, not touched here).
- Produces: `cekStatusPeminjaman({ nama_peminjam, no_telpon })` in
  `loanService.js`. Route name `'cek-peminjaman'` — consumed by Task 5's
  link from the borrow-success screen, and by the new nav item added in
  this task.

- [ ] **Step 1: Add `cekStatusPeminjaman` to `frontend/src/services/loanService.js`**

Current content:

```js
import { apiRequest } from './api';

export const getPeminjaman = () => apiRequest('/peminjaman');

export const ajukanPeminjaman = (payload) =>
  apiRequest('/peminjaman', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
```

Replace with:

```js
import { apiRequest } from './api';

export const getPeminjaman = () => apiRequest('/peminjaman');

export const ajukanPeminjaman = (payload) =>
  apiRequest('/peminjaman', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const cekStatusPeminjaman = ({ nama_peminjam, no_telpon }) =>
  apiRequest(
    `/peminjaman/cek?nama_peminjam=${encodeURIComponent(nama_peminjam)}&no_telpon=${encodeURIComponent(no_telpon)}`,
  );
```

- [ ] **Step 2: Add the route in `frontend/src/router/index.js:29-38`**

Current content (the `children` array's last two entries):

```js
        {
          path: 'buku/:id',
          name: 'book-detail',
          component: () => import('../views/BookDetail.vue'),
        },
        {
          path: 'buku/:id/pinjam',
          name: 'peminjaman-form',
          component: () => import('../views/PeminjamanFormView.vue'),
        },
      ],
```

Replace with:

```js
        {
          path: 'buku/:id',
          name: 'book-detail',
          component: () => import('../views/BookDetail.vue'),
        },
        {
          path: 'buku/:id/pinjam',
          name: 'peminjaman-form',
          component: () => import('../views/PeminjamanFormView.vue'),
        },
        {
          path: 'cek-peminjaman',
          name: 'cek-peminjaman',
          component: () => import('../views/CekPeminjamanView.vue'),
        },
      ],
```

- [ ] **Step 3: Add the nav item in `frontend/src/layouts/GuestLayout.vue:239-257`**

Current content:

```js
  const navItems = ref([{
      label: 'Beranda',
      to: '/'
    },
    {
      label: 'Katalog Buku',
      to: '/katalog'
    },
    {
      label: 'Layanan',
      to: '/',
      targetId: 'layanan'
    },
    {
      label: 'Tentang',
      to: '/',
      targetId: 'about'
    },
  ])
```

Replace with:

```js
  const navItems = ref([{
      label: 'Beranda',
      to: '/'
    },
    {
      label: 'Katalog Buku',
      to: '/katalog'
    },
    {
      label: 'Cek Peminjaman',
      to: '/cek-peminjaman'
    },
    {
      label: 'Layanan',
      to: '/',
      targetId: 'layanan'
    },
    {
      label: 'Tentang',
      to: '/',
      targetId: 'about'
    },
  ])
```

- [ ] **Step 4: Create `frontend/src/views/CekPeminjamanView.vue`**

Create this new file with the full content below:

```vue
<template>
  <div class="container cek-peminjaman-container my-4 my-md-5">
    <div class="cat-head container d-flex justify-content-center flex-column align-items-center mb-4 px-0">
      <div class="w-100 d-flex justify-content-center align-items-center gap-2 gap-md-3">
        <hr class="flex-grow-1 my-auto opacity-100 d-none d-sm-block" style="border-color: #D4AD65; border-width: 2px;">
        <h1 class="px-2 px-md-4 text-dark fw-bold title-cek m-0 text-center">Cek Status Peminjaman</h1>
        <hr class="flex-grow-1 my-auto opacity-100 d-none d-sm-block" style="border-color: #D4AD65; border-width: 2px;">
      </div>
      <h2 class="form-subtitle text-muted text-center mt-3 mb-0">
        Masukkan nama dan nomor kontak yang sama seperti saat mengajukan peminjaman.
      </h2>
    </div>

    <div class="cek-card p-3 p-md-4 p-lg-5 mx-auto">
      <form @submit.prevent="cariPeminjaman">
        <div class="mb-3">
          <label class="form-label" for="nama_peminjam">Nama Lengkap</label>
          <div class="input-icon-wrapper">
            <i class="bi bi-person"></i>
            <input id="nama_peminjam" v-model="namaPeminjam" type="text"
              class="form-control cek-input" placeholder="Masukkan nama lengkap Anda" required>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label" for="no_telpon">Nomor Kontak</label>
          <div class="input-icon-wrapper">
            <i class="bi bi-telephone"></i>
            <input id="no_telpon" v-model="noTelpon" type="tel"
              class="form-control cek-input" placeholder="Contoh: 0821xxxxx" required>
          </div>
        </div>

        <div v-if="pesanError" class="alert alert-danger py-2 small fw-medium">{{ pesanError }}</div>

        <button type="submit" class="btn btn-navy-action w-100 px-4 py-2 rounded-pill" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
          {{ loading ? 'Mencari...' : 'Cek Status' }}
        </button>
      </form>

      <div v-if="hasSearched && !loading" class="mt-4 mt-md-5">
        <div v-if="hasil.length === 0" class="text-center py-4 text-muted">
          Tidak ditemukan peminjaman dengan data tersebut.
        </div>

        <div v-else class="d-flex flex-column gap-3">
          <div v-for="item in hasil" :key="item.id_peminjaman" class="hasil-item p-3 rounded-4">
            <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <h5 class="font-display text-navy mb-1">{{ item.judul_buku }}</h5>
              <span class="status-badge px-3 py-1 rounded-pill fw-medium"
                :class="statusBadgeClass(item.status)">
                {{ statusLabel(item.status) }}
              </span>
            </div>
            <p class="text-muted small mb-0">Tanggal pinjam: {{ formatTanggal(item.tanggal_pinjam) }}</p>
            <p class="text-muted small mb-0">Batas pengembalian: {{ formatTanggal(item.due_date) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { cekStatusPeminjaman } from '../services/loanService'

const namaPeminjam = ref('')
const noTelpon = ref('')

const loading = ref(false)
const pesanError = ref('')
const hasSearched = ref(false)
const hasil = ref([])

const cariPeminjaman = async () => {
  pesanError.value = ''

  if (!namaPeminjam.value.trim() || !noTelpon.value.trim()) {
    pesanError.value = 'Nama dan nomor kontak wajib diisi'
    return
  }

  loading.value = true
  hasSearched.value = false
  try {
    const response = await cekStatusPeminjaman({
      nama_peminjam: namaPeminjam.value.trim(),
      no_telpon: noTelpon.value.trim()
    })
    hasil.value = response.data
    hasSearched.value = true
  } catch (err) {
    pesanError.value = err.message || 'Gagal mengambil data peminjaman'
  } finally {
    loading.value = false
  }
}

const formatTanggal = (rawTanggal) => {
  if (!rawTanggal) return '-'
  const tanggal = new Date(rawTanggal)
  if (Number.isNaN(tanggal.getTime())) return rawTanggal || '-'

  return tanggal.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  })
}

const statusBadgeClass = (status) => {
  if (status === 'terlambat') return 'bg-danger text-white'
  if (status === 'dikembalikan') return 'bg-success text-white'
  return 'bg-navy'
}

const statusLabel = (status) => {
  if (status === 'terlambat') return 'Terlambat'
  if (status === 'dikembalikan') return 'Dikembalikan'
  return 'Dipinjam'
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant:wght@700&family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

.text-navy {
  color: #0b1e3f !important;
}

.bg-navy {
  background-color: #0b1e3f !important;
  color: #ffffff !important;
}

.font-display {
  font-family: 'Playfair Display', serif;
}

.title-cek {
  font-family: 'Cormorant', serif;
  font-size: 1.75rem;
}

.form-subtitle {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
}

.cek-card {
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
  max-width: 520px;
}

.form-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1a1a1a;
  margin-bottom: 0.4rem;
}

.input-icon-wrapper {
  position: relative;
}

.input-icon-wrapper i {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.cek-input {
  padding: 0.65rem 1rem 0.65rem 2.6rem;
  border-radius: 30px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
}

.cek-input:focus {
  border-color: #0b1e3f;
  box-shadow: 0 0 0 0.25rem rgba(11, 30, 63, 0.15);
}

.btn-navy-action {
  background-color: #0b1e3f;
  color: #ffffff;
  font-weight: 600;
  border: none;
  transition: all 0.3s ease;
}

.btn-navy-action:hover:not(:disabled) {
  background-color: #5f4604;
  color: #ffffff;
}

.btn-navy-action:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.hasil-item {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}

.status-badge {
  font-size: 0.8rem;
}
</style>
```

- [ ] **Step 5: Start (or confirm) the dev stack is running**

Use the preview tool for the frontend + backend launch config, same as prior
frontend plans in this repo.

- [ ] **Step 6: Verify the nav link and page render**

Navigate the browser to `/`. Expected: "Cek Peminjaman" appears in the main
nav, between "Katalog Buku" and "Layanan". Click it → navigates to
`/cek-peminjaman`, page shows title "Cek Status Peminjaman" and an empty
form (no results shown yet, since nothing has been searched).

- [ ] **Step 7: Verify client-side validation blocks an empty submit**

Click "Cek Status" without filling anything. Expected: an `alert-danger`
shows "Nama dan nomor kontak wajib diisi"; confirm via
`read_network_requests` that no `GET /api/peminjaman/cek` request was made.

- [ ] **Step 8: Verify a successful lookup, using the loan created in Task 3 Step 5**

Fill "Nama Lengkap" with `Cek Lookup Test` and "Nomor Kontak" with
`081277778888` (or whatever test loan you created in Task 3 — if Task 3's
dev server session ended, repeat Task 3 Step 5 first to create a fresh
loan). Click "Cek Status". Expected: results area shows one card with the
correct `judul_buku`, a "Dipinjam" status badge, borrow date, and due date.
Confirm via `read_network_requests` that `GET /api/peminjaman/cek` returned
`200`.

- [ ] **Step 9: Verify the no-match empty state**

Fill the form with a name/phone that never borrowed anything (e.g. "Nobody
Here" / "000000"). Click "Cek Status". Expected: "Tidak ditemukan
peminjaman dengan data tersebut." — no error styling, no console error.

- [ ] **Step 10: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`
and confirm they match where you're expected to be.

```bash
git add frontend/src/services/loanService.js frontend/src/router/index.js frontend/src/layouts/GuestLayout.vue frontend/src/views/CekPeminjamanView.vue
git commit -m "$(cat <<'EOF'
Add Cek Status Peminjaman page

Login-free loan lookup by name + phone number, reachable from a
persistent nav link so it doesn't require typing/remembering a URL.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**

---

### Task 5: Commitment checkbox on the borrow form + link to the lookup page

**Files:**
- Modify: `frontend/src/views/PeminjamanFormView.vue`

**Interfaces:**
- Consumes: `konfirmasi_tanggung_jawab` validation from Task 2 (backend);
  route name `'cek-peminjaman'` from Task 4.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Add the checkbox markup**

In `frontend/src/views/PeminjamanFormView.vue`, current content (inside the
`<form>`, between the info box and the error message):

```html
              <div class="info-box d-flex align-items-start gap-3 mb-4">
                <i class="bi bi-exclamation-circle fs-5 mt-1"></i>
                <span class="lh-sm">Pastikan data yang Anda masukkan sudah benar. Petugas perpustakaan akan
                  menghubungi Anda melalui nomor kontak yang terdaftar untuk proses peminjaman.</span>
              </div>

              <div v-if="pesanError" class="alert alert-danger py-2 small fw-medium">{{ pesanError }}</div>
            </form>
```

Replace with:

```html
              <div class="info-box d-flex align-items-start gap-3 mb-4">
                <i class="bi bi-exclamation-circle fs-5 mt-1"></i>
                <span class="lh-sm">Pastikan data yang Anda masukkan sudah benar. Petugas perpustakaan akan
                  menghubungi Anda melalui nomor kontak yang terdaftar untuk proses peminjaman.</span>
              </div>

              <div class="form-check mb-4">
                <input id="pernyataan_tanggung_jawab" v-model="pernyataanDisetujui" type="checkbox"
                  class="form-check-input">
                <label class="form-check-label small" for="pernyataan_tanggung_jawab">
                  Saya menyatakan data ini benar dan bertanggung jawab mengembalikan buku tepat waktu.
                </label>
              </div>

              <div v-if="pesanError" class="alert alert-danger py-2 small fw-medium">{{ pesanError }}</div>
            </form>
```

- [ ] **Step 2: Add the link to "Cek Peminjaman" in the success state**

Current content:

```html
            <!-- Sukses -->
            <div v-if="berhasil" class="text-center py-4 py-md-5">
              <i class="bi bi-check-circle-fill text-success display-3 mb-3"></i>
              <h4 class="font-display text-navy mb-2">Peminjaman Berhasil Diajukan</h4>
              <p class="text-muted mb-1">{{ berhasil.judul_buku }}</p>
              <p class="text-muted small mb-4">Batas pengembalian: <strong>{{ formatDueDate(berhasil.due_date) }}</strong></p>
              <button class="btn btn-navy-action w-100 w-sm-auto px-4 py-2 rounded-pill" @click="kembaliKeDetail">
                Kembali ke Detail Buku
              </button>
            </div>
```

Replace with:

```html
            <!-- Sukses -->
            <div v-if="berhasil" class="text-center py-4 py-md-5">
              <i class="bi bi-check-circle-fill text-success display-3 mb-3"></i>
              <h4 class="font-display text-navy mb-2">Peminjaman Berhasil Diajukan</h4>
              <p class="text-muted mb-1">{{ berhasil.judul_buku }}</p>
              <p class="text-muted small mb-4">Batas pengembalian: <strong>{{ formatDueDate(berhasil.due_date) }}</strong></p>
              <div class="d-flex flex-column flex-sm-row justify-content-center gap-2 gap-sm-3">
                <button class="btn btn-navy-action w-100 w-sm-auto px-4 py-2 rounded-pill" @click="kembaliKeDetail">
                  Kembali ke Detail Buku
                </button>
                <router-link :to="{ name: 'cek-peminjaman' }" class="btn btn-outline-navy w-100 w-sm-auto px-4 py-2 rounded-pill">
                  Cek Status Peminjaman
                </router-link>
              </div>
            </div>
```

- [ ] **Step 3: Add the `pernyataanDisetujui` ref**

Current content:

```js
const namaPeminjam = ref('')
const noTelpon = ref('')
const durasiHari = ref('')

const submitting = ref(false)
```

Replace with:

```js
const namaPeminjam = ref('')
const noTelpon = ref('')
const durasiHari = ref('')
const pernyataanDisetujui = ref(false)

const submitting = ref(false)
```

- [ ] **Step 4: Validate the checkbox and send it in the payload**

Current content:

```js
const submitForm = async () => {
  pesanError.value = ''

  if (!namaPeminjam.value.trim() || !noTelpon.value.trim() || !durasiHari.value) {
    pesanError.value = 'Nama, nomor kontak, dan durasi peminjaman wajib diisi'
    return
  }

  submitting.value = true
  try {
    const response = await ajukanPeminjaman({
      id_detail: Number(route.params.id),
      nama_peminjam: namaPeminjam.value.trim(),
      no_telpon: noTelpon.value.trim(),
      durasi_hari: Number(durasiHari.value)
    })
    berhasil.value = response.data
  } catch (err) {
    pesanError.value = err.message || 'Peminjaman gagal diajukan'
  } finally {
    submitting.value = false
  }
}
```

Replace with:

```js
const submitForm = async () => {
  pesanError.value = ''

  if (!namaPeminjam.value.trim() || !noTelpon.value.trim() || !durasiHari.value) {
    pesanError.value = 'Nama, nomor kontak, dan durasi peminjaman wajib diisi'
    return
  }

  if (!pernyataanDisetujui.value) {
    pesanError.value = 'Anda harus menyetujui pernyataan tanggung jawab sebelum mengajukan peminjaman'
    return
  }

  submitting.value = true
  try {
    const response = await ajukanPeminjaman({
      id_detail: Number(route.params.id),
      nama_peminjam: namaPeminjam.value.trim(),
      no_telpon: noTelpon.value.trim(),
      durasi_hari: Number(durasiHari.value),
      konfirmasi_tanggung_jawab: pernyataanDisetujui.value
    })
    berhasil.value = response.data
  } catch (err) {
    pesanError.value = err.message || 'Peminjaman gagal diajukan'
  } finally {
    submitting.value = false
  }
}
```

- [ ] **Step 5: Start (or confirm) the dev stack is running**

Use the preview tool for the frontend + backend launch config.

- [ ] **Step 6: Find a book id to test with**

```bash
curl -s "http://localhost:5000/api/buku" | node -e "const d=JSON.parse(require('fs').readFileSync(0)); const withStock=d.data.filter(b=>b.stok_tersedia>0); console.log(withStock[0].id_buku, withStock[0].judul_buku, withStock[0].stok_tersedia)"
```

Note the printed `id_buku`.

- [ ] **Step 7: Verify the checkbox blocks submission when unchecked**

Navigate to `/buku/<id_buku>/pinjam`. Fill "Nama Lengkap", "Nomor Kontak",
select a duration, but leave the new checkbox unchecked. Click "Ajukan
Peminjaman". Expected: `alert-danger` shows "Anda harus menyetujui
pernyataan tanggung jawab sebelum mengajukan peminjaman"; confirm via
`read_network_requests` that no `POST /api/peminjaman` request was made.

- [ ] **Step 8: Verify a full successful submission, with the checkbox checked**

Same page, same filled fields, now check the checkbox, click "Ajukan
Peminjaman". Expected: success state shows, and via
`read_network_requests`, the `POST /api/peminjaman` request body includes
`"konfirmasi_tanggung_jawab":true`.

- [ ] **Step 9: Verify the new link on the success screen**

On the success screen from Step 8, click "Cek Status Peminjaman". Expected:
navigates to `/cek-peminjaman`.

- [ ] **Step 10: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`
and confirm they match where you're expected to be.

```bash
git add frontend/src/views/PeminjamanFormView.vue
git commit -m "$(cat <<'EOF'
Add commitment checkbox to borrow form, link to loan status lookup

Required checkbox mirrors the backend's konfirmasi_tanggung_jawab
validation (Task 2). Success screen now links to Cek Status
Peminjaman (Task 4) so a borrower who just submitted can find it
while it's relevant.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**
