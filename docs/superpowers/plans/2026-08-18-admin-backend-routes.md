# Admin Backend Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port dashboard_pttun's admin CRUD (buku, category, rak, cover upload, peminjaman edit/delete) into pttunLibrary's backend under a single `requireAuth`-gated `/api/admin/*` prefix, fixing the error-leak and missing-rate-limit issues dashboard_pttun had, per `docs/superpowers/specs/2026-08-18-dashboard-merge-design.md` Decisions 2, 6, and 7.

**Architecture:** New model/controller/route files for buku (named with an `Admin` suffix to avoid colliding with the existing public `BukuModel.js`/`BukuController.js`, which have same-named functions with different shapes), category, and rak. Peminjaman's admin capabilities (`updatePeminjaman`, `deletePeminjaman`) are added directly into the existing `PeminjamanModel.js`/`PeminjamanController.js` (no name collision there). A new `backend/routes/adminRoutes.js` aggregates every admin sub-router behind one `router.use(requireAuth)` call, then mounts at `/api/admin` in `backend/routes/index.js`. `GET /api/peminjaman` and `PATCH /api/peminjaman/:id/status` — currently public — move under this admin prefix; only `POST /api/peminjaman` (the borrow form) stays public.

**Tech Stack:** Node.js/Express, mysql2 (`db.promise()`, parameterized queries), `express-rate-limit` (existing `writeLimiter`), `multer` (new, memory storage for Cloudinary upload), `cloudinary` (new).

## Global Constraints

- Field names and messages in Indonesian.
- SQL must use parameterized queries (`?`) — never string interpolation.
- 500 responses: `console.error('<pesan>:', error)` server-side, then `res.status(500).json({ message: '<pesan>' })` — **no `error` key in the client response.** This is the current codebase pattern; dashboard_pttun's original code did `{ message, error: error.message }` everywhere — do not carry that over.
- 400/404/409 responses: `res.status(xxx).json({ message })` only.
- **The column for a book title's total physical copies is `detail_buku.total_buku`** — confirmed against the live schema this session (2026-08-18). Do not use `jumlah_eksemplar` (that was a bug in pttunLibrary's own code, already fixed separately in commit `4ac907e`, unrelated to this plan).
- Every `/api/admin/*` route requires an authenticated session. This is enforced **once**, centrally, via `router.use(requireAuth)` in `backend/routes/adminRoutes.js` — individual admin route files must NOT re-apply `requireAuth` themselves (would be redundant and error-prone to keep in sync).
- Every admin `POST`/`PUT`/`PATCH`/`DELETE` route gets the existing `writeLimiter` from `backend/middleware/rateLimiter.js` (same 30-req/10-min instance already used elsewhere — do not create a second limiter instance, that's YAGNI for this internal tool).
- `GET /api/peminjaman` and `PATCH /api/peminjaman/:id/status` move from the public `peminjamanRoutes.js` to the new admin peminjaman router — the public router keeps only `POST /`. This closes an existing exposure (the public list endpoint currently leaks every borrower's name and phone number to anyone).
- New admin-only model/controller files for buku are named `BukuAdminModel.js`/`BukuAdminController.js` — the existing `BukuModel.js`/`BukuController.js` (public) are not modified beyond what's already there, since `getSemuaBuku`/`getBukuById`/`searchBuku` mean different things (different joins, different fields) on each side.
- Category and Rak have no existing pttunLibrary model/controller to collide with — use plain names (`CategoryModel.js`, `RakModel.js`, `CategoryController.js`, `RakController.js`).
- Do not modify `backend/config/database.js`. Do not touch `/frontend`.
- No automated test framework in this backend — verification is manual via curl against the running dev server, started via the `preview_start` tool (`{"name": "backend"}`), not a server started in a human's own native terminal (that's unreachable from this environment's Bash tool — a confirmed gotcha from this session).
- Any step that would make a real Cloudinary API call (an external, quota-consuming third-party service, not just this app's own DB) needs the user's explicit go-ahead first, same as any real-database-write step.
- No "Co-Authored-By" trailer on any commit — hard requirement for this repo.

---

### Task 1: Admin buku — model, controller, routes

**Files:**
- Create: `backend/models/BukuAdminModel.js`
- Create: `backend/controllers/BukuAdminController.js`
- Create: `backend/routes/adminBukuRoutes.js`

**Interfaces:**
- Produces: `BukuAdminModel.getDashboardStats()`, `.getSemuaBuku()`, `.getBukuById(id_buku)`, `.searchBuku(keyword)`, `.getSection()`, `.createBuku(data)`, `.updateBuku(id_buku, data)`, `.deleteBuku(id_buku)` — signatures as written below.
- Produces: an Express router mountable at any prefix, exporting `GET /`, `GET /search`, `GET /section`, `GET /dashboard/stats`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`.
- Consumes: `backend/middleware/rateLimiter.js`'s `writeLimiter` (already exists, exports `{ writeLimiter }`).

- [ ] **Step 1: Create `backend/models/BukuAdminModel.js`**

```js
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
```

- [ ] **Step 2: Create `backend/controllers/BukuAdminController.js`**

```js
const BukuAdminModel = require('../models/BukuAdminModel')

exports.getSemuaBuku = async (req, res) => {
  try {
    const buku = await BukuAdminModel.getSemuaBuku()
    res.json({ message: 'Data buku berhasil diambil', data: buku })
  } catch (error) {
    console.error('Gagal mengambil data buku (admin):', error)
    res.status(500).json({ message: 'Gagal mengambil data buku' })
  }
}

exports.getDashboardStats = async (req, res) => {
  try {
    const statsData = await BukuAdminModel.getDashboardStats()
    res.json({ message: 'Data statistik berhasil diambil', data: statsData })
  } catch (error) {
    console.error('Gagal mengambil data statistik:', error)
    res.status(500).json({ message: 'Gagal mengambil data statistik' })
  }
}

exports.getBukuById = async (req, res) => {
  const { id } = req.params
  try {
    const buku = await BukuAdminModel.getBukuById(id)
    if (!buku) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }
    res.json({ message: 'Data buku berhasil diambil', data: buku })
  } catch (error) {
    console.error('Gagal mengambil data buku by id (admin):', error)
    res.status(500).json({ message: 'Gagal mengambil data buku' })
  }
}

exports.searchBuku = async (req, res) => {
  const { keyword } = req.query

  if (!keyword) {
    return res.status(400).json({ message: 'Kata kunci pencarian wajib diisi' })
  }

  try {
    const buku = await BukuAdminModel.searchBuku(keyword)
    res.json({ message: 'Data buku berhasil ditemukan', data: buku })
  } catch (error) {
    console.error('Gagal mencari data buku (admin):', error)
    res.status(500).json({ message: 'Gagal mencari data buku' })
  }
}

exports.getSection = async (req, res) => {
  try {
    const section = await BukuAdminModel.getSection()
    res.json({ message: 'Data section berhasil diambil', data: section })
  } catch (error) {
    console.error('Gagal mengambil data section:', error)
    res.status(500).json({ message: 'Gagal mengambil data section' })
  }
}

exports.createBuku = async (req, res) => {
  const { judul_buku, id_rak } = req.body

  if (!judul_buku || !judul_buku.trim()) {
    return res.status(400).json({ message: 'Judul buku wajib diisi' })
  }
  if (!id_rak) {
    return res.status(400).json({ message: 'Rak wajib dipilih' })
  }

  try {
    const id_buku = await BukuAdminModel.createBuku(req.body)
    const buku = await BukuAdminModel.getBukuById(id_buku)
    res.status(201).json({ message: 'Buku berhasil ditambahkan', data: buku })
  } catch (error) {
    console.error('Gagal menambahkan buku:', error)
    res.status(500).json({ message: 'Gagal menambahkan buku' })
  }
}

exports.updateBuku = async (req, res) => {
  const { id } = req.params
  const { judul_buku, id_rak } = req.body

  if (!judul_buku || !judul_buku.trim()) {
    return res.status(400).json({ message: 'Judul buku wajib diisi' })
  }
  if (!id_rak) {
    return res.status(400).json({ message: 'Rak wajib dipilih' })
  }

  try {
    const existing = await BukuAdminModel.getBukuById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }

    await BukuAdminModel.updateBuku(id, req.body)
    const buku = await BukuAdminModel.getBukuById(id)
    res.json({ message: 'Buku berhasil diperbarui', data: buku })
  } catch (error) {
    console.error('Gagal memperbarui buku:', error)
    res.status(500).json({ message: 'Gagal memperbarui buku' })
  }
}

exports.deleteBuku = async (req, res) => {
  const { id } = req.params
  try {
    const deleted = await BukuAdminModel.deleteBuku(id)
    if (!deleted) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' })
    }
    res.json({ message: 'Buku berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus buku:', error)
    res.status(500).json({ message: 'Gagal menghapus buku' })
  }
}
```

- [ ] **Step 3: Create `backend/routes/adminBukuRoutes.js`**

```js
const express = require('express')
const router = express.Router()
const bukuAdminController = require('../controllers/BukuAdminController')
const { writeLimiter } = require('../middleware/rateLimiter')

router.get('/', bukuAdminController.getSemuaBuku)
router.get('/search', bukuAdminController.searchBuku)
router.get('/section', bukuAdminController.getSection)
router.get('/dashboard/stats', bukuAdminController.getDashboardStats)
router.post('/', writeLimiter, bukuAdminController.createBuku)
router.get('/:id', bukuAdminController.getBukuById)
router.put('/:id', writeLimiter, bukuAdminController.updateBuku)
router.delete('/:id', writeLimiter, bukuAdminController.deleteBuku)

module.exports = router
```

- [ ] **Step 4: Syntax check**

```bash
node --check backend/models/BukuAdminModel.js
node --check backend/controllers/BukuAdminController.js
node --check backend/routes/adminBukuRoutes.js
```
Expected: no output (all pass).

- [ ] **Step 5: Note for later — this router isn't mounted yet**

`adminBukuRoutes.js` isn't wired into the app yet (that happens in Task 5, alongside `requireAuth`). It cannot be curl-tested standalone yet — don't attempt to mount it temporarily just to test early; Task 5's end-to-end verification covers this.

- [ ] **Step 6: Self-review**

Confirm: every SQL statement uses `?` placeholders, none use template-literal interpolation of user input (the `SELECT_BUKU` template literal only embeds itself, never request data). No `error: error.message` anywhere in the controller — every catch block is `console.error(...)` then a generic message. Column name is `total_buku` throughout, never `jumlah_eksemplar`. `backend/config/database.js` untouched. `/frontend` untouched.

- [ ] **Step 7: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are inside the correct working directory and branch. If either doesn't match what you were told, STOP and report back — do not commit.

```bash
git add backend/models/BukuAdminModel.js backend/controllers/BukuAdminController.js backend/routes/adminBukuRoutes.js
git commit -m "$(cat <<'EOF'
Add admin buku model, controller, and routes

Ported from dashboard_pttun's BukuModel/BukuController, fixing the
error-message leak (no more error: error.message in 500 responses).
Named with an Admin suffix since getSemuaBuku/getBukuById/searchBuku
mean something different (different joins/fields) on the public side.
Not mounted yet — that's a later task, alongside requireAuth.
EOF
)"
```

---

### Task 2: Admin category and rak — models, controllers, routes

**Files:**
- Create: `backend/models/CategoryModel.js`
- Create: `backend/controllers/CategoryController.js`
- Create: `backend/routes/categoryRoutes.js`
- Create: `backend/models/RakModel.js`
- Create: `backend/controllers/RakController.js`
- Create: `backend/routes/rakRoutes.js`

**Interfaces:**
- Produces: `CategoryModel.getCategory()`, `.getCategoryById(id)`, `.searchCategory(keyword)`, `.createCategory(data)`, `.updateCategory(id, data)`, `.countBukuByCategory(id)`, `.deleteCategory(id)`.
- Produces: `RakModel.getRak()`, `.getRakById(id)`, `.searchRak(keyword)`, `.createRak(data)`, `.updateRak(id, data)`, `.countBukuByRak(id)`, `.deleteRak(id)`.
- Produces: two Express routers, each exporting `GET /`, `GET /search`, `POST /`, `PUT /:id`, `DELETE /:id`.
- Consumes: `writeLimiter` from `backend/middleware/rateLimiter.js`.

- [ ] **Step 1: Create `backend/models/CategoryModel.js`**

```js
const db = require('../config/database')
const pool = db.promise()

const SELECT_CATEGORY = `SELECT * FROM category ORDER BY id_category`

const BASE_CATEGORY = `SELECT * FROM category`

exports.getCategory = async () => {
  const [rows] = await pool.query(SELECT_CATEGORY)
  return rows
}

exports.getCategoryById = async (id_category) => {
  const [rows] = await pool.query(`${BASE_CATEGORY} WHERE id_category = ?`, [id_category])
  return rows[0]
}

exports.searchCategory = async (keyword) => {
  const searchKeyword = `%${keyword}%`
  const [rows] = await pool.query(
    `${BASE_CATEGORY} WHERE nama_category LIKE ? ORDER BY id_category`,
    [searchKeyword],
  )
  return rows
}

exports.createCategory = async (data) => {
  const { nama_category } = data

  const [result] = await pool.query(
    'INSERT INTO category (nama_category) VALUES (?)',
    [nama_category],
  )
  return result.insertId
}

exports.updateCategory = async (id_category, data) => {
  const { nama_category } = data

  await pool.query(
    'UPDATE category SET nama_category = ? WHERE id_category = ?',
    [nama_category, id_category],
  )
}

exports.countBukuByCategory = async (id_category) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM buku WHERE id_category = ?',
    [id_category],
  )
  return rows[0].total
}

exports.deleteCategory = async (id_category) => {
  const [result] = await pool.query('DELETE FROM category WHERE id_category = ?', [id_category])
  return result.affectedRows > 0
}
```

- [ ] **Step 2: Create `backend/controllers/CategoryController.js`**

```js
const CategoryModel = require('../models/CategoryModel')

exports.getCategory = async (req, res) => {
  try {
    const categories = await CategoryModel.getCategory()
    res.json({ message: 'Data kategori berhasil diambil', data: categories })
  } catch (error) {
    console.error('Gagal mengambil data kategori:', error)
    res.status(500).json({ message: 'Gagal mengambil data kategori' })
  }
}

exports.searchCategory = async (req, res) => {
  const { keyword } = req.query

  if (!keyword) {
    return res.status(400).json({ message: 'Kata kunci pencarian wajib diisi' })
  }

  try {
    const categories = await CategoryModel.searchCategory(keyword)
    res.json({ message: 'Data kategori berhasil ditemukan', data: categories })
  } catch (error) {
    console.error('Gagal mencari data kategori:', error)
    res.status(500).json({ message: 'Gagal mencari data kategori' })
  }
}

exports.createCategory = async (req, res) => {
  const { nama_category } = req.body

  if (!nama_category || !nama_category.trim()) {
    return res.status(400).json({ message: 'Nama kategori wajib diisi' })
  }

  try {
    const id_category = await CategoryModel.createCategory(req.body)
    const category = await CategoryModel.getCategoryById(id_category)
    res.status(201).json({ message: 'Kategori berhasil ditambahkan', data: category })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Nama kategori sudah digunakan' })
    }
    console.error('Gagal menambahkan kategori:', error)
    res.status(500).json({ message: 'Gagal menambahkan kategori' })
  }
}

exports.updateCategory = async (req, res) => {
  const { id } = req.params
  const { nama_category } = req.body

  if (!nama_category || !nama_category.trim()) {
    return res.status(400).json({ message: 'Nama kategori wajib diisi' })
  }

  try {
    const existing = await CategoryModel.getCategoryById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' })
    }

    await CategoryModel.updateCategory(id, req.body)
    const category = await CategoryModel.getCategoryById(id)
    res.json({ message: 'Kategori berhasil diperbarui', data: category })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Nama kategori sudah digunakan' })
    }
    console.error('Gagal memperbarui kategori:', error)
    res.status(500).json({ message: 'Gagal memperbarui kategori' })
  }
}

exports.deleteCategory = async (req, res) => {
  const { id } = req.params
  try {
    const existing = await CategoryModel.getCategoryById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' })
    }

    const totalBuku = await CategoryModel.countBukuByCategory(id)
    if (totalBuku > 0) {
      return res.status(409).json({ message: 'Kategori masih digunakan oleh buku, tidak bisa dihapus' })
    }

    await CategoryModel.deleteCategory(id)
    res.json({ message: 'Kategori berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus kategori:', error)
    res.status(500).json({ message: 'Gagal menghapus kategori' })
  }
}
```

- [ ] **Step 3: Create `backend/routes/categoryRoutes.js`**

```js
const express = require('express')
const router = express.Router()

const categoryController = require('../controllers/CategoryController')
const { writeLimiter } = require('../middleware/rateLimiter')

router.get('/', categoryController.getCategory)
router.get('/search', categoryController.searchCategory)
router.post('/', writeLimiter, categoryController.createCategory)
router.put('/:id', writeLimiter, categoryController.updateCategory)
router.delete('/:id', writeLimiter, categoryController.deleteCategory)

module.exports = router
```

- [ ] **Step 4: Create `backend/models/RakModel.js`**

```js
const db = require('../config/database')
const pool = db.promise()

const SELECT_RAK = `SELECT * FROM rak ORDER BY id_rak`

const BASE_RAK = `SELECT * FROM rak`

exports.getRak = async () => {
  const [rows] = await pool.query(SELECT_RAK)
  return rows
}

exports.getRakById = async (id_rak) => {
  const [rows] = await pool.query(`${BASE_RAK} WHERE id_rak = ?`, [id_rak])
  return rows[0]
}

exports.searchRak = async (keyword) => {
  const searchKeyword = `%${keyword}%`
  const [rows] = await pool.query(
    `${BASE_RAK} WHERE nama_rak LIKE ? ORDER BY id_rak`,
    [searchKeyword],
  )
  return rows
}

exports.createRak = async (data) => {
  const { nama_rak } = data

  const [result] = await pool.query(
    'INSERT INTO rak (nama_rak) VALUES (?)',
    [nama_rak],
  )
  return result.insertId
}

exports.updateRak = async (id_rak, data) => {
  const { nama_rak } = data

  await pool.query(
    'UPDATE rak SET nama_rak = ? WHERE id_rak = ?',
    [nama_rak, id_rak],
  )
}

exports.countBukuByRak = async (id_rak) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM detail_buku WHERE id_rak = ?',
    [id_rak],
  )
  return rows[0].total
}

exports.deleteRak = async (id_rak) => {
  const [result] = await pool.query('DELETE FROM rak WHERE id_rak = ?', [id_rak])
  return result.affectedRows > 0
}
```

- [ ] **Step 5: Create `backend/controllers/RakController.js`**

```js
const RakModel = require('../models/RakModel')

exports.getRak = async (req, res) => {
  try {
    const rak = await RakModel.getRak()
    res.json({ message: 'Data rak berhasil diambil', data: rak })
  } catch (error) {
    console.error('Gagal mengambil data rak:', error)
    res.status(500).json({ message: 'Gagal mengambil data rak' })
  }
}

exports.searchRak = async (req, res) => {
  const { keyword } = req.query

  if (!keyword) {
    return res.status(400).json({ message: 'Kata kunci pencarian wajib diisi' })
  }

  try {
    const rak = await RakModel.searchRak(keyword)
    res.json({ message: 'Data rak berhasil ditemukan', data: rak })
  } catch (error) {
    console.error('Gagal mencari data rak:', error)
    res.status(500).json({ message: 'Gagal mencari data rak' })
  }
}

exports.createRak = async (req, res) => {
  const { nama_rak } = req.body

  if (!nama_rak || !nama_rak.trim()) {
    return res.status(400).json({ message: 'Nama rak wajib diisi' })
  }

  try {
    const id_rak = await RakModel.createRak(req.body)
    const rak = await RakModel.getRakById(id_rak)
    res.status(201).json({ message: 'Rak berhasil ditambahkan', data: rak })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Nama rak sudah digunakan' })
    }
    console.error('Gagal menambahkan rak:', error)
    res.status(500).json({ message: 'Gagal menambahkan rak' })
  }
}

exports.updateRak = async (req, res) => {
  const { id } = req.params
  const { nama_rak } = req.body

  if (!nama_rak || !nama_rak.trim()) {
    return res.status(400).json({ message: 'Nama rak wajib diisi' })
  }

  try {
    const existing = await RakModel.getRakById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Rak tidak ditemukan' })
    }

    await RakModel.updateRak(id, req.body)
    const rak = await RakModel.getRakById(id)
    res.json({ message: 'Rak berhasil diperbarui', data: rak })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Nama rak sudah digunakan' })
    }
    console.error('Gagal memperbarui rak:', error)
    res.status(500).json({ message: 'Gagal memperbarui rak' })
  }
}

exports.deleteRak = async (req, res) => {
  const { id } = req.params
  try {
    const existing = await RakModel.getRakById(id)
    if (!existing) {
      return res.status(404).json({ message: 'Rak tidak ditemukan' })
    }

    const totalBuku = await RakModel.countBukuByRak(id)
    if (totalBuku > 0) {
      return res.status(409).json({ message: 'Rak masih digunakan oleh buku, tidak bisa dihapus' })
    }

    await RakModel.deleteRak(id)
    res.json({ message: 'Rak berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus rak:', error)
    res.status(500).json({ message: 'Gagal menghapus rak' })
  }
}
```

- [ ] **Step 6: Create `backend/routes/rakRoutes.js`**

```js
const express = require('express')
const router = express.Router()

const rakController = require('../controllers/RakController')
const { writeLimiter } = require('../middleware/rateLimiter')

router.get('/', rakController.getRak)
router.get('/search', rakController.searchRak)
router.post('/', writeLimiter, rakController.createRak)
router.put('/:id', writeLimiter, rakController.updateRak)
router.delete('/:id', writeLimiter, rakController.deleteRak)

module.exports = router
```

- [ ] **Step 7: Syntax check**

```bash
node --check backend/models/CategoryModel.js
node --check backend/controllers/CategoryController.js
node --check backend/routes/categoryRoutes.js
node --check backend/models/RakModel.js
node --check backend/controllers/RakController.js
node --check backend/routes/rakRoutes.js
```
Expected: no output (all pass).

- [ ] **Step 8: Self-review**

Confirm: parameterized SQL throughout, no `error: error.message` leaks (only `error.code === 'ER_DUP_ENTRY'` checks, which don't expose the message), `writeLimiter` on every write route. Not mounted yet (Task 5).

- [ ] **Step 9: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm correct directory/branch — STOP if not.

```bash
git add backend/models/CategoryModel.js backend/controllers/CategoryController.js backend/routes/categoryRoutes.js backend/models/RakModel.js backend/controllers/RakController.js backend/routes/rakRoutes.js
git commit -m "$(cat <<'EOF'
Add admin category and rak models, controllers, and routes

Ported from dashboard_pttun, fixing the error-message leak in every
catch block. Not mounted yet — that's a later task, alongside
requireAuth.
EOF
)"
```

---

### Task 3: Admin cover upload (Cloudinary)

**Files:**
- Modify: `backend/package.json` — add `cloudinary`, `multer` (via `npm install`).
- Create: `backend/config/cloudinary.js`
- Create: `backend/controllers/UploadController.js`
- Create: `backend/routes/uploadRoutes.js`

**Interfaces:**
- Produces: `{ cloudinary, isConfigured }` exported from `backend/config/cloudinary.js`.
- Produces: an Express router exporting `POST /cover` (multipart form field name `cover`).
- Consumes: `writeLimiter`.

- [ ] **Step 1: Install dependencies**

```bash
cd backend && npm install cloudinary multer
```

- [ ] **Step 2: Create `backend/config/cloudinary.js`**

```js
const cloudinary = require('cloudinary').v2
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true })

const isConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
} else {
  console.error('Konfigurasi Cloudinary belum lengkap. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET di backend/.env')
}

module.exports = { cloudinary, isConfigured }
```

- [ ] **Step 3: Create `backend/controllers/UploadController.js`**

```js
const { cloudinary, isConfigured } = require('../config/cloudinary')

exports.uploadCover = async (req, res) => {
  if (!isConfigured) {
    return res.status(500).json({
      message: 'Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET di backend/.env',
    })
  }

  if (!req.file) {
    return res.status(400).json({ message: 'File cover wajib diunggah' })
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'pttun-library/covers',
          resource_type: 'image',
          quality: 'auto:good',
          fetch_format: 'auto',
        },
        (error, uploadResult) => {
          if (error) reject(error)
          else resolve(uploadResult)
        },
      )
      stream.end(req.file.buffer)
    })

    res.status(201).json({
      message: 'Cover berhasil diunggah',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      },
    })
  } catch (error) {
    console.error('Gagal mengunggah cover ke Cloudinary:', error)
    res.status(500).json({ message: 'Gagal mengunggah cover ke Cloudinary' })
  }
}
```

- [ ] **Step 4: Create `backend/routes/uploadRoutes.js`**

```js
const express = require('express')
const multer = require('multer')
const uploadController = require('../controllers/UploadController')
const { writeLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB safety cap
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus berupa gambar'))
    }
    cb(null, true)
  },
})

router.post('/cover', writeLimiter, upload.single('cover'), uploadController.uploadCover)

module.exports = router
```

- [ ] **Step 5: Syntax check**

```bash
node --check backend/config/cloudinary.js
node --check backend/controllers/UploadController.js
node --check backend/routes/uploadRoutes.js
```
Expected: no output.

- [ ] **Step 6: Self-review**

Confirm: no Cloudinary credentials hardcoded (read from `process.env` only). `isConfigured` guard prevents a confusing crash if `.env` isn't set up yet. `writeLimiter` applied. Not mounted yet (Task 5).

- [ ] **Step 7: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add backend/package.json backend/package-lock.json backend/config/cloudinary.js backend/controllers/UploadController.js backend/routes/uploadRoutes.js
git commit -m "$(cat <<'EOF'
Add admin cover upload (Cloudinary) config, controller, and routes

Ported from dashboard_pttun as-is — no error-leak issue existed here to
fix. Not mounted yet — that's a later task, alongside requireAuth.
EOF
)"
```

---

### Task 4: Peminjaman admin — merge into existing model/controller, new admin routes

**Files:**
- Modify: `backend/models/PeminjamanModel.js` — add `updatePeminjaman`, `deletePeminjaman`.
- Modify: `backend/controllers/PeminjamanController.js` — add `updatePeminjaman`, `deletePeminjaman` handlers.
- Modify: `backend/routes/peminjamanRoutes.js` — remove `GET /` and `PATCH /:id/status` (moving to admin).
- Create: `backend/routes/adminPeminjamanRoutes.js` — `GET /`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id`.

**Interfaces:**
- Produces: `PeminjamanModel.updatePeminjaman(id_peminjaman, { nama_peminjam, no_telpon, durasi_hari }) => Promise<object|null>` (full row with `judul_buku`, or `null` if not found).
- Produces: `PeminjamanModel.deletePeminjaman(id_peminjaman) => Promise<boolean>`.
- Consumes: `PeminjamanModel.getSemuaPeminjaman`, `.updateStatusPeminjaman` (already exist, unchanged — just re-wired to a different route file).
- Consumes: `writeLimiter`, `requireAuth` (applied centrally in Task 5, not here).

- [ ] **Step 1: Add to `backend/models/PeminjamanModel.js`** — insert after `updateStatusPeminjaman` (keep everything else in the file unchanged)

```js

function hitungDueDate(tanggal_pinjam, durasi_hari) {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })
  const dueDateObj = new Date(`${tanggal_pinjam}T00:00:00Z`)
  dueDateObj.setUTCDate(dueDateObj.getUTCDate() + durasi_hari)
  return dateFormatter.format(dueDateObj)
}

exports.updatePeminjaman = async (id_peminjaman, data) => {
  const { nama_peminjam, no_telpon, durasi_hari } = data
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })

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

    const tanggal_pinjam = dateFormatter.format(new Date(existing.tanggal_pinjam))
    const due_date = hitungDueDate(tanggal_pinjam, durasi_hari)
    const today = dateFormatter.format(new Date())
    const isOverdue = due_date < today

    let newStatus = existing.status
    if (existing.status === 'dipinjam' && isOverdue) {
      newStatus = 'terlambat'
    } else if (existing.status === 'terlambat' && !isOverdue) {
      newStatus = 'dipinjam'
    }

    await connection.query(
      `UPDATE peminjaman
       SET nama_peminjam = ?, no_telpon = ?, durasi_hari = ?, due_date = ?, status = ?
       WHERE id_peminjaman = ?`,
      [nama_peminjam, no_telpon, durasi_hari, due_date, newStatus, id_peminjaman],
    )

    if (newStatus === 'terlambat' && existing.status === 'dipinjam') {
      await connection.query(
        'UPDATE detail_buku SET stok_tersedia = LEAST(stok_tersedia + 1, total_buku) WHERE id_buku = ?',
        [existing.id_detail],
      )
    } else if (newStatus === 'dipinjam' && existing.status === 'terlambat') {
      await connection.query(
        'UPDATE detail_buku SET stok_tersedia = stok_tersedia - 1 WHERE id_buku = ? AND stok_tersedia > 0',
        [existing.id_detail],
      )
    }

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
```

- [ ] **Step 2: Add to `backend/controllers/PeminjamanController.js`** — insert after `updateStatusPeminjaman` (keep the rest of the file, including `STATUS_VALUES` and the existing three exports, unchanged)

```js

exports.updatePeminjaman = async (req, res) => {
  const { id } = req.params
  const { nama_peminjam, no_telpon, durasi_hari } = req.body

  if (typeof nama_peminjam !== 'string' || !nama_peminjam.trim()) {
    return res.status(400).json({ message: 'Nama peminjam wajib diisi' })
  }
  if (typeof no_telpon !== 'string' || !no_telpon.trim()) {
    return res.status(400).json({ message: 'Nomor telepon wajib diisi' })
  }

  const parsedDurasi = Number.parseInt(durasi_hari, 10)
  if (!Number.isInteger(parsedDurasi) || parsedDurasi < 1 || parsedDurasi > 7) {
    return res.status(400).json({ message: 'Durasi pinjam harus berupa angka antara 1 dan 7 hari' })
  }

  try {
    const updated = await PeminjamanModel.updatePeminjaman(id, {
      nama_peminjam: nama_peminjam.trim(),
      no_telpon: no_telpon.trim(),
      durasi_hari: parsedDurasi,
    })
    if (!updated) {
      return res.status(404).json({ message: 'Data peminjaman tidak ditemukan' })
    }
    res.json({ message: 'Data peminjaman berhasil diperbarui', data: updated })
  } catch (error) {
    console.error('Gagal memperbarui data peminjaman:', error)
    res.status(500).json({ message: 'Gagal memperbarui data peminjaman' })
  }
}

exports.deletePeminjaman = async (req, res) => {
  const { id } = req.params
  try {
    const deleted = await PeminjamanModel.deletePeminjaman(id)
    if (!deleted) {
      return res.status(404).json({ message: 'Data peminjaman tidak ditemukan' })
    }
    res.json({ message: 'Data peminjaman berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus data peminjaman:', error)
    res.status(500).json({ message: 'Gagal menghapus data peminjaman' })
  }
}
```

- [ ] **Step 3: Replace `backend/routes/peminjamanRoutes.js`** (public — keep only the borrow-submission route)

```js
const express = require('express');
const peminjamanController = require('../controllers/PeminjamanController');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', writeLimiter, peminjamanController.buatPeminjaman);

module.exports = router;
```

- [ ] **Step 4: Create `backend/routes/adminPeminjamanRoutes.js`**

```js
const express = require('express')
const router = express.Router()

const peminjamanController = require('../controllers/PeminjamanController')
const { writeLimiter } = require('../middleware/rateLimiter')

router.get('/', peminjamanController.getSemuaPeminjaman)
router.put('/:id', writeLimiter, peminjamanController.updatePeminjaman)
router.patch('/:id/status', writeLimiter, peminjamanController.updateStatusPeminjaman)
router.delete('/:id', writeLimiter, peminjamanController.deletePeminjaman)

module.exports = router
```

- [ ] **Step 5: Syntax check**

```bash
node --check backend/models/PeminjamanModel.js
node --check backend/controllers/PeminjamanController.js
node --check backend/routes/peminjamanRoutes.js
node --check backend/routes/adminPeminjamanRoutes.js
```
Expected: no output.

- [ ] **Step 6: Self-review**

Confirm: `updatePeminjaman`/`deletePeminjaman` use `total_buku`, not `jumlah_eksemplar`. The public `peminjamanRoutes.js` now exposes only `POST /` — re-read the file to confirm `GET /` and `PATCH /:id/status` are gone from it. No `error: error.message` in the two new controller handlers. `hitungDueDate` is a plain internal helper, not exported (only `PeminjamanModel.updatePeminjaman`/`.deletePeminjaman` are new exports). The app isn't broken by this yet even before Task 5's mounting change — `routes/index.js` still points `/peminjaman` at the old (now-trimmed) `peminjamanRoutes.js`, so `GET /api/peminjaman` and `PATCH /api/peminjaman/:id/status` will 404 until Task 5 mounts the admin router. That's expected and temporary — don't try to fix it in this task.

- [ ] **Step 7: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add backend/models/PeminjamanModel.js backend/controllers/PeminjamanController.js backend/routes/peminjamanRoutes.js backend/routes/adminPeminjamanRoutes.js
git commit -m "$(cat <<'EOF'
Add peminjaman admin edit/delete, move list+status-update off public

updatePeminjaman/deletePeminjaman ported from dashboard_pttun (using
total_buku, the confirmed-correct column). The public peminjamanRoutes.js
now exposes only the borrow-submission POST — GET / (which leaked every
borrower's name and phone number) and PATCH /:id/status move to the new
adminPeminjamanRoutes.js. Not mounted yet — Task 5 wires requireAuth and
mounts everything.
EOF
)"
```

---

### Task 5: Wire it together — admin router aggregator, mount, end-to-end verification

**Files:**
- Create: `backend/routes/adminRoutes.js`
- Modify: `backend/routes/index.js` — mount `adminRoutes` at `/admin`.

**Interfaces:**
- Consumes: every router produced by Tasks 1-4, plus `requireAuth` from `backend/middleware/requireAuth.js` (already exists, from the prior auth-foundation plan).
- Produces: the full `/api/admin/*` surface, all gated by one `requireAuth` call.

- [ ] **Step 1: Create `backend/routes/adminRoutes.js`**

```js
const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const adminBukuRoutes = require('./adminBukuRoutes')
const categoryRoutes = require('./categoryRoutes')
const rakRoutes = require('./rakRoutes')
const uploadRoutes = require('./uploadRoutes')
const adminPeminjamanRoutes = require('./adminPeminjamanRoutes')

const router = express.Router()

router.use(requireAuth)

router.use('/buku', adminBukuRoutes)
router.use('/category', categoryRoutes)
router.use('/rak', rakRoutes)
router.use('/upload', uploadRoutes)
router.use('/peminjaman', adminPeminjamanRoutes)

module.exports = router
```

- [ ] **Step 2: Modify `backend/routes/index.js`** — add the admin router mount

Full replacement:

```js
const express = require('express');
const bukuRoutes = require('./bukuRoutes');
const authRoutes = require('./authRoutes');
const penggunaRoutes = require('./penggunaRoutes');
const peminjamanRoutes = require('./peminjamanRoutes');
const adminRoutes = require('./adminRoutes');
const PeminjamanModel = require('../models/PeminjamanModel');

const router = express.Router();

// Auto-return peminjaman yang sudah melewati due_date sebelum request diproses,
// supaya stok/status yang dilihat/digunakan selalu up-to-date tanpa aksi manual.
router.use(async (req, res, next) => {
  try {
    await PeminjamanModel.reconcileOverdueLoans();
  } catch (err) {
    console.error('Gagal auto-reconcile peminjaman overdue:', err);
  }
  next();
});

router.use('/buku', bukuRoutes);
router.use('/auth', authRoutes);
router.use('/pengguna', penggunaRoutes);
router.use('/peminjaman', peminjamanRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
```

- [ ] **Step 3: Syntax check**

```bash
node --check backend/routes/adminRoutes.js
node --check backend/routes/index.js
```
Expected: no output.

- [ ] **Step 4: Start the backend and confirm it boots clean**

Use `preview_start` with `{"name": "backend"}`. If a server is already running from a prior session, stop it first (`preview_stop`) and start fresh so nodemon picks up all of Tasks 1-4's new files cleanly. Confirm the startup log shows `Server backend berjalan di http://localhost:5000` and `Berhasil terhubung ke database MySQL`, with no crash. If `CLOUDINARY_*` env vars aren't set, you'll see the "Konfigurasi Cloudinary belum lengkap" warning at startup — that's expected and non-fatal, not a bug to fix here.

- [ ] **Step 5: Every `/api/admin/*` route requires auth — confirm with no session**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/admin/buku"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/admin/category"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/admin/rak"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/admin/peminjaman"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/admin/upload/cover"
```
Expected: `401` for all five (no session cookie sent).

- [ ] **Step 6: Confirm the public peminjaman surface shrank as intended**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/peminjaman"
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH "http://localhost:5000/api/peminjaman/1/status" -H "Content-Type: application/json" -d '{"status":"dikembalikan"}'
```
Expected: `404` for both (no longer routed — `GET /` and `PATCH /:id/status` don't exist on the trimmed public router).

- [ ] **Step 7: STOP — ask the user before logging in for authenticated verification**

The remaining steps need a real authenticated session. Ask the user: "OK to log in with your seeded admin account to verify the new /api/admin/* routes end-to-end?" Use the same PowerShell `Invoke-WebRequest -SessionVariable` pattern from the auth-foundation plan (or curl with a cookie jar, if on a platform where that's reachable) — do not ask for or handle the password yourself; have the user run the login command and share back status codes, or if you're able to reach the server directly, prompt them for confirmation to proceed and have them supply just the resulting session cookie value if your environment needs it relayed. Do not proceed past this point without explicit go-ahead.

- [ ] **Step 8: Authenticated smoke test — read endpoints**

With a valid session (however Step 7 obtained one), confirm each of these returns `200`:
```
GET /api/admin/buku
GET /api/admin/category
GET /api/admin/rak
GET /api/admin/peminjaman
GET /api/admin/buku/dashboard/stats
GET /api/admin/buku/section
```

- [ ] **Step 9: Authenticated smoke test — a full category create/update/delete cycle**

This is a safe, fully-reversible test (creates then deletes its own row):
1. `POST /api/admin/category` with `{"nama_category": "Kategori Uji Verifikasi"}` → expect `201`, note the returned `id_category`.
2. `PUT /api/admin/category/:id` with `{"nama_category": "Kategori Uji Verifikasi (edited)"}` → expect `200`.
3. `DELETE /api/admin/category/:id` → expect `200` (should succeed since no book uses this test category — `countBukuByCategory` will be 0).
4. `GET /api/admin/category` → confirm the test category is gone.

- [ ] **Step 10: Cover upload — ask before making a real Cloudinary call**

If `CLOUDINARY_*` env vars are not set in `backend/.env`, skip this step — you already confirmed the "belum dikonfigurasi" 500 path is reachable implicitly by the code existing; a full test needs real credentials. If they ARE set, ask the user explicitly: "OK to upload a small test image to your real Cloudinary account to verify this endpoint? (uses a small amount of your account's quota)." Only proceed on a yes. If approved, upload any small local image file via `curl -F "cover=@path/to/small-image.jpg"` with the session cookie, confirm `201` and a `secure_url` in the response, then note the returned `public_id` for the user's awareness (they may want to manually delete it from their Cloudinary dashboard later — this plan doesn't add a delete-from-Cloudinary capability).

- [ ] **Step 11: Self-review**

Confirm: all five admin sub-routers are behind the single `requireAuth` in `adminRoutes.js` (re-read the file — no per-route `requireAuth` calls anywhere else, which would be redundant). Public `peminjamanRoutes.js` exposes only `POST /`. `routes/index.js`'s `reconcileOverdueLoans` middleware still runs before all routes, admin included — this is correct and intentional (unchanged behavior, just confirm it wasn't accidentally removed). No stray console.log of request bodies or credentials anywhere in the new code.

- [ ] **Step 12: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add backend/routes/adminRoutes.js backend/routes/index.js
git commit -m "$(cat <<'EOF'
Mount /api/admin/* behind requireAuth, aggregating all admin routers

One requireAuth call in adminRoutes.js gates buku, category, rak,
upload, and peminjaman admin routes — verified end-to-end: 401 with no
session, 200/201 with one, and the trimmed public peminjaman routes
(GET / and PATCH /:id/status) now correctly 404.
EOF
)"
```

## Out of scope (deferred to later plans)

- Frontend admin UI wiring (router, views, forms calling these new endpoints) — Plan 3.
- Cover scanner (opencv/jscanify) migration — Plan 4.
- `CLAUDE.md` updates for the new `pengguna` table and corrected `total_buku` column name — still pending from the auth-foundation plan, not repeated here.
- Any UI for deleting an uploaded Cloudinary image (orphaned images from cancelled edits aren't cleaned up automatically — pre-existing dashboard_pttun behavior, not introduced or worsened by this plan).
