# Formulir Peminjaman Buku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "Formulir Peminjaman Buku" page (book info + borrowing form), wire it to the already-live `POST /api/peminjaman`, and connect `BookDetail.vue`'s "Pinjam Buku" button to it — fixing `apiRequest` along the way so the form can show the backend's actual error messages (e.g. "Buku sedang tidak tersedia") instead of a generic one.

**Architecture:** One new view (`PeminjamanFormView.vue`) with three visual states (loading book info / form / success) driven by refs, reusing `getBukuById` (already fully-joined) for the left panel and a new `ajukanPeminjaman` service function for the submit. A new route `buku/:id/pinjam` mirrors the existing `buku/:id` route. `apiRequest` is fixed first since the form depends on it to show meaningful errors.

**Tech Stack:** Vue 3 `<script setup>`, vue-router, Bootstrap 5 + Bootstrap Icons (already in the project), no test framework (manual browser verification, same as the rest of this codebase).

## Global Constraints

- Field names in the request body match the backend exactly:
  `id_detail, nama_peminjam, no_telpon, durasi_hari` — not translated or
  renamed.
- No login/auth — do not add any.
- `id_detail` sent to the backend is the book's `id_buku` (confirmed in the
  backend session: `detail_buku` has no separate primary key).
- Backend error responses are always `{ message }` (no `error` key) for
  `400`/`404` — see `backend/controllers/PeminjamanController.js`.
- `durasi_hari` accepted range is exactly 1–7 (backend rejects anything
  else with `400`) — the form's `<select>` must only ever offer 1–7.
- Full design rationale: `docs/superpowers/specs/2026-08-03-peminjaman-form-design.md`.

---

## Task 1: Fix `apiRequest` to surface the backend's error message

**Files:**
- Modify: `frontend/src/services/api.js` (whole file, 17 lines)

**Interfaces:**
- Consumes: nothing new.
- Produces: `apiRequest(path, options)` now rejects with `Error(message)`
  where `message` is the backend's JSON `message` field when the response
  body parses as JSON and has one, otherwise the original generic
  `'Permintaan ke server gagal'`. Success-path behavor (return value on
  `response.ok`) is unchanged. This is what `PeminjamanFormView.vue` (Task
  2) relies on to show real error text.

- [ ] **Step 1: Replace the file**

Current content of `frontend/src/services/api.js`:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error('Permintaan ke server gagal');
  }

  return response.json();
};
```

Replace with:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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

- [ ] **Step 2: Start the dev stack**

Use the project's preview tooling to start the `pttunlibrary` launch config
(runs frontend + backend together). Confirm no startup errors.

- [ ] **Step 3: Verify the new error-message behavior in the browser**

With the app open in the browser, run this in the page's JS console (or via
a JS-eval tool against that tab) — Vite serves raw ES modules, so a dynamic
`import()` of the real source file runs the actual updated code:

```js
const mod = await import('/frontend/src/services/api.js');
try {
  await mod.apiRequest('/buku/999999999');
} catch (e) {
  console.log('ERROR MESSAGE:', e.message);
}
```

Expected: logs `ERROR MESSAGE: Buku tidak ditemukan` — the backend's real
404 message (`backend/controllers/BukuController.js`'s `getBukuById`
returns `{ message: 'Buku tidak ditemukan' }` for a missing id). Before
this change, this would have logged the generic
`Permintaan ke server gagal` instead.

- [ ] **Step 4: Regression check — success path unaffected**

Same console, same tab:

```js
const mod = await import('/frontend/src/services/api.js');
const result = await mod.apiRequest('/buku/categories');
console.log('CATEGORIES OK:', Array.isArray(result.data), result.data.length);
```

Expected: `CATEGORIES OK: true <some number > 0>`, no thrown error —
proves the success path (`response.ok` branch, unchanged) still works.

- [ ] **Step 5: Regression check — existing pages still render**

Navigate to `/katalog` in the browser. Expected: book list renders
normally, no console errors — confirms `CatalogView.vue`'s existing
`getBuku()` call (which goes through the same `apiRequest`) is unaffected.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "Surface backend error message in apiRequest"
```

---

## Task 2: Build the peminjaman form page

**Files:**
- Modify: `frontend/src/services/loanService.js` (currently 3 lines)
- Modify: `frontend/src/router/index.js:57-62` (add a route next to
  `book-detail`)
- Create: `frontend/src/views/PeminjamanFormView.vue`

**Interfaces:**
- Consumes: `apiRequest` from Task 1 (via `loanService.js`); `getBukuById(id)`
  from `frontend/src/services/bookService.js` (already exists, returns
  `{ message, data: { id_buku, judul_buku, id_category, nama_category,
  pengarang, penerbit, tahun_terbit, image_url, nama_rak, nama_section,
  status_buku } }`); `defaultCover` from `@/assets/images/Logo_Ma.png`
  (same asset `BookDetail.vue` imports).
- Produces: `ajukanPeminjaman(payload)` in `loanService.js`, consumed by
  `PeminjamanFormView.vue` and (in Task 3) not directly by
  `BookDetail.vue` (that task only navigates to this page's route). Route
  name `'peminjaman-form'` with param `id`, consumed by Task 3's button.

- [ ] **Step 1: Add `ajukanPeminjaman` to `loanService.js`**

Current content of `frontend/src/services/loanService.js`:

```js
import { apiRequest } from './api';

export const getPeminjaman = () => apiRequest('/peminjaman');
```

Replace with:

```js
import { apiRequest } from './api';

export const getPeminjaman = () => apiRequest('/peminjaman');

export const ajukanPeminjaman = (payload) =>
  apiRequest('/peminjaman', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
```

- [ ] **Step 2: Add the route**

In `frontend/src/router/index.js`, the `children` array currently ends
(lines 57-62) with:

```js
        {
          path: 'buku/:id',
          name: 'book-detail',
          component: () => import('../views/BookDetail.vue'),
        }
      ],
```

Replace with:

```js
        {
          path: 'buku/:id',
          name: 'book-detail',
          component: () => import('../views/BookDetail.vue'),
        },
        {
          path: 'buku/:id/pinjam',
          name: 'peminjaman-form',
          component: () => import('../views/PeminjamanFormView.vue'),
        }
      ],
```

(Note the added comma after the `book-detail` route's closing `}`.)

- [ ] **Step 3: Create `PeminjamanFormView.vue`**

Create `frontend/src/views/PeminjamanFormView.vue` with this full content:

```vue
<template>
  <div class="container peminjaman-container my-5">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-navy" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">Memuat data buku...</p>
    </div>

    <!-- Not Found State -->
    <div v-else-if="!buku" class="text-center py-5">
      <h3 class="text-navy">Buku Tidak Ditemukan</h3>
      <p class="text-muted">Data buku tidak tersedia atau telah dihapus.</p>
      <router-link to="/katalog" class="btn btn-navy-action px-4 py-2 mt-2">Kembali ke Katalog
      </router-link>
    </div>

    <!-- Content State -->
    <template v-else>
      <nav aria-label="breadcrumb" class="mb-4">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <router-link to="/katalog" class="text-muted text-decoration-none">Katalog Buku</router-link>
          </li>
          <li class="breadcrumb-item">
            <router-link :to="{ name: 'book-detail', params: { id: buku.id_buku } }"
              class="text-muted text-decoration-none">Informasi Buku</router-link>
          </li>
          <li class="breadcrumb-item active text-navy font-display" aria-current="page">
            Peminjaman Buku
          </li>
        </ol>
      </nav>

      <div class="text-center mb-4">
        <h1 class="peminjaman-title font-display text-navy">Formulir Peminjaman Buku</h1>
        <p class="text-muted">Lengkapi data berikut untuk mengajukan peminjaman buku.</p>
      </div>

      <div class="peminjaman-card">
        <div class="row g-4">
          <!-- Informasi Buku -->
          <div class="col-12 col-md-5">
            <h5 class="section-label font-display text-navy mb-3">Informasi Buku</h5>
            <div class="book-info-cover-wrapper mb-3">
              <img :src="buku.image_url || defaultCover" :alt="buku.judul_buku" class="book-info-cover">
            </div>
            <h5 class="font-display mb-1">{{ buku.judul_buku }}</h5>
            <p class="text-muted small mb-2">{{ buku.pengarang || 'Penulis belum tersedia' }}</p>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="badge bg-navy px-3 py-2">{{ buku.nama_category || 'Tanpa Kategori' }}</span>
              <span class="status-indicator d-flex align-items-center gap-1 fw-semibold"
                :class="buku.status_buku === 'Tersedia' ? 'text-success' : 'text-danger'">
                <span class="dot-status"
                  :class="buku.status_buku === 'Tersedia' ? 'bg-success' : 'bg-danger'"></span>
                {{ buku.status_buku || 'Tersedia' }}
              </span>
            </div>
          </div>

          <!-- Data Peminjam -->
          <div class="col-12 col-md-7">
            <h5 class="section-label font-display text-navy mb-3">Data Peminjam</h5>

            <!-- Sukses -->
            <div v-if="berhasil" class="text-center py-4">
              <i class="bi bi-check-circle-fill text-success display-4 mb-3"></i>
              <h5 class="font-display text-navy">Peminjaman Berhasil Diajukan</h5>
              <p class="text-muted mb-1">{{ berhasil.judul_buku }}</p>
              <p class="text-muted small">Batas pengembalian: <strong>{{ berhasil.due_date }}</strong></p>
              <button class="btn btn-navy-action px-4 py-2 rounded-pill mt-3" @click="kembaliKeDetail">
                Kembali ke Detail Buku
              </button>
            </div>

            <!-- Form -->
            <form v-else @submit.prevent="submitForm">
              <div class="mb-3">
                <label class="form-label" for="nama_peminjam">Nama Lengkap</label>
                <div class="input-icon-wrapper">
                  <i class="bi bi-person"></i>
                  <input id="nama_peminjam" v-model="namaPeminjam" type="text"
                    class="form-control peminjaman-input" placeholder="Masukkan nama lengkap Anda" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label" for="no_telpon">Nomor Kontak</label>
                <div class="input-icon-wrapper">
                  <i class="bi bi-telephone"></i>
                  <input id="no_telpon" v-model="noTelpon" type="text"
                    class="form-control peminjaman-input" placeholder="Contoh: 0821xxxxx" required>
                </div>
              </div>

              <div class="mb-2">
                <label class="form-label" for="durasi_hari">Durasi Peminjaman</label>
                <div class="input-icon-wrapper">
                  <i class="bi bi-calendar-fill"></i>
                  <select id="durasi_hari" v-model="durasiHari" class="form-select peminjaman-input" required>
                    <option value="" disabled>Pilih Durasi Peminjaman</option>
                    <option v-for="hari in 7" :key="hari" :value="hari">{{ hari }} hari</option>
                  </select>
                </div>
              </div>
              <p class="warning-text small mb-3">
                *Masa peminjaman maksimal 7 hari. Pengembalian yang terlambat dapat dikenakan
                ketentuan sesuai kebijakan perpustakaan.
              </p>

              <div class="info-box d-flex align-items-start gap-2 mb-4">
                <i class="bi bi-exclamation-circle mt-1"></i>
                <span>Pastikan data yang Anda masukkan sudah benar. Petugas perpustakaan akan
                  menghubungi Anda melalui nomor kontak yang terdaftar untuk proses peminjaman.</span>
              </div>

              <div v-if="pesanError" class="alert alert-danger py-2">{{ pesanError }}</div>

              <div class="d-flex gap-3">
                <button type="button" class="btn btn-outline-navy px-4 py-2 rounded-pill" @click="kembaliKeDetail">
                  Kembali
                </button>
                <button type="submit" class="btn btn-navy-action px-4 py-2 rounded-pill flex-grow-1"
                  :disabled="submitting">
                  <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ submitting ? 'Mengirim...' : 'Ajukan Peminjaman' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
  import {
    ref,
    onMounted
  } from 'vue'
  import {
    useRoute,
    useRouter
  } from 'vue-router'
  import {
    getBukuById
  } from '../services/bookService'
  import {
    ajukanPeminjaman
  } from '../services/loanService'
  import defaultCover from '@/assets/images/Logo_Ma.png'

  const route = useRoute()
  const router = useRouter()

  const buku = ref(null)
  const loading = ref(true)

  const namaPeminjam = ref('')
  const noTelpon = ref('')
  const durasiHari = ref('')

  const submitting = ref(false)
  const pesanError = ref('')
  const berhasil = ref(null)

  onMounted(async () => {
    loading.value = true
    try {
      const response = await getBukuById(route.params.id)
      buku.value = response.data
    } catch (err) {
      console.error('Gagal memuat data buku:', err)
      buku.value = null
    } finally {
      loading.value = false
    }
  })

  const kembaliKeDetail = () => {
    router.push({
      name: 'book-detail',
      params: {
        id: route.params.id
      }
    })
  }

  const submitForm = async () => {
    pesanError.value = ''

    if (!namaPeminjam.value.trim() || !noTelpon.value.trim() || !durasiHari.value) {
      pesanError.value = 'Nama, nomor kontak, dan durasi peminjaman wajib diisi'
      return
    }

    submitting.value = true
    try {
      const response = await ajukanPeminjaman({
        id_detail: Number(route.params.id),
        nama_peminjam: namaPeminjam.value.trim(),
        no_telpon: noTelpon.value.trim(),
        durasi_hari: Number(durasiHari.value)
      })
      berhasil.value = response.data
    } catch (err) {
      pesanError.value = err.message || 'Peminjaman gagal diajukan'
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
  .text-navy {
    color: #0b1e3f !important;
  }

  .bg-navy {
    background-color: #0b1e3f !important;
    color: #ffffff !important;
  }

  .font-display {
    font-family: 'Playfair Display', serif;
  }

  .peminjaman-title {
    font-weight: 700;
  }

  .peminjaman-card {
    background-color: #ffffff;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
    padding: 2rem;
  }

  .section-label {
    border-bottom: 2px solid #d4ad65;
    padding-bottom: 0.5rem;
    display: inline-block;
  }

  .book-info-cover-wrapper {
    width: 100%;
    max-width: 220px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
  }

  .book-info-cover {
    width: 100%;
    height: 280px;
    object-fit: cover;
    display: block;
  }

  .dot-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }

  .form-label {
    font-weight: 600;
    font-size: 0.9rem;
    color: #1a1a1a;
    margin-bottom: 0.4rem;
  }

  .input-icon-wrapper {
    position: relative;
  }

  .input-icon-wrapper i {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
  }

  .peminjaman-input {
    padding: 0.65rem 1rem 0.65rem 2.6rem;
    border-radius: 30px;
    border: 1px solid #e2e8f0;
  }

  .peminjaman-input:focus {
    border-color: #0b1e3f;
    box-shadow: none;
  }

  .warning-text {
    color: #c1571f;
  }

  .info-box {
    background-color: #f8fafc;
    border-radius: 12px;
    padding: 0.9rem 1rem;
    font-size: 0.85rem;
    color: #475569;
  }

  .btn-navy-action {
    background-color: #0b1e3f;
    color: #ffffff;
    font-weight: 600;
    border: none;
    transition: all 0.3s ease;
  }

  .btn-navy-action:hover {
    background-color: #5f4604;
    color: #ffffff;
  }

  .btn-navy-action:disabled {
    opacity: 0.7;
  }

  .btn-outline-navy {
    border: 1.5px solid #0b1e3f;
    color: #0b1e3f;
    background-color: transparent;
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .btn-outline-navy:hover {
    background-color: #0b1e3f;
    color: #ffffff;
  }
</style>
```

- [ ] **Step 4: Start (or confirm) the dev stack is running**

Use the project's preview tooling for the `pttunlibrary` launch config if
not already running from Task 1.

- [ ] **Step 5: Find a book id to test with**

Run: `curl -s "http://localhost:5000/api/buku" | node -e "const d=JSON.parse(require('fs').readFileSync(0)); const withStock=d.data.filter(b=>b.stok_tersedia>0); console.log(withStock[0].id_buku, withStock[0].judul_buku, withStock[0].stok_tersedia)"`
Note the printed `id_buku` for the next steps.

- [ ] **Step 6: Verify the page renders**

Navigate the browser to `/buku/<id_buku_from_step_5>/pinjam`. Expected:
breadcrumb shows "Katalog Buku / Informasi Buku / Peminjaman Buku", left
panel shows the book's cover/title/author/category badge/status badge,
right panel shows the empty form with label **"Durasi Peminjaman"** (not
"Nomor Kontak") on the third field, duration `<select>` showing only the
placeholder "Pilih Durasi Peminjaman" (nothing pre-selected).

- [ ] **Step 7: Verify client-side validation blocks an empty submit**

Click "Ajukan Peminjaman" without filling anything. Expected: an
`alert-danger` appears with "Nama, nomor kontak, dan durasi peminjaman
wajib diisi"; confirm via `read_network_requests` that no `POST
/api/peminjaman` request was made.

- [ ] **Step 8: Verify a successful submission**

Fill "Nama Lengkap" and "Nomor Kontak" with any text, select a duration
(e.g. "3 hari"), click "Ajukan Peminjaman". Expected: the right panel
switches to the success state, showing the book's title and a
"Batas pengembalian" date. Confirm via `read_network_requests` that
`POST /api/peminjaman` returned `200` with a body containing
`status: "dipinjam"`.

- [ ] **Step 9: Verify the backend's specific error message surfaces**

Run: `curl -s "http://localhost:5000/api/buku" | node -e "const d=JSON.parse(require('fs').readFileSync(0)); const zero=d.data.find(b=>b.stok_tersedia===0); const low=d.data.find(b=>b.stok_tersedia===1); console.log('zero:', zero && zero.id_buku, 'low:', low && low.id_buku)"`

If a `zero` id was printed, navigate to `/buku/<that id>/pinjam`, fill the
form, submit. If only a `low` id was printed, navigate to
`/buku/<that id>/pinjam` and submit once (this drives its stock to 0),
then submit the same form a second time with the same book. Expected (on
the submission against a 0-stock book): the `alert-danger` shows **"Buku
sedang tidak tersedia"** — the backend's real message, not a generic one
— proving Task 1's `apiRequest` fix works end-to-end through this form.

- [ ] **Step 10: Verify "Kembali" and breadcrumb navigation**

From the form page (before or after submitting), click "Kembali" →
expected: navigates to `/buku/<id>` (the book's detail page). Separately,
click the "Informasi Buku" breadcrumb link from the form page → same
destination. Click "Katalog Buku" breadcrumb → navigates to `/katalog`.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/services/loanService.js frontend/src/router/index.js frontend/src/views/PeminjamanFormView.vue
git commit -m "Add Formulir Peminjaman Buku page"
```

---

## Task 3: Wire "Pinjam Buku" on `BookDetail.vue`

**Files:**
- Modify: `frontend/src/views/BookDetail.vue:85-86`

**Interfaces:**
- Consumes: route name `'peminjaman-form'` from Task 2; `router` (already
  available in this file's `<script setup>` via `useRouter()`, used by the
  existing `goToDetail` function); `buku.id_buku` (already available from
  the existing `getBukuById` call in this file).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Wire the button**

In `frontend/src/views/BookDetail.vue`, current lines 85-86:

```html
            <button class="btn btn-navy-action px-4 py-2 rounded-pill shadow-sm">Pinjam
              Buku</button>
```

Replace with:

```html
            <button class="btn btn-navy-action px-4 py-2 rounded-pill shadow-sm"
              @click="router.push({ name: 'peminjaman-form', params: { id: buku.id_buku } })">
              Pinjam Buku
            </button>
```

- [ ] **Step 2: Verify in the browser**

Navigate to any book's detail page (e.g. `/buku/1`). Click "Pinjam Buku".
Expected: navigates to `/buku/1/pinjam`, the peminjaman form page (built
in Task 2) loads showing that same book's info in the left panel.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/BookDetail.vue
git commit -m "Wire Pinjam Buku button to the peminjaman form page"
```
