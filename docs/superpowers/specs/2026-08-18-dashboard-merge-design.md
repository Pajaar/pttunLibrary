# Merge dashboard_pttun into pttunLibrary — Design Spec

Date: 2026-08-18

## Context

Two separate internship projects currently exist:

- **pttunLibrary** (this repo) — public book catalog + peminjaman (borrow)
  form. Own git repo, already security-audited this internship (SQLi/XSS
  clean, rate limiting on write endpoints, no raw DB errors leaked to
  clients, auto-return for overdue loans). `AuthController.js` and
  `PenggunaController.js` exist but are 501 stubs — auth was deliberately
  deferred for the public catalog side. `frontend/src/views/admin/*.vue`
  and `AdminLayout.vue`/`MemberLayout.vue` already exist as files but are
  **not wired into `frontend/src/router/index.js`** — orphaned scaffolding.
- **dashboard_pttun** (`C:\Users\Pajaar\OneDrive\Documents\Internship\dashboard_pttun`)
  — admin/staff dashboard with full CRUD for buku/category/rak, Cloudinary
  cover upload, and a camera-based cover scanner (opencv-js + jscanify).
  Separate git repo (`https://github.com/faiqalharits/dashboard_pttun.git`,
  branch `Pajaar/Branch`, likely collaborative with another intern). Has
  **zero backend auth** — no `authRoutes`/`authController`/`authService`
  despite a `LoginView.vue` existing — so its destructive endpoints
  (buku/category/rak DELETE/UPDATE) are currently open to anyone who can
  reach the API. Its `backend/config/database.js` is byte-identical to
  pttunLibrary's and both have a configured `.env`, strongly suggesting
  both point at the same MySQL database (not confirmed by reading either
  `.env`'s contents — that wasn't necessary to establish architecture).

**Decided going in:** target repo is pttunLibrary. dashboard_pttun's repo
will be retired (not deleted) once the merge is verified working — that's
a manual step for the user at the end, not part of this spec's execution.

## Goal

Bring dashboard_pttun's admin functionality into pttunLibrary as one
unified app — single Express backend, single Vue frontend — with the admin
side protected by a new session-based auth system, and without carrying
over the security gaps already fixed on the public side.

## Decisions

### 1. Git history: plain copy, not preserved

dashboard_pttun's files are copied into pttunLibrary as new files in a
fresh commit (or small set of commits). No `git subtree`/`filter-repo`.
dashboard_pttun's own repo/history is untouched and remains available if
anyone needs to look up old attribution — it's just not carried into
pttunLibrary's history.

### 2. One Express backend, not two

Both backends currently run separately (pttunLibrary on port 5000,
dashboard_pttun on port 5001, each with its own `database.js`,
`BukuController`, `PeminjamanController`, near-identical). These merge into
pttunLibrary's existing `/backend`, running on port 5000 only.
dashboard_pttun's backend is retired as a running process — its route/
controller/model logic is merged in, not kept as a second server.

Routes split by prefix so public and admin surfaces are unambiguous:

| Prefix | Access | Contents |
|---|---|---|
| `/api/buku` | public, read-only | existing pttunLibrary `BukuController` reads (list, search, category, detail, rekomendasi) |
| `/api/peminjaman` | public, `POST` only (+ existing auto-reconcile middleware) | existing pttunLibrary borrow-form flow, unchanged |
| `/api/auth` | public | `POST /login`, `POST /logout`, `GET /me` |
| `/api/admin/buku` | **requires auth** | dashboard's create/update/delete + dashboard stats |
| `/api/admin/category` | **requires auth** | dashboard's CategoryController, moved as-is (+ error-leak fix) |
| `/api/admin/rak` | **requires auth** | dashboard's RakController, moved as-is (+ error-leak fix) |
| `/api/admin/upload` | **requires auth** | dashboard's Cloudinary cover upload (+ error-leak fix) |
| `/api/admin/peminjaman` | **requires auth** | dashboard's admin edit/delete for loans, merged into pttunLibrary's `PeminjamanModel` (see Decision 6) |

This split matters because dashboard_pttun's current `bukuRoutes.js` mounts
public `GET` and destructive `POST`/`PUT`/`DELETE` on the *same* router at
the *same* base path as pttunLibrary's public-only `bukuRoutes.js` — naively
merging the two files would make book deletion reachable from what looks
like the public read path. Keeping `/api/admin/*` as a distinct,
auth-gated prefix avoids that.

### 3. Auth: session-based, single role

`express-session`, httpOnly cookie (no JWT — avoids storing a token
client-side and makes logout trivial: destroy the session). One role only
(`admin`/petugas) for this first version — no per-permission granularity.

New `pengguna` table (today `PenggunaModel.js` is just
`{ tableName: 'pengguna' }`, no columns, no data):

| Kolom | Tipe |
|---|---|
| `id_pengguna` | int, PK, auto_increment |
| `username` | varchar, unique |
| `password_hash` | varchar (bcrypt) |
| `created_at` | timestamp, default now |

`POST /api/auth/login` — verify `username` + `password` (bcrypt compare)
against `pengguna`, on success create a session (`req.session.userId`),
return `{ message, data: { username } }`. Wrong credentials → `401` with a
generic message (no "user not found" vs "wrong password" distinction, to
avoid username enumeration).

`POST /api/auth/logout` — destroy session.

`GET /api/auth/me` — `200` with current user if session valid, `401`
otherwise. Used by the frontend router guard.

`requireAuth` middleware — checks `req.session.userId`, `401` if absent.
Applied to every `/api/admin/*` router.

**Account provisioning**: `backend/scripts/seedAdmin.js`, a one-off Node
script (`node scripts/seedAdmin.js <username> <password>` or reading from
`.env`) that bcrypt-hashes the password and inserts into `pengguna`. Run
manually once by the user after this is implemented. No public
registration endpoint exists anywhere in the app.

### 4. Frontend: wire in the existing admin scaffolding, add a route guard

pttunLibrary's router already has `admin/*.vue` files sitting unused.
Wiring plan:
- Admin routes (`/admin`, `/admin/buku`, `/admin/category`, `/admin/rak`,
  `/admin/peminjaman`, etc.) nest under `AdminLayout.vue`, added to
  `frontend/src/router/index.js` alongside the existing `GuestLayout`
  branch — the public catalog routes are untouched.
- `/login` route (already exists, currently unused) is wired to actually
  call `POST /api/auth/login`.
- A `router.beforeEach` guard calls `GET /api/auth/me` (or checks a Pinia
  auth store populated at app start) before entering any `/admin/*` route;
  redirects to `/login` if unauthenticated.
- dashboard_pttun's own views (`DashboardView`, `BooksView`/
  `CategoriesView`/`ShelvesView`, `LoanMonitoringView`, `CoverScanner.vue`,
  etc.) are copied into `frontend/src/views/admin/` and
  `frontend/src/components/`, replacing/filling in the orphaned stub files
  where names overlap.

### 5. Cover scanner: migrated as-is

`CoverScanner.vue` + `opencvLoader.js`/`opencvModule.js`/
`documentDetector.js` and their dependencies (`@techstark/opencv-js`,
`jscanify`, `browser-image-compression`) move over unchanged. The `canvas`
native module is **not** copied from dashboard_pttun's `node_modules`
(platform-specific prebuilt binary) — it gets reinstalled via `npm install`
in pttunLibrary so it links correctly against this environment.

### 6. `PeminjamanModel` merge, not duplication

pttunLibrary's model has `buatPeminjaman` (public borrow),
`reconcileOverdueLoans` (auto-return, run as middleware on every request),
`getSemuaPeminjaman`, `updateStatusPeminjaman`. dashboard's model has its
own `getSemuaPeminjaman`, `updatePeminjaman` (full admin edit — name/phone/
duration), `deletePeminjaman`, and its own overdue-handling function
`prosesJatuhTempo`.

Merge outcome:
- Keep pttunLibrary's `reconcileOverdueLoans` as the only overdue-handling
  logic (already correct, already running). **Drop dashboard's
  `prosesJatuhTempo` entirely** — do not run both.
- Add dashboard's `updatePeminjaman` and `deletePeminjaman` into
  pttunLibrary's `PeminjamanModel.js` (these are genuinely new
  capabilities pttunLibrary lacks), fixing the column bug below in the
  process.
- `getSemuaPeminjaman` stays pttunLibrary's version (already computes
  effective overdue status without writing to the DB).

### 7. Known bugs fixed during migration, not after

- **Correction (2026-08-18, verified against the live schema):** this
  section originally had the column-name bug backwards. The real column is
  `detail_buku.total_buku` — dashboard_pttun's code was right.
  pttunLibrary's own `PeminjamanModel.updateStatusPeminjaman` referenced
  the nonexistent `jumlah_eksemplar` (also wrongly documented in
  `CLAUDE.md`, not yet corrected there) and was actively broken in
  production: every manual "mark as returned" that needed to restore stock
  threw `ER_BAD_FIELD_ERROR`. Fixed directly on `main` outside this plan
  (commit `4ac907e`), verified live via a real borrow/return cycle. That
  same fix also capped `reconcileOverdueLoans`'s stock increment with
  `LEAST(stok_tersedia + 1, total_buku)` — it had no upper bound at all,
  unlike dashboard's (now-dropped) `prosesJatuhTempo`, which did cap
  correctly. Use `total_buku` as the canonical column name in all Plan 2
  code — not `jumlah_eksemplar`.
- **Error leakage**: every dashboard controller (`Buku`, `Peminjaman`,
  `Upload`, `Category`, `Rak`) currently does
  `res.status(500).json({ message, error: error.message })`, leaking raw
  DB errors to the client — the exact issue already fixed in pttunLibrary
  this internship. Apply the same fix (generic message only) to all ported
  controllers.
- **Missing rate limiting**: dashboard_pttun's `index.js` wires no rate
  limiter at all. The new `/api/admin/*` write routes get pttunLibrary's
  existing `writeLimiter` (or a separate, higher-threshold instance, since
  these are authenticated staff, not anonymous public traffic) applied.

### 8. Docs

Update `CLAUDE.md`:
- Real `peminjaman` column names (`nama_peminjam`, `no_telpon`,
  `durasi_hari` — not the currently-documented `nama`, `nomor_telpon`,
  `durasi_peminjaman`).
- New `pengguna` table schema.
- Single-backend architecture (drop any implication of two servers).
- Stale book count (191 → 878, per prior session finding).

## Out of scope

- Actually retiring/archiving the dashboard_pttun GitHub repo — reminder
  only, done by the user after the merged app is verified.
- Multi-role/permission-granular auth (single `admin` role for this pass).
- Self-service registration or password reset flows.
- Any test run against the real/production database without the user's
  explicit go-ahead first (prior incident: a smoke test wrote test data
  into the live DB in an earlier session).
- Changing pttunLibrary's public-side no-login design — unaffected by this
  merge.

## Testing / verification

No automated test framework in either backend (consistent with prior
specs in this repo). Manual verification via curl/browser against a dev
server, but **only after explicit confirmation from the user** before
starting any server connected to the real database, per the standing
constraint above. Checklist once approved to run:
- `POST /api/auth/login` with seeded credentials → session cookie set,
  `GET /api/auth/me` then returns the user.
- Any `/api/admin/*` route called without a session → `401`.
- Book create/update/delete via `/api/admin/buku` works end-to-end
  (including Cloudinary upload) while logged in.
- Public `/api/buku` and `/api/peminjaman` behavior is unchanged from
  before the merge (regression check).
- An overdue loan is reconciled exactly once (no double stock-credit)
  confirming dashboard's redundant `prosesJatuhTempo` was fully removed,
  not just unused.
- 500 responses from any ported admin controller no longer include raw
  `error.message`.
