# Formulir Peminjaman Buku — Design Spec

Date: 2026-08-03

## Context

Backend peminjaman is already merged to `main` (3 endpoints: `POST
/api/peminjaman`, `GET /api/peminjaman`, `PATCH /api/peminjaman/:id/status`
— see `backend/controllers/PeminjamanController.js`,
`backend/models/PeminjamanModel.js`, `backend/routes/peminjamanRoutes.js`).
This session is frontend-only: build the "Formulir Peminjaman Buku" page
from the provided mockup and wire it to `POST /api/peminjaman`.

Mockup: breadcrumb "Katalog Buku / Informasi Buku / Peminjaman Buku", left
panel "Informasi Buku" (cover, judul, penulis, badge kategori, badge
status), right panel "Data Peminjam" (Nama Lengkap, Nomor Kontak, and a
third field that in the mockup is mislabeled "Nomor Kontak" again but is
actually a duration `<select>` with a calendar icon and placeholder "Pilih
Durasi Peminjaman" — a copy-paste typo to fix as "Durasi Peminjaman"), a
small warning line about the 7-day max, an info box about staff contacting
the borrower, and "Kembali"/"Ajukan Peminjaman" buttons.

Confirmed (from the backend session): `POST /api/peminjaman` request body
is `{ id_detail, nama_peminjam, no_telpon, durasi_hari }`, where
`id_detail` is the same value as `buku.id_buku` (no separate `detail_buku`
primary key exists). Success response:
`{ message, data: { id_peminjaman, id_detail, nama_peminjam, no_telpon,
tanggal_pinjam, durasi_hari, due_date, status: "dipinjam", judul_buku } }`.
Error responses are always `{ message }` (no `error` key) for `400`/`404`:
missing required field, `durasi_hari` outside 1–7, book not found, or
`stok_tersedia = 0` ("Buku sedang tidak tersedia").

Existing relevant code:
- `frontend/src/services/loanService.js` — only has `getPeminjaman()`.
- `frontend/src/services/api.js` — `apiRequest` throws a generic
  `Error('Permintaan ke server gagal')` for any non-OK response, never
  reading the response body. This loses the backend's specific `message`
  (e.g. "Buku sedang tidak tersedia"), which this form needs to show.
- `frontend/src/views/BookDetail.vue:85-86` — static "Pinjam Buku" button,
  no `@click`, no navigation.
- `frontend/src/router/index.js` — nested routes under `GuestLayout`,
  pattern `{ path: 'buku/:id', name: 'book-detail', component: ... }`
  already exists for the detail page.
- `frontend/src/services/bookService.js` — `getBukuById(id)` already
  returns the fully-joined book (fixed in the recommendation-endpoint
  session): `judul_buku, nama_category, pengarang, penerbit, tahun_terbit,
  nama_rak, nama_section, image_url, status_buku`.

## Goal

A new page at `buku/:id/pinjam` that shows the book being borrowed (left)
and a borrowing form (right), submits to `POST /api/peminjaman`, and shows
a clear success or error result — reachable by clicking "Pinjam Buku" on
the book detail page.

## Decisions

### 1. Fix `apiRequest` to surface the backend's error message

```js
export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Permintaan ke server gagal';
    try {
      const body = await response.json();
      if (body && body.message) {
        message = body.message;
      }
    } catch {
      // Response bukan JSON valid (mis. halaman error HTML) — pakai pesan default.
    }
    throw new Error(message);
  }

  return response.json();
};
```

Checked against every existing caller: `CatalogView.vue` and
`HomeView.vue` both already do `error.message || '<pesan fallback
sendiri>'` in their `catch` blocks — they get a more specific message when
the backend provides one, and still fall back to their own text when it
doesn't (network failure, non-JSON body). No caller does an exact string
match on the old generic message. `BookDetail.vue` only logs
`bukuResult.reason`/`rekoResult.reason` via `console.error` (not shown to
the user), so it's unaffected. No existing behavior changes.

### 2. New route: `buku/:id/pinjam`

In `frontend/src/router/index.js`, added as a sibling of the existing
`book-detail` route under `GuestLayout`:

```js
{
  path: 'buku/:id/pinjam',
  name: 'peminjaman-form',
  component: () => import('../views/PeminjamanFormView.vue'),
}
```

`:id` is the book's `id_buku` — reused directly as `id_detail` in the
submit payload (per the backend session's finding that `id_detail` stores
the same value as `id_buku`).

### 3. New view: `frontend/src/views/PeminjamanFormView.vue`

Follows the `XView.vue` naming convention already used by `HomeView`,
`CatalogView`, `AboutView`, `LoginView` (the one exception, `BookDetail.vue`,
is not the majority pattern).

**Book info (left panel):** fetched via `getBukuById(id)` (already
fully-joined — no client-side filtering over the full book list). Same
`loading` / not-found handling pattern as `BookDetail.vue` (a `loading`
ref, a `buku` ref that's `null` until loaded, a not-found state if the
fetch fails or returns nothing). Displays `image_url` (fallback
`defaultCover`, same asset `BookDetail.vue` uses), `judul_buku`,
`pengarang`, `nama_category` badge, `status_buku` badge.

**Form (right panel), 3-state component: form / submitting / result:**

- `nama_peminjam`, `no_telpon`: text inputs, bound via `v-model`, HTML
  `required`, plus a pre-submit check (both trimmed non-empty) — this
  mirrors the backend's own presence check, it doesn't add new rules
  beyond what the backend already enforces, purely so the user isn't sent
  to the network for an obviously-empty field.
- `durasi_hari`: `<select>`, label **"Durasi Peminjaman"** (fixing the
  mockup's mislabeled duplicate "Nomor Kontak"), calendar icon kept from
  the mockup. Options are exactly `1` through `7` (`"1 hari"` ...
  `"7 hari"`) — no option outside the backend's accepted range exists, so
  an out-of-range `durasi_hari` cannot be submitted from this form.
  Starts unselected (`v-model` initialized to `''`), with a disabled
  placeholder option `"Pilih Durasi Peminjaman"`, matching the mockup;
  required before submit.
- Warning line ("*Masa peminjaman maksimal 7 hari...") and the staff-contact
  info box are static text from the mockup, unchanged.
- On submit: guard against empty required fields client-side (see above),
  then call `ajukanPeminjaman({ id_detail: idBuku, nama_peminjam,
  no_telpon, durasi_hari: Number(durasiHari) })` (new function, `loanService.js`
  — see below). A `submitting` ref disables the "Ajukan Peminjaman" button
  and swaps its label to show a spinner while the request is in flight
  (matches the `spinner-border text-navy` pattern already used in
  `BookDetail.vue`'s loading state).
- On failure: an inline `alert alert-danger` above the submit button, text
  from the thrown `error.message` (now the backend's actual message, e.g.
  "Buku sedang tidak tersedia", thanks to the `apiRequest` fix) — falls
  back to a generic message only if `error.message` is somehow empty. The
  form stays editable; the user can fix input and retry.
- On success: the right panel's content is replaced by a confirmation
  state (own `berhasil` ref holding the response `data`) — book title,
  due date (`data.due_date`), a short "Peminjaman berhasil diajukan"
  message, and a button "Kembali ke Detail Buku" that navigates to
  `book-detail`. No new route, no auto-redirect timer (kept simple, and an
  unannounced auto-redirect is disorienting) — same "swap the whole panel
  based on a ref" pattern `BookDetail.vue` already uses for its
  loading/not-found/content states.

**Breadcrumb:** "Katalog Buku" (link `/katalog`) / "Informasi Buku" (link
to `book-detail` for this `id`) / "Peminjaman Buku" (active, current page)
— literal mockup text, `Informasi Buku` is a fixed label here (not the
book's title, unlike `BookDetail.vue`'s own breadcrumb which does show the
title).

**"Kembali" button:** `router.push({ name: 'book-detail', params: { id } })`
— explicit target, not `router.back()` (predictable regardless of how the
user arrived at this page).

Styling reuses `BookDetail.vue`'s existing scoped classes where the visual
matches (`.text-navy`, `.bg-navy`, `.btn-navy-action`, `.font-display`,
`.dot-status`) rather than reinventing them, plus new form-specific classes
as needed (inputs, select, warning text, info box) styled to match the
mockup — navy/gold palette already established by the rest of the site
(`--navy`, `--gold` in `frontend/src/assets/styles/main.css`).

### 4. `loanService.js`

```js
export const ajukanPeminjaman = (payload) =>
  apiRequest('/peminjaman', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
```

### 5. `BookDetail.vue:85-86` — wire "Pinjam Buku"

```html
<button class="btn btn-navy-action px-4 py-2 rounded-pill shadow-sm"
  @click="router.push({ name: 'peminjaman-form', params: { id: buku.id_buku } })">
  Pinjam Buku
</button>
```

`router` is already imported/available in this file (`useRouter()`, used
by `goToDetail`). The button is **not** disabled when `status_buku !==
'Tersedia'` — out of scope for "wire the button" (see below); the
destination form still handles that case correctly because the backend
already rejects with a clear `400` message and the `apiRequest` fix (§1)
surfaces it.

## Out of scope

- Disabling/greying out "Pinjam Buku" when the book is unavailable — the
  task was to wire navigation, not add availability gating. If clicked for
  an unavailable book, the form loads normally (it doesn't re-derive
  availability client-side) and the backend's `400 "Buku sedang tidak
  tersedia"` surfaces via the error alert on submit.
- `GET /api/peminjaman` (staff list view) and `PATCH /:id/status` (status
  update) — no UI for either in this session.
- Any backend change — `backend/` is untouched.
- Auto-redirect after successful submission.
- Phone-number format validation beyond non-empty (backend doesn't
  validate format either, so the frontend doesn't invent a stricter rule).

## Testing / verification

No automated test framework (frontend or backend). Manual verification via
browser preview:

- Navigate to a book with `status_buku = 'Tersedia'`, click "Pinjam Buku"
  → lands on `buku/:id/pinjam`, left panel shows correct book info.
- Submit with empty `nama_peminjam` / `no_telpon` → blocked client-side,
  no network request fires.
- Submit without selecting a duration → blocked client-side (required
  `<select>`).
- Submit valid form for an available book → success state shows, `due_date`
  displayed matches `tanggal_pinjam + durasi_hari` days; confirm via
  `GET /api/buku/:id` that `stok_tersedia`/`status_buku` reflect the
  decrement (cross-check against the backend session's stock logic).
- Submit for a book whose stock is `0` (or drive it to 0 via repeated
  successful submits in a test book) → inline error shows "Buku sedang
  tidak tersedia" (the real backend message, not the old generic one).
- "Kembali" button → navigates to that book's `book-detail` page.
- Breadcrumb links work (Katalog Buku → `/katalog`, Informasi Buku →
  `book-detail`).
- Existing `CatalogView.vue`/`HomeView.vue` error paths still work after
  the `apiRequest` change (regression check — e.g. temporarily point
  `VITE_API_BASE_URL` at a dead port and confirm their existing fallback
  error messages still render, not a crash).

## Files touched

- `frontend/src/services/api.js` — `apiRequest` reads the error body.
- `frontend/src/services/loanService.js` — add `ajukanPeminjaman`.
- `frontend/src/views/PeminjamanFormView.vue` — new file.
- `frontend/src/router/index.js` — add `peminjaman-form` route.
- `frontend/src/views/BookDetail.vue` — wire the "Pinjam Buku" button
  (lines 85-86 only).
