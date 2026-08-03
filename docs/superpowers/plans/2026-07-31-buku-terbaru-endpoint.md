# Buku Terbaru Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add backend support for a landing-page "Buku Terbaru" card by letting `GET /api/buku` return the 3 most recently added books (lightweight shape) when called with `?sort=terbaru`, without changing its existing response for the no-query-param case.

**Architecture:** `BukuController.getSemuaBuku` gains an early branch on `req.query.sort === 'terbaru'` that validates/clamps `limit` and delegates to a new `BukuModel.getBukuTerbaru(limit)`. The existing no-param code path (used by `CatalogView.vue`) is untouched. The new model function joins `buku`/`detail_buku`/`category`, orders by `detail_buku.created_at DESC`, and post-processes rows in JS to add a `tanggal_ditambahkan` field formatted as a long-form Indonesian date, dropping the raw `created_at`.

**Tech Stack:** Node.js/Express, mysql2 (`db.promise().query`, parameterized), Node's built-in `Intl.DateTimeFormat`.

## Global Constraints

- Field names in Indonesian domain convention (`judul_buku`, `pengarang`, etc.) — no translating to English. (CLAUDE.md)
- No login/auth work of any kind. (CLAUDE.md)
- SQL must use parameterized queries (`?`) — never string interpolation. (CLAUDE.md / spec #3)
- Follow the existing controller response pattern: success → `res.json({ message, data })`; error → `res.status(500).json({ message, error: error.message })`. (spec #6)
- `GET /api/buku` with **no** query params must return byte-for-byte the same shape/behavior as before this change — `CatalogView.vue` depends on it. (spec #1, #2)
- `limit` query param: valid range is exactly **1–3**; anything missing, non-numeric, `<= 0`, or `> 3` resolves to default **3**. (spec #5, corrected)
- Do not touch `/frontend` — this session is backend-only.
- Do not modify `backend/config/database.js`.

---

### Task 1: `getBukuTerbaru` model function + controller wiring + manual verification

**Files:**
- Modify: `backend/models/BukuModel.js` — add `exports.getBukuTerbaru`.
- Modify: `backend/controllers/BukuController.js:4-19` — branch `getSemuaBuku` on `req.query.sort`.
- Modify: `.claude/launch.json` — add a `backend` dev-server entry (verification tooling only, not app code).

**Interfaces:**
- Produces: `BukuModel.getBukuTerbaru(limit: number) => Promise<Array<{ id_buku, judul_buku, image_url, pengarang, nama_category, tanggal_ditambahkan }>>` — used by `BukuController.getSemuaBuku`, nowhere else in this plan.

- [ ] **Step 1: Add `getBukuTerbaru` to `BukuModel.js`**

Append to the end of `backend/models/BukuModel.js`:

```js
exports.getBukuTerbaru = async (limit) => {
  const [rows] = await db.promise().query(
    `SELECT b.id_buku, b.judul_buku, d.image_url, d.pengarang, d.created_at, c.nama_category
     FROM buku b
     INNER JOIN detail_buku d ON b.id_buku = d.id_buku
     LEFT JOIN category c ON b.id_category = c.id_category
     ORDER BY d.created_at DESC
     LIMIT ?`,
    [limit],
  )

  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return rows.map(({ created_at, ...row }) => ({
    ...row,
    tanggal_ditambahkan: formatter.format(new Date(created_at)),
  }))
}
```

- [ ] **Step 2: Branch `getSemuaBuku` in `BukuController.js` on `sort=terbaru`**

Replace the existing `exports.getSemuaBuku` (currently `backend/controllers/BukuController.js:4-19`) with:

```js
// Get data semua buku
exports.getSemuaBuku = async (req, res) => {
  const { sort, limit } = req.query

  if (sort === 'terbaru') {
    let validLimit = 3
    if (limit !== undefined) {
      const parsed = Number.parseInt(limit, 10)
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 3) {
        validLimit = parsed
      }
    }

    try {
      const buku = await BukuModel.getBukuTerbaru(validLimit)
      return res.json({
        message: 'Data buku terbaru berhasil diambil',
        data: buku,
      })
    }
    catch (error) {
      return res.status(500).json({
        message: 'Gagal mengambil data buku terbaru',
        error: error.message,
      })
    }
  }

  try {
    const buku = await BukuModel.getSemuaBuku()
    res.json({
      message: 'Data buku berhasil diambil',
      data: buku,
    })
  }
  catch (error) {

    res.status(500).json({
      message: 'Gagal mengambil data buku',
      error: error.message,
    })
  }
}
```

Everything below this function in the file (`getBukuById`, `searchBuku`, `getBukuByCategory`, `getCategory`) is unchanged.

- [ ] **Step 3: Add a `backend` entry to `.claude/launch.json` for manual verification**

`.claude/launch.json` currently only has a frontend (`pttunlibrary`, port 5173) entry. Add a second configuration so the backend can be previewed independently:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "pttunlibrary",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    },
    {
      "name": "backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["--prefix", "backend", "run", "dev"],
      "port": 5000
    }
  ]
}
```

- [ ] **Step 4: Start the backend dev server and confirm it's up**

Start it with the preview tool (`preview_start` with `{"name": "backend"}`), then check logs for the startup message.
Expected log line: `Server backend berjalan di http://localhost:5000`

If it fails to start, check `preview_logs` for a DB connection error before proceeding — this plan doesn't touch `config/database.js`, so a failure here means local MySQL isn't reachable and needs to be running first (ask the user, don't change connection config).

- [ ] **Step 5: Regression check — `GET /api/buku` with no params is unchanged**

```bash
curl -s "http://localhost:5000/api/buku" | head -c 2000
```

Expected: JSON with `"message": "Data buku berhasil diambil"` and `data` as an array of objects containing `id_buku, judul_buku, nama_category, pengarang, penerbit, tahun_terbit, stok_tersedia, status_buku, image_url, nama_rak, nama_section` (same shape `getSemuaBuku` produced before this change — no `tanggal_ditambahkan` field here).

- [ ] **Step 6: `GET /api/buku?sort=terbaru` (default limit) returns 3 books, correct shape**

```bash
curl -s "http://localhost:5000/api/buku?sort=terbaru" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    const body = JSON.parse(d);
    console.log('count:', body.data.length);
    console.log('sample:', body.data[0]);
  });
"
```

Expected: `count: 3`; each item has exactly `id_buku, judul_buku, image_url, pengarang, nama_category, tanggal_ditambahkan` (no `created_at`, no `penerbit`/`tahun_terbit`/`stok_tersedia`); `tanggal_ditambahkan` looks like `"31 Juli 2026"` (day, full Indonesian month name, year).

- [ ] **Step 7: `limit=5` clamps to 3, not honored as 5**

```bash
curl -s "http://localhost:5000/api/buku?sort=terbaru&limit=5" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.length))"
```

Expected: `3`.

- [ ] **Step 8: `limit=abc` (invalid) falls back to default 3**

```bash
curl -s "http://localhost:5000/api/buku?sort=terbaru&limit=abc" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.length))"
```

Expected: `3`.

- [ ] **Step 9: `limit=999` clamps to 3**

```bash
curl -s "http://localhost:5000/api/buku?sort=terbaru&limit=999" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.length))"
```

Expected: `3`.

- [ ] **Step 10: `limit=2` (within 1–3) is honored as-is**

```bash
curl -s "http://localhost:5000/api/buku?sort=terbaru&limit=2" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.length))"
```

Expected: `2`.

- [ ] **Step 11: Stop the backend dev server**

Use `preview_stop` on the server started in Step 4.

- [ ] **Step 12: Commit**

```bash
git add backend/models/BukuModel.js backend/controllers/BukuController.js .claude/launch.json
git commit -m "$(cat <<'EOF'
Add buku terbaru support to GET /api/buku via ?sort=terbaru

CatalogView.vue's existing no-param response is untouched. New branch
returns the 3 most recent books (by detail_buku.created_at) with a
lightweight shape and an Indonesian-formatted tanggal_ditambahkan.
EOF
)"
```
