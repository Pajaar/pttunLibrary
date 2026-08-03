# Backend Peminjaman Buku — Design Spec

Date: 2026-08-03

## Context

Three scaffold files exist for book borrowing but are stubs:
- `backend/models/PeminjamanModel.js` — `{ tableName: 'peminjaman' }` only.
- `backend/controllers/PeminjamanController.js` — one handler, `getPeminjaman`,
  returns `501 Fitur data peminjaman belum tersedia`.
- `backend/routes/peminjamanRoutes.js` — one route, `GET /` wired to the stub.
- `bukuRoutes`/`authRoutes`/`penggunaRoutes`/`peminjamanRoutes` are all
  already mounted in `backend/routes/index.js` under `/peminjaman`.

This spec is user-authored (design decisions below were handed over already
finalized) and formalized here to match this repo's spec/plan/execute
workflow. Source: user-provided prompt + a mockup screenshot of the
"Formulir Peminjaman Buku" borrow form (frontend, out of scope for this spec
— see Out of scope).

The frontend form's dropdown for peminjaman duration is currently mislabeled
"Nomor Kontak" (likely copy-paste from the field above it) — noted for a
future frontend session, not fixed here.

### `peminjaman` table (confirmed against the live database — source of truth)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_peminjaman` | int, PK, auto_increment | |
| `id_detail` | int, FK, index (MUL) | Holds the same value as `buku.id_buku` / `detail_buku.id_buku` — despite the name, there is no separate PK on `detail_buku`; joins use `detail_buku.id_buku = peminjaman.id_detail`. |
| `nama_peminjam` | varchar(150), nullable in DB, required at the application layer | |
| `no_telpon` | varchar(20), nullable in DB, required at the application layer | |
| `tanggal_pinjam` | date, NOT NULL | Set by the backend = today (Asia/Jakarta), never from user input. |
| `durasi_hari` | int, default 7 | Max 7 (matches `CLAUDE.md`'s "durasi_peminjaman (max 7 hari)"). |
| `due_date` | date, NOT NULL | Computed backend-side = `tanggal_pinjam + durasi_hari` days. |
| `status` | enum('dipinjam','dikembalikan','terlambat'), default 'dipinjam' | See transition rules below. |

**Note — CLAUDE.md discrepancy:** `CLAUDE.md`'s schema section lists this
table's fields as `nama`, `nomor_telpon`, `durasi_peminjaman` — different
names than the table above (`nama_peminjam`, `no_telpon`, `durasi_hari`).
Given `CLAUDE.md`'s book count was already found stale this session (see
memory: actual is 878 buku, not the documented 191), the table above — from
live-DB confirmation — is treated as authoritative. `CLAUDE.md` should be
corrected in a future pass; not done here to stay in scope.

Related field on `detail_buku`: `stok_tersedia` (int) — read for
availability checks, written on borrow/return (see below).

## Goal

Implement the three borrowing endpoints backing the existing (already
designed, not-yet-built) "Formulir Peminjaman Buku" flow: submit a loan,
list loans (staff view), update a loan's status (mark returned, etc.) —
following this backend's existing Buku* patterns exactly.

## Decisions

### 1. Submit = immediately borrowed, no approval gate

`POST /api/peminjaman` inserts directly with `status = 'dipinjam'` and
immediately decrements `detail_buku.stok_tersedia`. The form's "Petugas
perpustakaan akan menghubungi Anda..." notice is a purely administrative/
offline follow-up, not a technical approval gate.

### 2. Stock returns on transition to `dikembalikan`, guarded against double-increment

`PATCH /api/peminjaman/:id/status` increments `stok_tersedia` by 1 only
when the new status is `dikembalikan` AND the previous status was NOT
already `dikembalikan` — calling it twice in a row must not double-credit
stock. Transitioning to `terlambat` never touches stock (the book is still
out).

### 3. No cron/scheduler for auto-marking `terlambat`

There's no scheduler infrastructure in this backend, and adding one is out
of scope. Resolved (per user decision during spec review): `GET
/api/peminjaman` computes an **effective status** per row —
`due_date < today AND status === 'dipinjam'` → reported as `terlambat` in
the response — **without writing to the database**. The stored `status`
column is untouched by this computation; it still only changes via the
`PATCH` endpoint (staff action). This gives staff visibility into overdue
loans in the list view with no scheduler and no double-bookkeeping between
"real" and "derived" status.

### 4. Concurrency: borrow is a transaction

`POST /api/peminjaman`'s availability check, insert, and stock decrement run
inside one transaction (`db.promise().getConnection()` →
`beginTransaction`/`commit`/`rollback`) so two simultaneous borrow requests
for the last copy of a book can't both succeed.

## Endpoints

### 1. `POST /api/peminjaman` — submit a loan

Body: `{ id_detail, nama_peminjam, no_telpon, durasi_hari }` (`durasi_hari`
optional, defaults to 7).

Validation (mirrors `BukuController.searchBuku`'s `keyword` check — `400`
with a clear `{ message }` on failure):
- `id_detail` required, numeric.
- `nama_peminjam` required, non-empty after trim.
- `no_telpon` required, non-empty after trim.
- `durasi_hari`, if sent, must be an integer 1–7; otherwise `400`.

Logic (in one transaction):
1. Look up `detail_buku` where `id_buku = id_detail`. Not found → `404`.
   `stok_tersedia <= 0` → `400` ("Buku sedang tidak tersedia").
2. `tanggal_pinjam` = today in Asia/Jakarta, as `YYYY-MM-DD` (same timezone
   convention as `BukuModel.getBukuTerbaru`'s `Intl.DateTimeFormat`, applied
   to produce a DATE string here instead of a display string).
3. `due_date` = `tanggal_pinjam` + `durasi_hari` days.
4. `INSERT INTO peminjaman (id_detail, nama_peminjam, no_telpon,
   tanggal_pinjam, durasi_hari, due_date, status) VALUES (?, ?, ?, ?, ?, ?,
   'dipinjam')`.
5. `UPDATE detail_buku SET stok_tersedia = stok_tersedia - 1 WHERE id_buku
   = ?`.
6. Commit. Response `data`: the new peminjaman row, joined to `buku` for
   `judul_buku` (so the frontend can show a confirmation without a second
   fetch).

### 2. `GET /api/peminjaman` — list all loans (staff view)

Replaces the `501` stub. Joins `peminjaman` → `detail_buku` (on
`detail_buku.id_buku = peminjaman.id_detail`) → `buku` (on `buku.id_buku =
detail_buku.id_buku`) for `judul_buku`, mirroring `BukuModel`'s join style.
Ordered `tanggal_pinjam DESC`. Each row's `status` in the response is the
**effective status** per decision #3 (DB value, unless overdue-and-still-
`dipinjam`, in which case reported as `terlambat`) — the underlying DB
column is never written by this endpoint. No pagination/filtering (YAGNI —
878 buku's worth of loans is small; add later if the staff UI needs it).

### 3. `PATCH /api/peminjaman/:id/status` — update loan status

Body: `{ status }`, must be one of `'dipinjam' | 'dikembalikan' |
'terlambat'` — `400` otherwise.

Logic:
1. Fetch the existing row by `id_peminjaman`. Not found → `404`.
2. `UPDATE peminjaman SET status = ? WHERE id_peminjaman = ?`.
3. If new status is `dikembalikan` AND old status was NOT `dikembalikan`:
   `UPDATE detail_buku SET stok_tersedia = stok_tersedia + 1 WHERE id_buku
   = (this row's id_detail)`.
4. Response `data`: the row after update.

## Response pattern

Follow the existing `BukuController` convention exactly (manual
`res.json({ message, data })` / `res.status(xxx).json({ message, ...
})`) — `backend/utils/response.js` exists but is **not used** by any
current controller; don't introduce it here either, for consistency with
the rest of the codebase.

## Files touched

- `backend/models/PeminjamanModel.js` — implement (naming to match
  `BukuModel.js`'s style, e.g. `buatPeminjaman`, `getSemuaPeminjaman`,
  `updateStatusPeminjaman`).
- `backend/controllers/PeminjamanController.js` — 3 handlers, replacing the
  `501` stub.
- `backend/routes/peminjamanRoutes.js` — add `POST /` and `PATCH
  /:id/status`; keep the existing `GET /` route, pointed at the new handler.

## Out of scope

- The borrow form itself (frontend) — separate session, after this backend
  is done. Includes fixing the mislabeled "Nomor Kontak" dropdown.
- Cron/scheduler-based auto-marking of `terlambat` in the database.
- Approval/pending workflow (decided: immediate borrow on submit).
- Pagination/filtering for `GET /api/peminjaman`.
- Correcting `CLAUDE.md`'s stale `peminjaman` field names.

## Testing / verification

No automated test framework in this backend (unchanged finding from prior
specs). Manual verification via curl against the running dev server:
- `POST /api/peminjaman` for a book with `stok_tersedia > 0` → `200`,
  stock drops by 1 (check via `GET /api/buku/:id`), `due_date` correct.
- `POST` for a book with `stok_tersedia = 0` → rejected, stock unchanged.
- `POST` missing `nama_peminjam` / `no_telpon` → `400`.
- `POST` with `durasi_hari = 10` → `400` (outside 1–7).
- `GET /api/peminjaman` → full list including `judul_buku`; a loan whose
  `due_date` has passed and is still `dipinjam` in the DB shows as
  `terlambat` in the response.
- `PATCH /api/peminjaman/:id/status` with `{ status: 'dikembalikan' }` →
  related book's `stok_tersedia` increases by 1.
- Same `PATCH` called twice in a row → stock increases by 1 total, not 2
  (double-increment guard).
- `PATCH` with a `status` outside the 3-value enum → `400`.
