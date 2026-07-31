# Buku Terbaru Endpoint — Design Spec

Date: 2026-07-31

## Context

Landing page needs a "Buku Terbaru" (newest books) card section, out of scope
for this session (backend-only). This spec covers the backend API support
only: a way to fetch the N most recently added books, ordered by recency.

A `created_at` column was just added to `detail_buku` (not part of the
original schema documented in `CLAUDE.md`). Per user confirmation, all 191
existing rows share the same `created_at` value (set at the time the column
was added via migration, presumably `DEFAULT CURRENT_TIMESTAMP`). There is no
book-creation endpoint in the backend yet (`grep` for `INSERT INTO buku` /
`INSERT INTO detail_buku` found no matches) — new books are currently added
outside the API (e.g. direct SQL / import), so how future `created_at` values
get populated is outside this spec's control and out of scope.

Existing relevant code:
- `BukuModel.getSemuaBuku()` — full aggregated book list, joins
  `buku`/`detail_buku`/`category`/`rak`/`section`, used by `CatalogView.vue`.
  Response shape must not change for the no-query-param case.
- `BukuController.getSemuaBuku` — handles `GET /buku`.
- `bukuRoutes.js` — `router.get('/', bukuController.getSemuaBuku)`, plus
  `/search`, `/categories`, `/category/:category`, `/:id`.

## Goal

Add a way to fetch the 3 most recently added books (by `detail_buku.created_at`)
with a lightweight response shape, for the landing page card, without
breaking the existing `GET /buku` response shape relied on by `CatalogView.vue`.

## Decisions

### 1. Reuse `GET /buku` with a query param — no new route

`GET /buku?sort=terbaru&limit=3` triggers the new behavior. `GET /buku` with
no query params behaves exactly as it does today (unchanged, for
`CatalogView.vue` compatibility). No new entry added to `bukuRoutes.js`.

Rejected: a dedicated `GET /buku/terbaru` route — would work fine too, but
the user chose the query-param approach.

### 2. Controller branches, does not modify the existing query path

`BukuController.getSemuaBuku` checks `req.query.sort`:
- `sort === 'terbaru'` → parse/clamp `limit`, call new
  `BukuModel.getBukuTerbaru(limit)`, return its (lightweight) rows.
- otherwise → existing behavior unchanged, calls `BukuModel.getSemuaBuku()`.

`BukuModel.getSemuaBuku()` itself is **not modified**.

### 3. New model function: `getBukuTerbaru(limit)`

```sql
SELECT b.id_buku, b.judul_buku, d.image_url, c.nama_category
FROM buku b
INNER JOIN detail_buku d ON b.id_buku = d.id_buku
LEFT JOIN category c ON b.id_category = c.id_category
ORDER BY d.created_at DESC
LIMIT ?
```

- `INNER JOIN detail_buku` — schema guarantees exactly 1 row per buku, and
  `created_at` lives on `detail_buku`.
- `LEFT JOIN category` — defensive, consistent with `getSemuaBuku`.
- `limit` is parameterized (`?`), passed in as an already-validated integer
  (see below) — never string-interpolated.

### 4. Response shape: lightweight, card-only fields

`id_buku, judul_buku, image_url, nama_category` — per user's choice, not the
full `getSemuaBuku` shape (no pengarang/penerbit/tahun_terbit/stok/rak/section).

### 5. Limit validation (in the controller)

`limit` query param parsed via `Number.parseInt`, then clamped:
- default **3** if missing, non-numeric, or `<= 0`
- max **20** (prevents accidental/abusive large requests)

This keeps the SQL injection-safe guarantee (only a validated integer ever
reaches the query) without needing a separate validation endpoint/middleware.

### 6. Error handling

Same pattern as the rest of `BukuController`: try/catch,
`res.status(500).json({ message, error: error.message })` on failure.

## Out of scope

- Frontend landing page card itself (separate session, per user instruction).
- How `created_at` gets populated for books added after this migration (no
  create-book endpoint exists yet in the backend).
- Any change to `BukuModel.getSemuaBuku()`'s existing query or response shape.

## Testing / verification

No automated test framework exists in the backend (per prior spec's finding,
still true). Verification is manual:
- `GET /buku` (no params) → confirm response shape/content unchanged from
  before this change (regression check for `CatalogView.vue`).
- `GET /buku?sort=terbaru` → 3 books, lightweight shape, ordered by
  `created_at` descending.
- `GET /buku?sort=terbaru&limit=5` → 5 books.
- `GET /buku?sort=terbaru&limit=abc` (invalid) → falls back to default 3.
- `GET /buku?sort=terbaru&limit=999` → clamped to 20.

## Files touched

- `backend/models/BukuModel.js` — add `getBukuTerbaru(limit)`.
- `backend/controllers/BukuController.js` — `getSemuaBuku` branches on
  `req.query.sort`.
