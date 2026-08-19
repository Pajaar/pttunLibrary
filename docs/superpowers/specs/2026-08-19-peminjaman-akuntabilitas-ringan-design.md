# Peminjaman: Lightweight Accountability Improvements — Design Spec

Date: 2026-08-19

## Context

This spec follows a brainstorming session that started from a broader
question: is Google/Gmail login feasible for the public borrowing
(`peminjaman`) flow, both as a borrower-identity mechanism and as a way to
enable email notifications (borrow confirmation, due-date reminders)?

Two things ruled that out for now:

1. **Operational context.** The `peminjaman` form is filled in
   self-service, by the general public, completely unsupervised (confirmed
   with the user — not staff-assisted, not a bounded/internal-only
   audience). The system has no physical enforcement of borrowing at all
   (no gate, no scan) — it is honor-based already. Adding a login
   requirement (even lightweight) risks pushing people to skip the app
   entirely and take a book with zero record, which is strictly worse than
   today's unverified-but-present record.
2. **OAuth setup cost.** The user judged Google OAuth setup (Cloud
   project, consent screen, client credentials, callback URL) as more
   complexity than they want to take on right now.

Decision: **no login of any kind for borrowers in this pass.** Instead,
this spec addresses the two underlying problems the user actually named —
"no way to verify a borrower's identity" (motivated by fear of books not
being returned) and "no way for a borrower to see their own loan status"
— with three small, login-free changes. All three are scoped to avoid the
admin dashboard (`dashboard_pttun` merge) entirely, per explicit
instruction not to touch it in this session.

### Current behavior (confirmed by reading the code)

- `POST /api/peminjaman` (`backend/controllers/PeminjamanController.js`,
  `backend/models/PeminjamanModel.js`) inserts a loan with
  `status = 'dipinjam'` immediately on submit and decrements
  `detail_buku.stok_tersedia` — no approval gate (by earlier design, see
  `docs/superpowers/specs/2026-08-03-peminjaman-backend-design.md`).
- `PeminjamanModel.reconcileOverdueLoans` runs as middleware on **every**
  request (`backend/routes/index.js:13-20`). Today it does:
  ```sql
  UPDATE peminjaman p
  JOIN detail_buku d ON d.id_buku = p.id_detail
  SET p.status = 'dikembalikan',
      d.stok_tersedia = LEAST(d.stok_tersedia + 1, d.total_buku)
  WHERE p.status != 'dikembalikan' AND p.due_date < ?
  ```
  i.e. once `due_date` passes, the loan is silently marked
  `'dikembalikan'` (returned) and stock is restored — regardless of
  whether the book was physically returned. This was intentional at the
  time of the `dashboard_pttun` merge (`docs/superpowers/specs/2026-08-18-dashboard-merge-design.md`,
  §6) but is not what "dikembalikan" should mean: it conflates "grace
  period expired" with "staff confirmed the book is back."
- `PeminjamanModel.getSemuaPeminjaman` (staff list, used by the admin
  dashboard) additionally computes an **effective status** per row at
  read time (`due_date < today && status === 'dipinjam'` → report as
  `'terlambat'`) without writing it to the DB — a second, overlapping
  notion of "is this loan overdue" left over from the original (Aug 3)
  design, from before `reconcileOverdueLoans` existed.
- The public form (`PeminjamanFormView.vue`) collects `nama_peminjam` /
  `no_telpon`, both freely typed, never validated for authenticity. There
  is no way, after submitting, for the borrower to check their loan's
  status again.

## Goal

Three independent, small changes:

1. Fix `reconcileOverdueLoans` so an expired due date is never conflated
   with an actual physical return.
2. Add a lightweight commitment step to the borrow form to address the
   "feels too informal" concern, without adding friction that blocks
   submission or requires new infrastructure.
3. Let a borrower check their own loan status/history without an account,
   by re-entering the same name + phone number they originally submitted.

None of these touch `dashboard_pttun`-merged admin code, add a scheduler,
or require external services (SMS/email/OAuth).

## Decisions

### 1. `reconcileOverdueLoans`: overdue → `'terlambat'`, not `'dikembalikan'`

Change the query to:

```sql
UPDATE peminjaman
SET status = 'terlambat'
WHERE status = 'dipinjam' AND due_date < ?
```

- Stock (`detail_buku.stok_tersedia`) is **not** touched — matches the
  original rule that only a transition *to* `'dikembalikan'` restores
  stock (`docs/superpowers/specs/2026-08-03-peminjaman-backend-design.md`,
  decision #2). The book is still considered out until a human confirms
  otherwise.
- Idempotent by construction: once a row is `'terlambat'`, the `WHERE
  status = 'dipinjam'` clause no longer matches it, so re-running the
  middleware on subsequent requests is a no-op for that row.
- `status = 'dikembalikan'` now only happens via the existing manual path
  — staff calling `PATCH /api/peminjaman/:id/status` (admin dashboard,
  unchanged) after physically confirming the book is back.
- `getSemuaPeminjaman`'s per-row "effective status" computation
  (`backend/models/PeminjamanModel.js:88-94`) becomes redundant — by the
  time any request handler runs, the just-executed middleware has already
  persisted `'terlambat'` for any newly-overdue row. Remove that
  computation; `getSemuaPeminjaman` returns the stored `status` directly.
  This removes a second, now-stale source of truth rather than leaving
  two overlapping mechanisms.
- Update the Indonesian comments at `backend/models/PeminjamanModel.js:57-58`
  and `backend/routes/index.js:11-12` (both currently describe the old
  "auto-mark dikembalikan" behavior) to describe the new
  auto-mark-terlambat-only behavior.

**Known caveat, explicitly out of scope:** loans already incorrectly
auto-marked `'dikembalikan'` by the old logic are not retroactively
corrected — there is no reliable way to tell, after the fact, which of
those were actually returned and which weren't. This is a one-time data
quality gap the user/staff may want to spot-check manually; no automated
migration is proposed here.

### 2. Commitment checkbox on the borrow form (no persistence)

`PeminjamanFormView.vue` gets one new required checkbox, placed just above
the submit button:

> "Saya menyatakan data ini benar dan bertanggung jawab mengembalikan buku
> tepat waktu."

- Client-side: bound to a new ref (e.g. `pernyataanDisetujui`), included
  in the existing pre-submit validation (alongside the current
  nama/telpon/durasi check) — unchecked blocks submission with the same
  inline error style already used (`pesanError`).
- Server-side: `POST /api/peminjaman` gains one more required field in the
  body (e.g. `konfirmasi_tanggung_jawab: true`), validated the same way
  `nama_peminjam`/`no_telpon` already are in
  `PeminjamanController.buatPeminjaman` — `400` with a clear message if
  missing/falsy. This exists only so the check can't be trivially bypassed
  by calling the API directly; it is not itself an identity check.
- **Not persisted to the `peminjaman` table.** This is a submission gate
  and a commitment device, not an audit record — there's no described
  need to later query "did this borrower check the box," so no new column
  is added. If an audit trail is ever needed, that's a separate,
  deliberate decision, not a side effect of this change.
- This does not verify identity (a dishonest borrower can still check the
  box and lie) — it only raises the perceived seriousness of submitting,
  which was the user's second named concern ("terasa kurang serius").

### 3. Public, login-free loan lookup: `GET /api/peminjaman/cek`

A borrower re-enters the same `nama_peminjam` + `no_telpon` they used when
borrowing, and sees their matching loan(s).

**Backend:**

- New model function `PeminjamanModel.cekPeminjaman({ nama_peminjam,
  no_telpon })`:
  ```sql
  SELECT p.*, b.judul_buku
  FROM peminjaman p
  JOIN detail_buku d ON d.id_buku = p.id_detail
  JOIN buku b ON b.id_buku = d.id_buku
  WHERE LOWER(TRIM(p.nama_peminjam)) = LOWER(?)
    AND TRIM(p.no_telpon) = ?
  ORDER BY p.tanggal_pinjam DESC
  ```
  Name comparison is case-insensitive (capitalization drift is common and
  costs nothing to tolerate); phone comparison is an exact trimmed match —
  consistent with the fact that phone format is not normalized or
  validated anywhere else in this codebase today (confirmed in the Aug 3
  form spec's "out of scope" section). No new normalization logic is
  introduced here (YAGNI) — if a borrower types their phone number
  differently than they originally did, the lookup legitimately won't
  match, which is an accepted, documented limitation, not a bug to solve
  now.
- New controller handler `PeminjamanController.cekPeminjaman`: validates
  both query params are present and non-empty after trim (`400` mirroring
  `buatPeminjaman`'s style), calls the model function, returns `{
  message, data: [...] }` — **`200` with an empty array when nothing
  matches**, not `404`. "No loans found for this name/phone" is a normal,
  expected outcome (e.g. a first-time visitor checking before ever
  borrowing), not an error.
- New route: `GET /peminjaman/cek` in `backend/routes/peminjamanRoutes.js`,
  reusing the existing `writeLimiter` middleware. `writeLimiter` is
  currently named for its write use, but its actual justification — "no
  auth in front of this route, so it needs a per-IP cap" — applies
  identically here; this is a public, unauthenticated, potentially
  enumerable-by-guessing endpoint (someone could probe name/phone
  combinations), so it needs the same protection, not a new middleware.
- Response fields per matched loan: `judul_buku`, `tanggal_pinjam`,
  `durasi_hari`, `due_date`, `status` (raw stored value — already
  accurate at read time per decision #1, no separate effective-status
  computation needed here either).

**Frontend:**

- New view `frontend/src/views/CekPeminjamanView.vue`: a small form (nama,
  no. telpon — same inputs/styling as `PeminjamanFormView.vue`'s data
  fields) plus a results area listing matched loans (title, borrow date,
  due date, status badge) or an empty-state message ("Tidak ditemukan
  peminjaman dengan data tersebut").
- New route in `frontend/src/router/index.js`, sibling of the existing
  `katalog`/`buku/:id` routes under `GuestLayout`:
  ```js
  {
    path: 'cek-peminjaman',
    name: 'cek-peminjaman',
    component: () => import('../views/CekPeminjamanView.vue'),
  }
  ```
- New nav entry in `frontend/src/layouts/GuestLayout.vue`'s `navItems`
  array (`{ label: 'Cek Peminjaman', to: '/cek-peminjaman' }`) — this is
  the discoverability fix for non-tech-savvy users flagged during
  brainstorming: a persistent, always-visible menu link, not a URL they
  need to type or remember.
- `PeminjamanFormView.vue`'s success state (`berhasil` block) gets one
  more line/button linking to `cek-peminjaman`, so a borrower who just
  submitted is pointed at it immediately while it's relevant.
- New `loanService.js` function:
  ```js
  export const cekStatusPeminjaman = ({ nama_peminjam, no_telpon }) =>
    apiRequest(
      `/peminjaman/cek?nama_peminjam=${encodeURIComponent(nama_peminjam)}&no_telpon=${encodeURIComponent(no_telpon)}`,
    );
  ```

**Privacy note (explicitly named, not silently accepted):** this lookup
is secured only by knowledge of a name + phone number, not a password or
token. For a low-stakes internal library (book titles and due dates, not
financial or health data), this is a proportionate trade-off given the
no-login constraint — but it is a real, if minor, privacy weakness (two
people who both know a third party's name and phone number could look up
that person's loans). Worth being aware of; not blocking for this use
case.

## Files touched

- `backend/models/PeminjamanModel.js` — fix `reconcileOverdueLoans`,
  simplify `getSemuaPeminjaman`, add `cekPeminjaman`.
- `backend/controllers/PeminjamanController.js` — add
  `konfirmasi_tanggung_jawab` validation to `buatPeminjaman`, add
  `cekPeminjaman` handler.
- `backend/routes/peminjamanRoutes.js` — add `GET /cek`.
- `backend/routes/index.js` — update the now-stale comment above the
  `reconcileOverdueLoans` middleware call.
- `frontend/src/views/PeminjamanFormView.vue` — add commitment checkbox +
  validation; add a link to `cek-peminjaman` in the success state.
- `frontend/src/views/CekPeminjamanView.vue` — new file.
- `frontend/src/router/index.js` — add `cek-peminjaman` route.
- `frontend/src/layouts/GuestLayout.vue` — add nav entry.
- `frontend/src/services/loanService.js` — add `cekStatusPeminjaman`.

## Out of scope

- Any Google/Gmail login, OAuth setup, or borrower account system —
  explicitly rejected this session (see Context).
- Email or SMS notifications (borrow confirmation, due-date reminders) —
  these were the second original brainstorming question; without any
  verified contact channel (no login), there's no reliable
  destination to send them to, so this doesn't stand alone as a lightweight
  change. Revisit only if/when an identity mechanism exists.
- Admin dashboard (`dashboard_pttun`-merged code, `/admin/*` routes,
  `adminPeminjamanRoutes.js`) — untouched, per explicit instruction.
- Retroactively correcting `peminjaman` rows already mis-marked
  `'dikembalikan'` by the old `reconcileOverdueLoans` logic.
- Phone number format normalization/validation for the new lookup query.
- Rate-limiting redesign — reusing `writeLimiter` as-is, not renaming or
  splitting it.

## Testing / verification

No automated test framework in this codebase (unchanged from prior
specs). Manual verification via the running dev server:

- Let a loan's `due_date` pass (or set one in the past directly in the
  DB for a test row) → next request of any kind flips it to `'terlambat'`
  in the DB, `stok_tersedia` unchanged. Confirm via `GET /api/peminjaman`
  and a direct check of `detail_buku.stok_tersedia`.
- Call the reconcile path twice in a row (e.g. two consecutive requests)
  → status stays `'terlambat'`, no error, no double-processing.
- Staff manually marks that loan `'dikembalikan'` via the existing admin
  `PATCH /:id/status` → stock increments by 1, exactly as before.
- Submit the borrow form with the commitment checkbox unchecked → blocked
  client-side, no network request.
- `POST /api/peminjaman` directly (e.g. via curl) without
  `konfirmasi_tanggung_jawab` → `400`.
- Submit a valid loan, then go to "Cek Peminjaman" and enter the exact
  same nama/no_telpon → the loan appears with correct status/due date.
- Same lookup with a slightly different name capitalization → still
  matches (case-insensitive). Different phone formatting (e.g. added
  spaces) → does not match (documented limitation).
- Lookup with a name/phone that never borrowed anything → `200`, empty
  result, friendly empty-state message, not an error page.
- Nav link "Cek Peminjaman" is visible and reachable from every public
  page without needing to know the URL.
