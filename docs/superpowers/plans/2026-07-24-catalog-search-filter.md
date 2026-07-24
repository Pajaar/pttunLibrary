# Catalog Search & Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public catalog page's search/filter/sort UI actually work against the real database schema, replacing the currently-static markup.

**Architecture:** Backend joins `buku` to `detail_buku`/`category`/`rak`/`section` so `GET /buku` returns full denormalized rows in one query. Frontend fetches that list once and does all search/filter/sort client-side via Vue computed properties — no new endpoints, no new components.

**Tech Stack:** Vue 3 (`<script setup>`, Composition API), Bootstrap classes (existing), Node.js/Express, mysql2.

## Global Constraints

- No automated test framework exists in this repo (confirmed: `backend/package.json` has no test runner; `frontend/` has no committed `package.json`/`vite.config.js`/`index.html` at all — only `src/`). The user chose to skip adding one for this task. Verification steps below are manual/scripted, not `npm test`.
- Frontend cannot currently be run in a browser (no build tooling committed) — this is a known, separate gap flagged in the spec, not something either task fixes. Frontend verification in this plan is therefore a logic-level check via a throwaway Node script, not a live browser check.
- Real DB schema (confirmed via live `SHOW COLUMNS`, not from repo files — `schema.sql` in the repo is empty):
  - `buku`: `id_buku` (int), `judul_buku` (text), `id_category` (int)
  - `detail_buku`: `id_detail` (int), `id_buku` (int), `pengarang` (text), `penerbit` (text), `tahun_terbit` (year), `halaman` (int), `id_rak` (int), `id_section` (int), `total_buku` (int), `stok_tersedia` (int), `status_buku` (enum: `'tersedia'`,`'tidak tersedia'`), `image_url` (varchar 500)
  - `category`: `id_category` (int), `nama_category` (varchar 100)
  - `rak`: `id_rak` (int), `nama_rak` (varchar 50)
  - `section`: `id_section` (int), `nama_section` (varchar 50)
- Full spec: `docs/superpowers/specs/2026-07-24-catalog-search-filter-design.md`.

---

### Task 1: Backend — join `getSemuaBuku` to related tables

**Files:**
- Modify: `backend/models/BukuModel.js:3-6`

**Interfaces:**
- Produces: `exports.getSemuaBuku()` — async, returns `Promise<Array<{id_buku, judul_buku, nama_category, pengarang, penerbit, tahun_terbit, stok_tersedia, status_buku, image_url, nama_rak, nama_section}>>`. This exact field set is what Task 2's frontend code binds to (`buku.nama_category`, `buku.pengarang`, `buku.tahun_terbit`, `buku.nama_rak`, `buku.nama_section`, `buku.status_buku`, `buku.image_url`, `buku.judul_buku`, `buku.id_buku`).

- [ ] **Step 1: Replace the `getSemuaBuku` query**

Current code (`backend/models/BukuModel.js:1-6`):

```js
const db = require('../config/database')

exports.getSemuaBuku = async () => {
  const [rows] = await db.promise().query('SELECT * FROM buku')
  return rows
}
```

Replace the `getSemuaBuku` function body with:

```js
exports.getSemuaBuku = async () => {
  const [rows] = await db.promise().query(
    `SELECT b.id_buku, b.judul_buku,
            c.nama_category,
            d.pengarang, d.penerbit, d.tahun_terbit, d.stok_tersedia,
            d.status_buku, d.image_url,
            r.nama_rak, sec.nama_section
     FROM buku b
     INNER JOIN detail_buku d ON b.id_buku = d.id_buku
     LEFT JOIN category c ON b.id_category = c.id_category
     LEFT JOIN rak r ON d.id_rak = r.id_rak
     LEFT JOIN section sec ON d.id_section = sec.id_section`
  )
  return rows
}
```

Leave `getBukuById` and `searchBuku` (and the rest of the file) untouched.

- [ ] **Step 2: Verify against the live database**

This repo has no test framework, so verify by calling the function directly against the real DB (same pattern used during design research — read-only `SELECT`, no risk to data).

Run from `backend/`:

```bash
node -e "
const BukuModel = require('./models/BukuModel');
BukuModel.getSemuaBuku().then((rows) => {
  console.log('row count:', rows.length);
  console.log('first row keys:', Object.keys(rows[0] || {}));
  console.log('sample row:', rows[0]);
  process.exit(0);
}).catch((err) => { console.error(err); process.exit(1); });
"
```

Expected output:
- `row count:` some number > 0 (matches existing book count, ~191 per CLAUDE.md).
- `first row keys:` includes `id_buku, judul_buku, nama_category, pengarang, penerbit, tahun_terbit, stok_tersedia, status_buku, image_url, nama_rak, nama_section`.
- `sample row` shows real values (not `undefined`) for `nama_category`, `pengarang`, `nama_rak`, `nama_section` — confirms the joins matched real rows, not just returning nulls from a broken join condition.

If any of the joined fields come back `null` for most/all rows, stop and check the actual FK values in `buku`/`detail_buku` (e.g. `id_category`, `id_rak`, `id_section` might not be populated the way assumed) before continuing to Task 2.

- [ ] **Step 3: Commit**

```bash
git add backend/models/BukuModel.js
git commit -m "$(cat <<'EOF'
Join getSemuaBuku to detail_buku/category/rak/section

GET /buku previously returned bare buku rows (SELECT *), so category,
author, publisher, year, rak, section, and status never reached the
frontend. Needed for the catalog search/filter feature.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Frontend — wire up search, filter, and sort in `CatalogView.vue`

**Files:**
- Modify: `frontend/src/views/CatalogView.vue` (full `<script setup>` block, lines 1-27; template block from the search bar through the book grid, lines 40-177)

**Interfaces:**
- Consumes: `getBuku()` from `../services/bookService` (unchanged, still `apiRequest('/buku')`) — now returns objects shaped per Task 1's `getSemuaBuku` output.
- Produces: page-local reactive state only; nothing else in the app depends on this file's internals.

- [ ] **Step 1: Replace the `<script setup>` block**

Current (`frontend/src/views/CatalogView.vue:1-27`):

```js
<script setup>
  import {
    ref,
    onMounted
  } from 'vue'
  import {
    getBuku
  } from '../services/bookService'

  import defaultCover from '@/assets/images/Logo_Ma.png';

  const daftarBuku = ref([])
  const sedangMemuat = ref(true)
  const pesanError = ref('')

  onMounted(async () => {
    try {
      const response = await getBuku()
      daftarBuku.value = Array.isArray(response.data) ? response.data : []
    } catch (error) {
      pesanError.value = error.message || 'Data buku belum bisa dimuat'
    } finally {
      sedangMemuat.value = false
    }
  })

</script>
```

Replace with:

```js
<script setup>
  import {
    ref,
    computed,
    onMounted
  } from 'vue'
  import {
    getBuku
  } from '../services/bookService'

  import defaultCover from '@/assets/images/Logo_Ma.png';

  const daftarBuku = ref([])
  const sedangMemuat = ref(true)
  const pesanError = ref('')

  const searchQuery = ref('')
  const selectedCategory = ref('')
  const selectedStatus = ref('')
  const selectedRak = ref('')
  const selectedSection = ref('')
  const selectedYear = ref('')
  const sortBy = ref('relevan')

  onMounted(async () => {
    try {
      const response = await getBuku()
      daftarBuku.value = Array.isArray(response.data) ? response.data : []
    } catch (error) {
      pesanError.value = error.message || 'Data buku belum bisa dimuat'
    } finally {
      sedangMemuat.value = false
    }
  })

  function uniqueSorted(list, key) {
    const values = list
      .map((item) => item[key])
      .filter((value) => value !== null && value !== undefined && value !== '')
    return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)))
  }

  const kategoriOptions = computed(() => uniqueSorted(daftarBuku.value, 'nama_category'))
  const statusOptions = computed(() => uniqueSorted(daftarBuku.value, 'status_buku'))
  const rakOptions = computed(() => uniqueSorted(daftarBuku.value, 'nama_rak'))
  const sectionOptions = computed(() => uniqueSorted(daftarBuku.value, 'nama_section'))
  const tahunOptions = computed(() =>
    uniqueSorted(daftarBuku.value, 'tahun_terbit').sort((a, b) => b - a)
  )

  const filteredBuku = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    return daftarBuku.value.filter((buku) => {
      const matchesSearch =
        !query ||
        [buku.judul_buku, buku.pengarang, buku.penerbit].some((field) =>
          (field || '').toLowerCase().includes(query)
        )

      const matchesCategory = !selectedCategory.value || buku.nama_category === selectedCategory.value
      const matchesStatus = !selectedStatus.value || buku.status_buku === selectedStatus.value
      const matchesRak = !selectedRak.value || buku.nama_rak === selectedRak.value
      const matchesSection = !selectedSection.value || buku.nama_section === selectedSection.value
      const matchesYear = !selectedYear.value || String(buku.tahun_terbit) === String(selectedYear.value)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesRak &&
        matchesSection &&
        matchesYear
      )
    })
  })

  const sortedBuku = computed(() => {
    const list = [...filteredBuku.value]

    if (sortBy.value === 'terbaru') {
      return list.sort((a, b) => (b.tahun_terbit || 0) - (a.tahun_terbit || 0))
    }

    if (sortBy.value === 'judul') {
      return list.sort((a, b) => (a.judul_buku || '').localeCompare(b.judul_buku || ''))
    }

    return list
  })
</script>
```

- [ ] **Step 2: Replace the template block (search bar, filter sidebar, book grid)**

Current (`frontend/src/views/CatalogView.vue:40-177`) is the block starting at `<div class="container mt-4 mb-4">` (the search bar) and ending at the closing `</div>` of `<div class="row g-4">` (just before the final two closing `</div>` tags of `.container.my-5` and `.catalog-page`).

Replace that entire block with:

```html
    <div class="container mt-4 mb-4">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input
          type="text"
          class="form-control search-input"
          placeholder="Cari berdasarkan judul buku, pengarang, atau penerbit..."
          v-model="searchQuery">
        <button class="search-button" type="button"> Cari Buku </button>
      </div>
    </div>

    <div class="container my-5">
      <div class="row g-4">

        <!-- Sidebar Filter -->
        <div class="col-lg-3">
          <div class="filter-box">
            <h6>Kategori</h6>
            <select class="form-select" v-model="selectedCategory">
              <option value="">Semua Kategori</option>
              <option v-for="kategori in kategoriOptions" :key="kategori" :value="kategori">
                {{ kategori }}
              </option>
            </select>
          </div>

          <div class="filter-box">
            <h6>Ketersediaan</h6>
            <select class="form-select" v-model="selectedStatus">
              <option value="">Semua Status</option>
              <option v-for="status in statusOptions" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </div>

          <div class="filter-box">
            <h6>Rak</h6>
            <select class="form-select" v-model="selectedRak">
              <option value="">Semua Rak</option>
              <option v-for="rak in rakOptions" :key="rak" :value="rak">
                {{ rak }}
              </option>
            </select>
          </div>

          <div class="filter-box">
            <h6>Section</h6>
            <select class="form-select" v-model="selectedSection">
              <option value="">Semua Section</option>
              <option v-for="section in sectionOptions" :key="section" :value="section">
                {{ section }}
              </option>
            </select>
          </div>

          <div class="filter-box">
            <h6>Tahun Terbit</h6>
            <select class="form-select" v-model="selectedYear">
              <option value="">Semua Tahun</option>
              <option v-for="tahun in tahunOptions" :key="tahun" :value="tahun">
                {{ tahun }}
              </option>
            </select>
          </div>
        </div>

        <!-- Book Content -->
        <div class="col-lg-9">
          <div class="d-flex justify-content-between align-items-center book-header">
            <h4 class="mb-0 book-count">
              Menampilkan <span>{{ sortedBuku.length }}</span> dari
              <span>{{ daftarBuku.length }}</span> buku
            </h4>

            <select class="form-select sort-select" v-model="sortBy">
              <option value="relevan">Paling Relevan</option>
              <option value="terbaru">Terbaru</option>
              <option value="judul">Judul A-Z</option>
            </select>
          </div>

          <hr>

          <p v-if="sedangMemuat">Memuat data buku...</p>

          <p v-else-if="pesanError" class="error-message">
            {{ pesanError }}
          </p>

          <p v-else-if="daftarBuku.length === 0">
            Belum ada data buku.
          </p>

          <p v-else-if="sortedBuku.length === 0">
            Tidak ada buku yang cocok dengan filter Anda.
          </p>

          <div v-else class="row g-4 mt-2">
            <div class="col-md-4" v-for="buku in sortedBuku" :key="buku.id_buku">
              <div class="book-card">

                <!-- Wrapper untuk gambar dan badge -->
                <div class="book-img-wrapper">
                  <img
                    :src="buku.image_url || defaultCover"
                    alt="Cover Buku" class="book-img">
                  <!-- Badge kategori melayang di atas gambar -->
                  <span class="category-badge">{{ buku.nama_category || 'Tanpa Kategori' }}</span>
                </div>

                <!-- Konten detail buku -->
                <div class="book-body">
                  <div class="d-flex justify-content-between align-items-start gap-2">
                    <h6 class="book-title">{{ buku.judul_buku }}</h6>
                    <span class="status">• {{ buku.status_buku }}</span>
                  </div>
                  <p class="book-author">{{ buku.pengarang || 'Penulis belum tersedia' }}</p>
                  <small class="book-year">{{ buku.tahun_terbit || 'Tahun tidak tersedia' }}</small>
                  <button class="book-btn">Lihat Buku</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
```

Leave the `<style scoped>` block and everything above line 40 (the page header/hero section) untouched.

- [ ] **Step 3: Verify the filter/sort logic with a standalone script**

The frontend has no committed build tooling (no `package.json`/`vite.config.js`/`index.html`), so the Vue component cannot be run in a browser yet — this is a known gap, not something this task fixes. Verify the *logic* instead, by re-implementing the same predicate/sort logic against a fixture array in plain Node and checking it behaves as the component's computed properties should.

Run:

```bash
node -e "
const daftarBuku = [
  { id_buku: 1, judul_buku: 'Hukum Acara Pidana', pengarang: 'Andi', penerbit: 'Sinar Grafika', nama_category: 'Hukum Acara', status_buku: 'tersedia', nama_rak: 'Rak 1', nama_section: 'A', tahun_terbit: 2020 },
  { id_buku: 2, judul_buku: 'Perdata Indonesia', pengarang: 'Budi', penerbit: 'Kencana', nama_category: 'Perdata', status_buku: 'tidak tersedia', nama_rak: 'Rak 2', nama_section: 'B', tahun_terbit: 2018 },
  { id_buku: 3, judul_buku: 'Hukum Acara Perdata', pengarang: 'Andi', penerbit: 'Kencana', nama_category: 'Hukum Acara', status_buku: 'tersedia', nama_rak: 'Rak 1', nama_section: 'B', tahun_terbit: 2022 },
];

function uniqueSorted(list, key) {
  const values = list.map((item) => item[key]).filter((v) => v !== null && v !== undefined && v !== '');
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}

const kategoriOptions = uniqueSorted(daftarBuku, 'nama_category');
console.assert(JSON.stringify(kategoriOptions) === JSON.stringify(['Hukum Acara', 'Perdata']), 'FAIL kategoriOptions', kategoriOptions);

function filterBuku(query, category, status, rak, section, year) {
  const q = query.trim().toLowerCase();
  return daftarBuku.filter((buku) => {
    const matchesSearch = !q || [buku.judul_buku, buku.pengarang, buku.penerbit].some((f) => (f || '').toLowerCase().includes(q));
    const matchesCategory = !category || buku.nama_category === category;
    const matchesStatus = !status || buku.status_buku === status;
    const matchesRak = !rak || buku.nama_rak === rak;
    const matchesSection = !section || buku.nama_section === section;
    const matchesYear = !year || String(buku.tahun_terbit) === String(year);
    return matchesSearch && matchesCategory && matchesStatus && matchesRak && matchesSection && matchesYear;
  });
}

const byCategory = filterBuku('', 'Hukum Acara', '', '', '', '');
console.assert(byCategory.length === 2 && byCategory.every((b) => b.nama_category === 'Hukum Acara'), 'FAIL category filter', byCategory);

const bySearchAndCategory = filterBuku('andi', 'Hukum Acara', '', '', 'B', '');
console.assert(bySearchAndCategory.length === 1 && bySearchAndCategory[0].id_buku === 3, 'FAIL AND combine', bySearchAndCategory);

const byStatus = filterBuku('', '', 'tidak tersedia', '', '', '');
console.assert(byStatus.length === 1 && byStatus[0].id_buku === 2, 'FAIL status filter', byStatus);

const sortedByYear = [...daftarBuku].sort((a, b) => (b.tahun_terbit || 0) - (a.tahun_terbit || 0));
console.assert(sortedByYear.map((b) => b.id_buku).join(',') === '3,1,2', 'FAIL terbaru sort', sortedByYear);

const sortedByTitle = [...daftarBuku].sort((a, b) => (a.judul_buku || '').localeCompare(b.judul_buku || ''));
console.assert(sortedByTitle.map((b) => b.id_buku).join(',') === '1,3,2', 'FAIL judul A-Z sort', sortedByTitle);

console.log('all filter/sort logic checks passed');
"
```

Expected output: `all filter/sort logic checks passed`, with no `FAIL` lines printed above it. If any `console.assert` fires, it prints `Assertion failed: FAIL ...` with the actual value — fix the corresponding logic in `CatalogView.vue`'s `<script setup>` (Step 1) to match, then re-run.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/CatalogView.vue
git commit -m "$(cat <<'EOF'
Wire up catalog search, filter, and sort

Replaces the static, non-functional search/filter UI with real
client-side filtering against the joined book data: free-text search
(judul/pengarang/penerbit), dropdown filters for kategori/status/
rak/section/tahun (AND-combined, options derived from real data), and
a working sort dropdown. Drops the "Tipe Buku" filter group, which
wasn't a real field in the schema.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Client-side filtering — Task 2. ✓
- Backend join fix — Task 1. ✓
- Free-text search fields (judul_buku/pengarang/penerbit) — Task 2 Step 1 (`filteredBuku`). ✓
- Dropdown filters (kategori/status/rak/section/tahun), AND-combined, options derived from data — Task 2 Step 1 (`kategoriOptions` etc., `filteredBuku`). ✓
- Rak/Section independent (no cascading) — Task 2 Step 1 uses two separate refs/computeds with no cross-filtering. ✓
- Sort (relevan/terbaru/judul) — Task 2 Step 1 (`sortedBuku`). ✓
- No pagination — not introduced anywhere. ✓
- No new component — both tasks modify existing files only. ✓
- Empty-result vs empty-database distinct messages — Task 2 Step 2. ✓
- Header counts — Task 2 Step 2 (`sortedBuku.length` / `daftarBuku.length`). ✓
- Remove "Tipe Buku" group, replace category checkboxes with dropdown — Task 2 Step 2. ✓
- Search button kept, harmless no-op — Task 2 Step 2 (kept, `type="button"` added defensively). ✓
- Manual verification (no test framework) — Task 1 Step 2, Task 2 Step 3. ✓
- Out-of-scope items (admin BookListView, BookCard.vue, /buku/search, frontend tooling gap) — untouched by both tasks. ✓

**Placeholder scan:** No TBD/TODO/"add appropriate handling"-style steps; every step has literal code or literal commands with expected output.

**Type consistency:** Field names used in Task 2 (`nama_category`, `pengarang`, `penerbit`, `tahun_terbit`, `stok_tersedia`, `status_buku`, `image_url`, `nama_rak`, `nama_section`, `id_buku`, `judul_buku`) match exactly what Task 1's query selects and aliases. No mismatches.
