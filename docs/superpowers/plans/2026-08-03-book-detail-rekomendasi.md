# Detail Buku + Rekomendasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `GET /api/buku/:id` to return a fully-joined book (not a bare `buku` row), add a `GET /api/buku/:id/rekomendasi` endpoint that scores candidate books by category match + author match + title word overlap, and wire `BookDetail.vue` to both — replacing its current "fetch all 878 books, filter client-side" approach.

**Architecture:** Two backend model functions (`BukuModel.getBukuById` fixed, `BukuModel.getBukuRekomendasi` new) behind their controller/route pairs in `BukuController.js`/`bukuRoutes.js`, following the existing try/catch + `res.json({ message, data })` pattern used by every other route in this file. Frontend gets one new `bookService.js` function and a rewritten `loadData()` in `BookDetail.vue` that calls both endpoints in parallel via `Promise.allSettled`.

**Tech Stack:** Node.js/Express, mysql2 (parameterized queries, `db.promise().query`), Vue 3 `<script setup>`, no test framework in the backend (verification is manual via `curl` / browser — same as the rest of this codebase).

## Global Constraints

- Field names in Indonesian, matching domain conventions (`judul_buku`, `pengarang`, `tahun_terbit`, etc.) — per `CLAUDE.md`.
- No login/auth — do not add any.
- All SQL must be parameterized (`?` placeholders) — never string-interpolate user input into a query.
- Controller pattern: `try { ... res.json({ message, data }) } catch (error) { res.status(500).json({ message, error: error.message }) }` — matches every existing handler in `backend/controllers/BukuController.js`.
- `status_buku` is always derived from `stok_tersedia` via `CASE WHEN d.stok_tersedia > 0 THEN 'Tersedia' ELSE 'Tidak Tersedia' END`, not read from the raw `detail_buku.status_buku` column — per `BukuModel.getSemuaBuku`'s existing convention (see spec).
- 1 buku = 1 detail_buku, always (`CLAUDE.md`) — joins in this plan use plain `JOIN`, no `GROUP BY`/aggregation needed for single-row lookups.
- Default backend port is `5000` (`backend/index.js:8`, `process.env.PORT || 5000`) — curl examples below assume this; adjust if your local `.env` overrides `PORT`.
- Full design rationale: `docs/superpowers/specs/2026-08-03-book-detail-rekomendasi-design.md`.

---

## Task 1: Fix `BukuModel.getBukuById` to return a fully-joined book

**Files:**
- Modify: `backend/models/BukuModel.js:23-26`

**Interfaces:**
- Consumes: nothing new (existing `db` connection from `backend/config/database`, already imported at top of file).
- Produces: `BukuModel.getBukuById(id_buku)` — now resolves to `{ id_buku, judul_buku, id_category, nama_category, pengarang, penerbit, tahun_terbit, image_url, nama_rak, nama_section, status_buku }` (`undefined` if not found — unchanged contract, `BukuController.getBukuById` already handles the `undefined` → 404 case and needs no changes).

- [ ] **Step 1: Replace the query**

In `backend/models/BukuModel.js`, replace lines 23-26:

```js
exports.getBukuById = async (id_buku) => {
  const [rows] = await db.promise().query('SELECT * FROM buku WHERE id_buku = ?', [id_buku])
  return rows[0]
}
```

with:

```js
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
```

- [ ] **Step 2: Start the backend dev server**

Run: `npm --prefix backend run dev`
Expected: `Server backend berjalan di http://localhost:5000` (or your `.env` port), `Berhasil terhubung ke database MySQL` — no startup errors. Leave it running for the next step.

- [ ] **Step 3: Verify with curl — find a real id first**

Run: `curl -s "http://localhost:5000/api/buku" | node -e "const d=JSON.parse(require('fs').readFileSync(0)); console.log(d.data[0].id_buku, d.data[0].judul_buku)"`
Expected: prints an `id_buku` (e.g. `12`) and its title — use this id for the next command.

- [ ] **Step 4: Verify the fixed endpoint**

Run: `curl -s "http://localhost:5000/api/buku/<id_buku_from_step_3>" | node -e "console.log(JSON.parse(require('fs').readFileSync(0)))"`
Expected: `data` object includes non-null-shaped keys `judul_buku`, `nama_category`, `pengarang`, `penerbit`, `tahun_terbit`, `image_url`, `nama_rak`, `nama_section`, `status_buku` (values may individually be `null` if that book's data is incomplete, but the **keys** must all be present — this is the actual regression check: before this fix, only raw `buku` columns like `id_buku`/`judul_buku`/`id_category` came back, none of the others).

- [ ] **Step 5: Verify the 404 path is unchanged**

Run: `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/buku/999999999"`
Expected: `404`

- [ ] **Step 6: Commit**

```bash
git add backend/models/BukuModel.js
git commit -m "Join detail_buku/category/rak/section in getBukuById"
```

---

## Task 2: Add `GET /api/buku/:id/rekomendasi`

**Files:**
- Modify: `backend/models/BukuModel.js` (append new exports at end of file, after `getBukuTerbaru`)
- Modify: `backend/controllers/BukuController.js` (append new handler at end of file)
- Modify: `backend/routes/bukuRoutes.js:9-10`

**Interfaces:**
- Consumes: `db` from `backend/config/database` (already imported in `BukuModel.js`); `BukuModel` from `backend/controllers/BukuController.js:1` (already imported).
- Produces: `BukuModel.getBukuRekomendasi(id_buku, limit = 6)` → resolves to an array (possibly empty) of `{ id_buku, judul_buku, nama_category, pengarang, tahun_terbit, image_url, status_buku }`, sorted by relevance descending, `score`/`id_category` stripped. `BukuController.getBukuRekomendasi` (Express handler) and route `GET /buku/:id/rekomendasi` (mounted under `/api`, so full path `GET /api/buku/:id/rekomendasi`).

- [ ] **Step 1: Add the model function**

In `backend/models/BukuModel.js`, append after the existing `getBukuTerbaru` function (after line 84, before the final newline):

```js

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
    .map(({ score, id_category, ...rest }) => rest)
}
```

- [ ] **Step 2: Add the controller handler**

In `backend/controllers/BukuController.js`, append after the existing `getCategory` handler (after line 134, before the final newline):

```js

// Get rekomendasi buku berdasarkan id
exports.getBukuRekomendasi = async (req, res) => {
  const { id } = req.params
  try {
    const rekomendasi = await BukuModel.getBukuRekomendasi(id)
    res.json({
      message: 'Data rekomendasi buku berhasil diambil',
      data: rekomendasi,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mengambil data rekomendasi buku',
      error: error.message,
    })
  }
}
```

- [ ] **Step 3: Add the route**

In `backend/routes/bukuRoutes.js`, replace:

```js
router.get('/:id', bukuController.getBukuById);

module.exports = router;
```

with:

```js
router.get('/:id', bukuController.getBukuById);
router.get('/:id/rekomendasi', bukuController.getBukuRekomendasi);

module.exports = router;
```

- [ ] **Step 4: Restart the backend dev server**

If it's still running from Task 1 with `nodemon`, it auto-reloads on save — just confirm the console shows no errors after saving. Otherwise run: `npm --prefix backend run dev`

- [ ] **Step 5: Verify with curl — pick a book likely to have companions**

Run: `curl -s "http://localhost:5000/api/buku" | node -e "const d=JSON.parse(require('fs').readFileSync(0)); const m={}; for (const b of d.data){ const k=b.pengarang||''; (m[k]=m[k]||[]).push(b.id_buku,b.judul_buku) } console.log(JSON.stringify(m, null, 2))" | head -40`
Expected: a listing grouped by author — find an author with 2+ books (e.g. from the earlier "Himpunan Peraturan Kepegawaian Jilid III/IV" pair seen in the frontend session) and note one of their `id_buku` values for the next step.

- [ ] **Step 6: Verify the recommendation endpoint**

Run: `curl -s "http://localhost:5000/api/buku/<id_buku_from_step_5>/rekomendasi" | node -e "console.log(JSON.parse(require('fs').readFileSync(0)))"`
Expected: `data` is an array (length 0-6). If the chosen book has a same-author companion, that companion should appear in the array. Each item has keys `id_buku, judul_buku, nama_category, pengarang, tahun_terbit, image_url, status_buku` — no `score` or `id_category` key (confirms they were stripped).

- [ ] **Step 7: Verify the no-signal case doesn't error**

Run: `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/buku/999999999/rekomendasi"`
Expected: `200` (not `500`) with `data: []` — this hits the `if (!target) return []` early exit in `getBukuRekomendasi`, since the target lookup finds no matching book.

- [ ] **Step 8: Commit**

```bash
git add backend/models/BukuModel.js backend/controllers/BukuController.js backend/routes/bukuRoutes.js
git commit -m "Add GET /api/buku/:id/rekomendasi endpoint"
```

---

## Task 3: Wire `BookDetail.vue` to the new endpoints

**Files:**
- Modify: `frontend/src/services/bookService.js`
- Modify: `frontend/src/views/BookDetail.vue:160-199` (imports + `loadData`)

**Interfaces:**
- Consumes: `BukuModel.getBukuRekomendasi`'s response shape from Task 2 (`{ message, data: [...] }`, `data` items shaped `{ id_buku, judul_buku, nama_category, pengarang, tahun_terbit, image_url, status_buku }`); `getBukuById` (already exported in `bookService.js:6`, unchanged signature, now returns the fuller shape from Task 1.
- Produces: `getBukuRekomendasi(id)` in `bookService.js`, consumed only by `BookDetail.vue`.

- [ ] **Step 1: Add `getBukuRekomendasi` to `bookService.js`**

In `frontend/src/services/bookService.js`, current content:

```js
import { apiRequest } from './api';

export const getBuku = () => apiRequest('/buku');
export const getBukuTerbaru = () => apiRequest('/buku?sort=terbaru');
export const getCategories = () => apiRequest('/buku/categories');

export const getBukuById = (id) => apiRequest(`/buku/${id}`);
```

Append at the end:

```js
export const getBukuRekomendasi = (id) => apiRequest(`/buku/${id}/rekomendasi`);
```

- [ ] **Step 2: Update the import in `BookDetail.vue`**

In `frontend/src/views/BookDetail.vue`, replace (around line 160-163):

```js
  import {
    getBuku
  } from '../services/bookService'
```

with:

```js
  import {
    getBukuById,
    getBukuRekomendasi
  } from '../services/bookService'
```

- [ ] **Step 3: Replace `loadData()`**

In the same file, replace the current `loadData` function (currently around lines 172-199):

```js
  const loadData = async () => {
    loading.value = true
    try {
      const idParam = route.params.id

      // Memanggil getBuku() seperti halnya pada CatalogView
      const response = await getBuku()
      const allBuku = Array.isArray(response.data) ? response.data : []

      // Mencari buku spesifik berdasarkan id_buku dari URL
      buku.value = allBuku.find(item => String(item.id_buku) === String(idParam)) || null

      // Menyiapkan rekomendasi (kategori sama, ID berbeda)
      if (buku.value) {
        rekomendasiBuku.value = allBuku
          .filter(item =>
            String(item.id_buku) !== String(idParam) &&
            item.nama_category === buku.value.nama_category
          )
          .slice(0, 3)
      }
    } catch (err) {
      console.error('Gagal memuat detail buku:', err)
      buku.value = null
    } finally {
      loading.value = false
    }
  }
```

with:

```js
  const loadData = async () => {
    loading.value = true
    rekomendasiBuku.value = []
    try {
      const idParam = route.params.id

      const [bukuResult, rekoResult] = await Promise.allSettled([
        getBukuById(idParam),
        getBukuRekomendasi(idParam)
      ])

      buku.value = bukuResult.status === 'fulfilled' ? bukuResult.value.data : null

      if (bukuResult.status === 'rejected') {
        console.error('Gagal memuat detail buku:', bukuResult.reason)
      }
      if (rekoResult.status === 'fulfilled' && Array.isArray(rekoResult.value.data)) {
        rekomendasiBuku.value = rekoResult.value.data.slice(0, 3)
      } else if (rekoResult.status === 'rejected') {
        console.error('Gagal memuat rekomendasi buku:', rekoResult.reason)
      }
    } finally {
      loading.value = false
    }
  }
```

Note: `rekomendasiBuku.value = []` is reset at the top of `loadData` (not just relying on the initial `ref([])`) because `watch(() => route.params.id, ...)` re-invokes `loadData` when navigating between recommendation cards — without the reset, stale recommendations from the previous book could flash before the new ones load.

- [ ] **Step 4: Start both dev servers and open the browser preview**

Use the project's preview tooling (not a raw background shell) to start the `pttunlibrary` launch config (runs frontend + backend together), then navigate to a real book's detail page at `/buku/<id_buku_from_Task_1_step_3>` (route confirmed at `frontend/src/router/index.js:58-60`, name `book-detail`).

- [ ] **Step 5: Verify in the browser**

Check:
- Page loads without a console error, all detail fields populated (title, category badge, author, publisher, year, rak, section, status) — confirms Task 1's join fix is actually consumed correctly by the template.
- If the book has real recommendation matches, the "Rekomendasi Buku" section shows up to 3 cards with real cover/author/year/status — not the old "same category only" set.
- Click a recommendation card → navigates to that book's detail page, and its own data + recommendations load correctly (exercises the `watch(route.params.id)` re-fetch path and the `rekomendasiBuku.value = []` reset from Step 3).
- Visit a nonexistent id (e.g. `/buku/999999999`) → "Buku Tidak Ditemukan" state shows, no unhandled error in console (exercises the `Promise.allSettled` rejection path for `buku.value`).

- [ ] **Step 6: Stop the preview server**

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/bookService.js frontend/src/views/BookDetail.vue
git commit -m "Wire BookDetail.vue to GET /api/buku/:id and /rekomendasi endpoints"
```
