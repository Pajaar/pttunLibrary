# Catalog Search & Filter — Design Spec

Date: 2026-07-24

## Context

`CatalogView.vue` (the public book catalog page) already has static, non-functional
search/filter UI: a search input, a category checkbox sidebar, a "Tipe Buku"
checkbox group, a "Ketersediaan" checkbox group, and a sort dropdown. None of it
is wired up. The category values shown don't match the 14 real categories, and
"Tipe Buku" (Jurnal/Putusan/Laporan) isn't a field that exists in the schema.

The backend has one relevant endpoint, `GET /buku/search?keyword=`, which does a
`LIKE` match on `judul_buku` OR `pengarang` only. `GET /buku` (used by the
catalog page today) runs `SELECT * FROM buku` with no join, so category, rak,
section, author, publisher, year, and status never reach the frontend today.

Real DB schema (confirmed via live `SHOW COLUMNS`, since `schema.sql` in the
repo is empty):

```
buku:         id_buku (int), judul_buku (text), id_category (int)
detail_buku:  id_detail (int), id_buku (int), pengarang (text), penerbit (text),
              tahun_terbit (year), halaman (int), id_rak (int), id_section (int),
              total_buku (int), stok_tersedia (int),
              status_buku (enum: 'tersedia','tidak tersedia'),
              image_url (varchar 500)
category:     id_category (int), nama_category (varchar 100)
rak:          id_rak (int), nama_rak (varchar 50)
section:      id_section (int), nama_section (varchar 50)
```

Note: `section` has no visible FK back to `rak` — rak and section are both
referenced independently from `detail_buku`, not nested under each other.

## Goal

Make the existing catalog search/filter UI functional and correct, matching
the real schema, for an internal staff-facing catalog of ~191 books.

## Decisions

### 1. Client-side filtering (not server-side)

Fetch the full book list once via `GET /buku` on mount, then do all
search/filter/sort reactively in Vue via computed properties. No debouncing
needed — 191 rows is trivial to filter on every keystroke.

Rejected: server-side query-param filtering. Adds real complexity (dynamic SQL
building, per-keystroke network round-trips, loading states) that isn't
justified at this data size. Revisit if the catalog grows by an order of
magnitude or more.

### 2. Backend: `getSemuaBuku` must join related tables

`BukuModel.getSemuaBuku` changes from `SELECT * FROM buku` to:

```sql
SELECT b.id_buku, b.judul_buku,
       c.nama_category,
       d.pengarang, d.penerbit, d.tahun_terbit, d.stok_tersedia,
       d.status_buku, d.image_url,
       r.nama_rak, sec.nama_section
FROM buku b
INNER JOIN detail_buku d ON b.id_buku = d.id_buku
LEFT JOIN category c ON b.id_category = c.id_category
LEFT JOIN rak r ON d.id_rak = r.id_rak
LEFT JOIN section sec ON d.id_section = sec.id_section
```

- `detail_buku`: `INNER JOIN` — schema guarantees exactly 1 row per buku.
- `category`/`rak`/`section`: `LEFT JOIN` — defensive; a book missing one of
  these FKs still appears in the catalog rather than disappearing silently.

Same endpoint (`GET /buku`), same response shape (array of book objects), just
richer fields per object. No new route. `GET /buku/search` is left untouched
(unused by this feature, out of scope to change or remove).

### 3. Searchable vs. filterable fields

- **Free-text search** (single input, substring match, case-insensitive):
  `judul_buku`, `pengarang`, `penerbit`.
- **Dropdown filters** (exact match, all combined with the search and each
  other via AND):
  - Kategori (`nama_category`)
  - Status (`status_buku`: tersedia / tidak tersedia)
  - Rak (`nama_rak`)
  - Section (`nama_section`)
  - Tahun Terbit (`tahun_terbit`, exact-year dropdown, not a range)

Rak and Section are **independent** dropdowns (no cascading) — the schema
doesn't model section as nested under rak, so filtering narrows on both
independently.

Dropdown option lists are **derived from the fetched book data** (distinct
values, sorted; year sorted descending), not hardcoded — this guarantees every
filter option string exactly matches what's actually in the data, with no
separate list to keep in sync as data changes.

### 4. Combine logic

All active filters (search text + every selected dropdown) combine with AND.
No "OR mode" or separate search/filter toggle.

### 5. Sort

Wire up the existing (currently non-functional) sort dropdown:
- **Paling Relevan** — original fetch order (no sort applied).
- **Terbaru** — `tahun_terbit` descending.
- **Judul A-Z** — `judul_buku` ascending, locale-aware compare.

Sort applies on top of the filtered result set.

### 6. No pagination

191 books is small enough to render in full on one page; the header already
shows "Menampilkan X dari Y buku" as a count, not a page indicator.

### 7. Component structure

Extend `CatalogView.vue` directly — no new component. Filtering is page-local
state used nowhere else, so prop/emit overhead isn't justified. Existing
markup (search input, filter sidebar, sort select, book grid) is corrected in
place to bind to real state instead of being static.

### 8. UI details

- Search input filters reactively on every keystroke; the "Cari Buku" button
  stays in the markup as-is (it's not inside a `<form>`, so it's already a
  harmless no-op — not worth removing).
- Category checkboxes → replaced with a single-select dropdown, sourced from
  real category names, consistent with the Status/Rak/Section/Year filters —
  not the incorrect hardcoded 3 values currently there.
- "Tipe Buku" checkbox group (Jurnal/Putusan/Laporan) is **removed** — not a
  real field in the schema.
- "Ketersediaan" checkboxes → bound to `status_buku`.
- New: Rak, Section, Tahun Terbit filter dropdowns added to the sidebar.
- Empty-result state: when filters/search produce zero matches, show a
  distinct message ("Tidak ada buku yang cocok dengan filter Anda") separate
  from the existing "Belum ada data buku" (empty-database) message.
- Header counts become `sortedBuku.length` / `daftarBuku.length`.

## Out of scope

- Admin `BookListView.vue` (currently an empty file) — not touched.
- `BookCard.vue` component — unused/unwired dead scaffold, unrelated to this
  feature.
- `GET /buku/search` endpoint — left as-is, unused by this feature.
- Frontend build tooling gap: `frontend/` has no committed `package.json`,
  `vite.config.js`, or `index.html` (confirmed via `git ls-files` — never
  committed, not gitignored). This blocks running/building the frontend at
  all and is a separate, larger issue from this feature. Flagged for the user
  to address separately.

## Testing / verification

No automated test framework exists for either frontend or backend (confirmed:
no test runner in `backend/package.json`; no frontend tooling committed at
all), and the user has chosen to skip adding one for this task. Verification
will be manual: run the app and exercise each filter alone, filters combined,
search + filters together, each sort option, the empty-result state, and the
empty-database state.

## Files touched

- `backend/models/BukuModel.js` — `getSemuaBuku` query gains joins.
- `frontend/src/views/CatalogView.vue` — wire up search/filter/sort state,
  correct filter fields to match real schema, remove "Tipe Buku" group, add
  Rak/Section/Tahun Terbit filters, empty-result state.
