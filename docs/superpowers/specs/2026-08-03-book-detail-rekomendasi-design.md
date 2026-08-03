# Detail Buku + Rekomendasi — Design Spec

Date: 2026-08-03

## Context

`BookDetail.vue` (lines ~172-199) currently calls `getBuku()` (`GET /api/buku`,
`BukuModel.getSemuaBuku`) to fetch **all** books (now 878 rows — `CLAUDE.md`'s
"191 buku" figure is stale, not to be used as a scale reference), then does a
client-side `.find()` to locate the one book by `id_buku`, and builds
"recommendations" via a plain `nama_category === buku.value.nama_category`
filter, `.slice(0, 3)`.

Root cause: `GET /api/buku/:id` already exists
(`bukuRoutes.js` → `BukuController.getBukuById` → `BukuModel.getBukuById`),
but the model query is `SELECT * FROM buku WHERE id_buku = ?` — no join to
`detail_buku`/`category`, so `pengarang`, `image_url`, `nama_category`, etc.
never come back. The frontend likely worked around this by pulling the full
list instead.

The "Rekomendasi Buku" UI section (markup/styling/card, `BookDetail.vue` lines
~91-145) already exists and is not being rebuilt — only its data source
changes.

There is also an uncommitted local change to `BookDetail.vue`
(the "Kembali ke Katalog" link now points to `/katalog`, and the
recommendation grid was switched from Bootstrap `row`/`col` to a
`d-flex flex-wrap` layout). That change is purely markup/styling and is
preserved as-is — this spec only touches the `<script setup>` data-fetching
logic.

## Goal

1. Fix `BukuModel.getBukuById` to return a fully-joined book (same fields
   `BookDetail.vue`'s template needs).
2. Add a recommendation endpoint that scores candidates by category match +
   author match + title word overlap (computed in Node, not SQL
   FULLTEXT/MATCH — rejected earlier: needs Indonesian stopword/stemming
   tuning the codebase has no precedent for; `searchBuku` only ever used
   plain `LIKE`).
3. Wire `BookDetail.vue` to both, dropping the "fetch all 878, filter
   client-side" approach entirely.

## Decisions

### 1. `BukuModel.getBukuById` — join fix

Replace `SELECT * FROM buku WHERE id_buku = ?` with a join mirroring
`getSemuaBuku`, but **without** aggregation (`GROUP BY`/`MIN`/`SUM`) —
`CLAUDE.md` states 1 buku = 1 detail_buku always, so a plain `JOIN` covers it;
aggregation in `getSemuaBuku` is defensive but unnecessary here for a
single-row lookup.

```sql
SELECT b.id_buku, b.judul_buku, b.id_category,
       c.nama_category,
       d.pengarang, d.penerbit, d.tahun_terbit, d.image_url,
       r.nama_rak, sec.nama_section,
       CASE WHEN d.stok_tersedia > 0 THEN 'Tersedia' ELSE 'Tidak Tersedia' END AS status_buku
FROM buku b
JOIN detail_buku d ON b.id_buku = d.id_buku
LEFT JOIN category c ON b.id_category = c.id_category
LEFT JOIN rak r ON d.id_rak = r.id_rak
LEFT JOIN section sec ON d.id_section = sec.id_section
WHERE b.id_buku = ?
```

- Fields chosen to match what `BookDetail.vue`'s template actually reads:
  `judul_buku`, `nama_category`, `pengarang`, `penerbit`, `tahun_terbit`,
  `nama_rak`, `nama_section`, `image_url`, `status_buku`. `id_category` is
  included too — harmless, and useful if the frontend ever needs it, though
  not currently read by the template.
- `status_buku` is computed from `stok_tersedia` (`CASE WHEN...`), matching
  `getSemuaBuku`'s convention — **not** the raw `d.status_buku` column, which
  `searchBuku` reads directly (pre-existing inconsistency in the codebase,
  left alone; not this task's concern).
- `BukuController.getBukuById` and the `404` handling are unchanged — the
  model still returns `undefined` for a missing id, controller already
  handles that.

### 2. Recommendation endpoint: `GET /api/buku/:id/rekomendasi`

Separate route (not merged into the `:id` response), added to
`bukuRoutes.js`:

```js
router.get('/:id/rekomendasi', bukuController.getBukuRekomendasi)
```

Rationale (per user decision): matches the existing sub-resource style
already used for `/category/:category`; keeps `getBukuById` single-purpose
(just the book); isolates recommendation logic so it can be tuned later
without touching the detail endpoint; frontend calls both in parallel so
there's no serial latency cost.

New `BukuController.getBukuRekomendasi` — same try/catch +
`res.json({ message, data })` / `res.status(500).json({ message, error })`
pattern as the rest of the controller.

New `BukuModel.getBukuRekomendasi(id_buku, limit = 6)`:

**Step 1 — target signals** (small lookup query):

```sql
SELECT b.id_category, b.judul_buku, d.pengarang
FROM buku b
JOIN detail_buku d ON b.id_buku = d.id_buku
WHERE b.id_buku = ?
```

If no row found, return `[]` immediately (caller book doesn't exist —
`getBukuRekomendasi` route can be hit independently of `:id`, so this must
not assume the detail lookup already ran).

**Step 2 — candidate pool** (SQL-filtered, not a full 878-row scan):

```sql
SELECT b.id_buku, b.judul_buku, b.id_category,
       c.nama_category, d.pengarang, d.tahun_terbit, d.image_url,
       CASE WHEN d.stok_tersedia > 0 THEN 'Tersedia' ELSE 'Tidak Tersedia' END AS status_buku
FROM buku b
JOIN detail_buku d ON b.id_buku = d.id_buku
LEFT JOIN category c ON b.id_category = c.id_category
WHERE b.id_buku != ?
  AND (b.id_category = ? OR d.pengarang = ?)
```

Both category and author gate the candidate pool (both are "sinyal utama"
per the user's framing, not just category) — this also naturally handles
`NULL` targets safely: `col = NULL` never matches in MySQL, so a target with
no category and no author simply yields zero candidates (no special-case
code needed), and downstream that means empty recommendations, which the
UI already handles via `v-if="rekomendasiBuku.length > 0"`.

**Step 3 — scoring (in JS)**:

```js
const STOPWORDS = new Set([
  'dan', 'di', 'ke', 'dari', 'untuk', 'atau', 'dengan', 'pada',
  'yang', 'ini', 'itu', 'adalah', 'oleh', 'atas', 'dalam',
])

function tokenizeJudul(judul) {
  return new Set(
    (judul || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOPWORDS.has(word)),
  )
}
```

Per candidate: `score = 0`
- `+2` if `candidate.id_category === target.id_category` (and not null)
- `+3` if `candidate.pengarang === target.pengarang` (and not null) — weighted
  higher than category: same author is a stronger relatedness signal than
  same category, and is what mainly catches multi-jilid/edition companions.
- `+1` per token in `tokenizeJudul(candidate.judul_buku)` that's also in
  `tokenizeJudul(target.judul_buku)` — catches same-series-different-jilid
  titles ("... Jilid IV" vs "... Jilid III") via title-stem overlap.

Deliberately **not** adding domain words (`hukum`, `peraturan`, etc.) to the
stopword list — guessing which domain words are "too common" across 878
titles without frequency data risks being wrong, and since title-overlap is
only a `+1` nudge against `+2`/`+3` signals, any noise it adds is minor. Easy
to extend the stopword list later if it proves noisy in practice.

**Step 4 — filter, sort, limit**:

```js
scored
  .filter(c => c.score > 0)   // no padding — per user decision, show only real matches
  .sort((a, b) => b.score - a.score || (b.tahun_terbit || 0) - (a.tahun_terbit || 0))
  .slice(0, limit)            // limit = 6
```

Internal-only fields (`score`, `id_category`) are stripped before the
response is sent — the returned shape is
`id_buku, judul_buku, nama_category, pengarang, tahun_terbit, image_url, status_buku`,
matching exactly what the existing recommendation card markup
(`BookDetail.vue` lines ~104-136) reads.

`limit` defaults to `6` (not user-configurable via query param — no current
need, YAGNI) so the frontend has headroom to show more than 3 later (e.g. a
"lihat lebih" control) without a backend change.

### 3. Frontend: `bookService.js`

Add:

```js
export const getBukuRekomendasi = (id) => apiRequest(`/buku/${id}/rekomendasi`);
```

### 4. Frontend: `BookDetail.vue`

Replace `loadData()`'s body. Drop the `getBuku()` + `.find()` + category
filter entirely. New logic:

```js
const idParam = route.params.id

const [bukuResult, rekoResult] = await Promise.allSettled([
  getBukuById(idParam),
  getBukuRekomendasi(idParam),
])

buku.value = bukuResult.status === 'fulfilled' ? bukuResult.value.data : null

rekomendasiBuku.value =
  rekoResult.status === 'fulfilled' && Array.isArray(rekoResult.value.data)
    ? rekoResult.value.data.slice(0, 3)
    : []
```

`Promise.allSettled` (not `Promise.all`) so a failure in the recommendation
call doesn't take down the whole page — the book detail still renders even
if `/rekomendasi` errors, just with an empty recommendation section
(existing `v-if` already hides it when empty). This was part of the
rationale the user approved when picking the separate-endpoint option
("frontend calls both in parallel").

`.slice(0, 3)` is applied on the frontend (backend returns up to 6) per the
user's decision — gives room to raise the displayed count later without
another backend change.

`loading.value` still wraps the whole `loadData()` call as it does today
(set `true` at start, `false` in `finally`); no change to that mechanism.

Template (lines 91-145) and `<style scoped>` are **not modified** — existing
field bindings (`item.id_buku`, `judul_buku`, `image_url`, `nama_category`,
`pengarang`, `tahun_terbit`, `status_buku`) already match the new response
shape.

The uncommitted local markup/styling changes (katalog link, flexbox layout)
are preserved — this spec's diff is scoped to `<script setup>` only.

## Out of scope

- Any change to `getSemuaBuku`, `searchBuku`, `getBukuByCategory`,
  `getBukuTerbaru` — untouched.
- Fixing `searchBuku`'s raw `status_buku` column read (pre-existing
  inconsistency, unrelated to this task).
- A "lihat lebih rekomendasi" UI control — backend leaves room for it
  (`limit = 6`) but building it is not part of this session.
- Making `limit` a query param on `/rekomendasi` — no current caller needs
  it.
- Corpus-frequency-based (IDF-style) title stopwording — rejected in favor
  of a small fixed generic-Indonesian stopword list; see Step 3 rationale.

## Testing / verification

No automated test framework in the backend (consistent with prior specs).
Manual verification:

- `GET /api/buku/:id` for a known id → response now includes `pengarang`,
  `penerbit`, `tahun_terbit`, `nama_category`, `nama_rak`, `nama_section`,
  `image_url`, `status_buku` (previously only raw `buku` columns).
- `GET /api/buku/:id` for a non-existent id → still `404`, unchanged.
- `GET /api/buku/:id/rekomendasi` for a book with same-category and
  same-author companions → those rank above pure title-overlap-only or
  category-only matches.
- A book whose title matches a series sibling (e.g. "... Jilid IV" /
  "... Jilid III") → sibling appears in recommendations even if
  category/author alone wouldn't have been decisive.
- A book with no category and no author on file → `/rekomendasi` returns
  `[]`, recommendation section hidden on the detail page (no error).
- Kill the backend (or hit a bad id) → `BookDetail.vue` still shows the
  correct loading/not-found state; a `/rekomendasi` failure alone doesn't
  cause a false "Buku Tidak Ditemukan".
- Browser check: navigate to a real book's detail page, confirm all detail
  fields render, confirm recommendation cards show real data (not the old
  "same category only" set), click a recommendation card and confirm
  navigation + reload of the new detail page works (existing `watch` on
  `route.params.id`).

## Files touched

- `backend/models/BukuModel.js` — fix `getBukuById`, add
  `getBukuRekomendasi`.
- `backend/controllers/BukuController.js` — add `getBukuRekomendasi`.
- `backend/routes/bukuRoutes.js` — add `/:id/rekomendasi` route.
- `frontend/src/services/bookService.js` — add `getBukuRekomendasi`.
- `frontend/src/views/BookDetail.vue` — replace `loadData()`'s
  data-fetching logic only.
