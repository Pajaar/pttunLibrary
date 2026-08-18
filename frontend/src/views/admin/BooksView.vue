<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { getBuku, getSection, createBuku, updateBuku, deleteBuku } from '@/services/bookAdminService.js'
import { getCategory } from '@/services/categoryService.js'
import { getRak } from '@/services/rakService.js'
import { uploadCoverAdmin } from '@/services/uploadAdminService.js'

const books = ref([])
const categories = ref([])
const rakList = ref([])
const sectionList = ref([])

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const uploadingCover = ref(false)
const uploadError = ref('')

const searchKeyword = ref('')
const selectedRak = ref('') // '' = Semua Rak
const page = ref(1)
const pageSize = 10

const modalEl = ref(null)
let modalInstance = null

const editingId = ref(null)
const emptyForm = () => ({
  judul_buku: '',
  id_category: '',
  pengarang: '',
  penerbit: '',
  tahun_terbit: '',
  halaman: '',
  id_rak: '',
  id_section: '',
  total_buku: 1,
  stok_tersedia: 1,
  image_url: '',
})
const form = reactive(emptyForm())
const formError = ref('')

function statusBadgeClass(status) {
  return status === 'Tersedia' ? 'bg-success' : 'bg-secondary'
}

const rakPillActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}
const pageNumberActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}

async function loadBooks() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await getBuku()
    books.value = res.data
  } catch (error) {
    errorMsg.value = error.message
  } finally {
    loading.value = false
  }
}

async function loadLookups() {
  try {
    const [catRes, rakRes, sectionRes] = await Promise.all([getCategory(), getRak(), getSection()])
    categories.value = catRes.data
    rakList.value = rakRes.data
    sectionList.value = sectionRes.data
  } catch (error) {
    errorMsg.value = error.message
  }
}

// Jumlah buku per rak, dipakai untuk badge angka di pill rak
const rakCounts = computed(() => {
  const counts = {}
  for (const b of books.value) {
    counts[b.id_rak] = (counts[b.id_rak] || 0) + 1
  }
  return counts
})

function selectRak(id_rak) {
  selectedRak.value = id_rak
  page.value = 1
}

const rakFilteredBooks = computed(() => {
  if (!selectedRak.value) return books.value
  return books.value.filter((b) => b.id_rak === selectedRak.value)
})

const filteredBooks = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return rakFilteredBooks.value
  return rakFilteredBooks.value.filter(
    (b) =>
      b.judul_buku?.toLowerCase().includes(keyword) ||
      b.pengarang?.toLowerCase().includes(keyword) ||
      b.nama_category?.toLowerCase().includes(keyword),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredBooks.value.length / pageSize)))

const pagedBooks = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredBooks.value.slice(start, start + pageSize)
})

// Nomor halaman dengan elipsis, meniru pagination di pttunLibrary
const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = page.value

  if (total <= 1) return []
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const siblingCount = 1
  const start = Math.max(2, current - siblingCount)
  const end = Math.min(total - 1, current + siblingCount)

  const pages = [1]
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)

  return pages
})

function goToPage(n) {
  if (n < 1 || n > totalPages.value || n === page.value) return
  page.value = n
}

function resetPageOnSearch() {
  page.value = 1
}

function openCreateModal() {
  editingId.value = null
  formError.value = ''
  uploadError.value = ''
  Object.assign(form, emptyForm())
  if (selectedRak.value) {
    form.id_rak = selectedRak.value
  }
  modalInstance?.show()
}

function openEditModal(book) {
  editingId.value = book.id_buku
  formError.value = ''
  uploadError.value = ''
  Object.assign(form, {
    judul_buku: book.judul_buku ?? '',
    id_category: book.id_category ?? '',
    pengarang: book.pengarang ?? '',
    penerbit: book.penerbit ?? '',
    tahun_terbit: book.tahun_terbit ?? '',
    halaman: book.halaman ?? '',
    id_rak: book.id_rak ?? '',
    id_section: book.id_section ?? '',
    total_buku: book.total_buku ?? 1,
    stok_tersedia: book.stok_tersedia ?? 1,
    image_url: book.image_url ?? '',
  })
  modalInstance?.show()
}

async function handleCoverFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  uploadingCover.value = true
  uploadError.value = ''
  try {
    const result = await uploadCoverAdmin(file)
    form.image_url = result.url
  } catch (error) {
    uploadError.value = error.message
  } finally {
    uploadingCover.value = false
    event.target.value = ''
  }
}

async function submitForm() {
  formError.value = ''

  if (!form.judul_buku.trim()) {
    formError.value = 'Judul buku wajib diisi.'
    return
  }
  if (!form.id_rak) {
    formError.value = 'Rak wajib dipilih.'
    return
  }

  const payload = {
    judul_buku: form.judul_buku.trim(),
    id_category: form.id_category || null,
    pengarang: form.pengarang || null,
    penerbit: form.penerbit || null,
    tahun_terbit: form.tahun_terbit ? Number(form.tahun_terbit) : null,
    halaman: form.halaman ? Number(form.halaman) : null,
    id_rak: Number(form.id_rak),
    id_section: form.id_section || null,
    total_buku: Number(form.total_buku) || 1,
    stok_tersedia: Number(form.stok_tersedia) || 0,
    image_url: form.image_url || null,
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateBuku(editingId.value, payload)
      successMsg.value = 'Buku berhasil diperbarui.'
    } else {
      await createBuku(payload)
      successMsg.value = 'Buku baru berhasil ditambahkan.'
    }
    modalInstance?.hide()
    await loadBooks()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    formError.value = error.message
  } finally {
    saving.value = false
  }
}

async function handleDelete(book) {
  const confirmed = window.confirm(`Hapus buku "${book.judul_buku}"? Tindakan ini tidak bisa dibatalkan.`)
  if (!confirmed) return

  try {
    await deleteBuku(book.id_buku)
    successMsg.value = 'Buku berhasil dihapus.'
    await loadBooks()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message
  }
}

onMounted(async () => {
  await nextTick()
  if (modalEl.value) {
    modalInstance = new Modal(modalEl.value)
  }
  loadLookups()
  loadBooks()
})
</script>

<template>
  <AdminLayout title="Daftar Buku">
    <div class="pt-4">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <RouterLink to="/admin/dashboard">Dashboard</RouterLink>
          </li>
          <li class="breadcrumb-item active" aria-current="page">Daftar Buku</li>
        </ol>
      </nav>

      <div v-if="successMsg" class="alert alert-success alert-dismissible fade show" role="alert">
        {{ successMsg }}
        <button type="button" class="btn-close" @click="successMsg = ''"></button>
      </div>
      <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ errorMsg }}
        <button type="button" class="btn-close" @click="errorMsg = ''"></button>
      </div>

      <div class="card shadow-soft">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h6 class="mb-0">Data Buku</h6>
            <div class="d-flex gap-2 flex-grow-1">
              <input v-model="searchKeyword" @input="resetPageOnSearch" type="text"
                class="form-control-sm flex-grow-1"
                placeholder="Cari judul, pengarang, kategori..." style="min-width: 240px" />
              <button class="btn btn-sm text-white" style="background-color: var(--lib-green)"
                @click="openCreateModal">
                <i class="bi bi-plus-lg me-1"></i>Tambah Buku
              </button>
            </div>
          </div>

          <div class="rak-pills mb-3">
            <button type="button" class="rak-pill" :class="{ active: selectedRak === '' }"
              :style="selectedRak === '' ? rakPillActiveStyle : null" @click="selectRak('')">
              Semua Rak <span class="rak-pill-count">{{ books.length }}</span>
            </button>
            <button v-for="r in rakList" :key="r.id_rak" type="button" class="rak-pill"
              :class="{ active: selectedRak === r.id_rak }"
              :style="selectedRak === r.id_rak ? rakPillActiveStyle : null"
              @click="selectRak(r.id_rak)">
              {{ r.nama_rak }} <span class="rak-pill-count">{{ rakCounts[r.id_rak] || 0 }}</span>
            </button>
          </div>

          <div v-if="loading" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Memuat data buku...
          </div>

          <div v-else class="table-responsive">
  <table class="table table-striped table-hover align-middle mb-0">
    <thead>
      <tr class="text-muted small text-uppercase">
        <th style="width: 60px;">Cover</th>
        <th>Judul</th>
        <th>Kategori</th>
        <th>Pengarang</th>
        <th>Tahun</th>
        <th>Rak</th>
        <th>Stok</th>
        <th>Status</th>
        <th class="text-end">Aksi</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="pagedBooks.length === 0">
        <td colspan="9" class="text-center text-muted py-4">
          Tidak ada data buku di rak ini.
        </td>
      </tr>
        <tr v-for="book in pagedBooks" :key="book.id_buku">
          <td>
            <img
              v-if="book.image_url"
              :src="book.image_url"
              alt="Cover"
              class="cover-thumb-table rounded border"
            />
            <div v-else class="cover-placeholder rounded bg-light border text-muted d-flex align-items-center justify-content-center">
              <i class="bi bi-book small"></i>
            </div>
          </td>

          <td style="max-width:300px;"  :title="book.judul_buku">
            {{ book.judul_buku }}
          </td>
          <td>{{ book.nama_category ?? '-' }}</td>
          <td>{{ book.pengarang ?? '-' }}</td>
          <td>{{ book.tahun_terbit ?? '-' }}</td>
          <td>{{ book.nama_rak ?? '-' }}</td>
          <td>{{ book.stok_tersedia }} / {{ book.total_buku }}</td>
          <td>
            <span class="badge" :class="statusBadgeClass(book.status_buku)">
              {{ book.status_buku }}
            </span>
          </td>
        <td class="text-end text-nowrap" style="width: 100px; min-width: 100px;">
            <div class="d-inline-flex gap-1 flex-nowrap">
            <button class="btn btn-sm btn-outline-secondary" title="Edit" @click="openEditModal(book)">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" title="Hapus" @click="handleDelete(book)">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
        </tr>
      </tbody>
    </table>
  </div>

          <nav v-if="!loading && totalPages > 1" class="pagination-nav"
            aria-label="Navigasi halaman">
            <button v-if="page > 1" type="button" class="page-arrow" @click="goToPage(page - 1)"
              aria-label="Halaman sebelumnya">
              <i class="bi bi-chevron-left"></i>
            </button>

            <template v-for="(n, index) in pageNumbers" :key="`${n}-${index}`">
              <span v-if="n === '...'" class="page-ellipsis">...</span>
              <button v-else type="button" class="page-number" :class="{ active: n === page }"
                :style="n === page ? pageNumberActiveStyle : null" @click="goToPage(n)">
                {{ n }}
              </button>
            </template>

            <button v-if="page < totalPages" type="button" class="page-arrow"
              @click="goToPage(page + 1)" aria-label="Halaman berikutnya">
              <i class="bi bi-chevron-right"></i>
            </button>
          </nav>
        </div>
      </div>
    </div>

    <div ref="modalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <form @submit.prevent="submitForm">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingId ? 'Edit Buku' : 'Tambah Buku' }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"
                aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div v-if="formError" class="alert alert-danger py-2">{{ formError }}</div>

              <div class="mb-3">
                <label class="form-label">Judul Buku <span class="text-danger">*</span></label>
                <input v-model="form.judul_buku" type="text" class="form-control" required />
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Kategori</label>
                  <select v-model="form.id_category" class="form-select">
                    <option value="">- Pilih kategori -</option>
                    <option v-for="c in categories" :key="c.id_category" :value="c.id_category">
                      {{ c.nama_category }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Pengarang</label>
                  <input v-model="form.pengarang" type="text" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Penerbit</label>
                  <input v-model="form.penerbit" type="text" class="form-control" />
                </div>
                <div class="col-md-3">
                  <label class="form-label">Tahun Terbit</label>
                  <input v-model="form.tahun_terbit" type="number" class="form-control" />
                </div>
                <div class="col-md-3">
                  <label class="form-label">Halaman</label>
                  <input v-model="form.halaman" type="number" class="form-control" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Rak <span class="text-danger">*</span></label>
                  <select v-model="form.id_rak" class="form-select" required>
                    <option value="">- Pilih rak -</option>
                    <option v-for="r in rakList" :key="r.id_rak" :value="r.id_rak">{{ r.nama_rak }}
                    </option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Section</label>
                  <select v-model="form.id_section" class="form-select">
                    <option value="">- Pilih section -</option>
                    <option v-for="s in sectionList" :key="s.id_section" :value="s.id_section">
                      {{ s.nama_section }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Jumlah Eksemplar</label>
                  <input v-model="form.total_buku" type="number" min="1" class="form-control" />
                </div>
                <div v-if="editingId" class="col-md-4">
                  <label class="form-label">Stok Tersedia</label>
                  <input v-model="form.stok_tersedia" type="number" min="0" class="form-control" />
                </div>
                <div class="col-md-8">
                  <label class="form-label">Cover Buku</label>
                  <div class="d-flex align-items-start gap-2">
                    <img v-if="form.image_url" :src="form.image_url" alt="Preview cover"
                      class="cover-thumb" />
                    <div class="flex-grow-1">
                      <input
                        type="file"
                        accept="image/*"
                        class="form-control form-control-sm mb-1"
                        :disabled="uploadingCover"
                        @change="handleCoverFileChange"
                      />
                      <div v-if="uploadingCover" class="small text-muted">
                        <span class="spinner-border spinner-border-sm me-1"></span>Mengunggah cover...
                      </div>
                      <div v-if="uploadError" class="small text-danger">{{ uploadError }}</div>
                      <!-- Hook point untuk Plan 4: tombol "Scan Cover" (CoverScanner) akan ditambahkan di sini -->
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary"
                data-bs-dismiss="modal">Batal</button>
              <button type="submit" class="btn text-white"
                style="background-color: var(--lib-green)" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
  .cover-thumb-table {
    width: 40px;
    height: 55px;
    object-fit: cover;
  }

  .cover-placeholder {
    width: 40px;
    height: 55px;
  }
  .cover-thumb {
    width: 64px;
    height: 88px;
    object-fit: cover;
    border-radius: 0.375rem;
    border: 1px solid #d8dee6;
    flex-shrink: 0;
  }

  /* Pill filter rak */
  .rak-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .rak-pill {
    border: 1px solid #d8dee6;
    background-color: #fff;
    color: #495057;
    border-radius: 30px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    white-space: nowrap;
  }

  .rak-pill:hover {
    border-color: var(--lib-green);
    color: var(--lib-green);
  }

  .rak-pill.active {
    background-color: var(--lib-green);
    border-color: var(--lib-green);
    color: #fff;
  }

  .rak-pill-count {
    opacity: 0.75;
    font-size: 11px;
    margin-left: 2px;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal;
  }

  .pagination-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
    flex-wrap: wrap;
  }

  .page-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid #d8dee6;
    background-color: #fff;
    color: #1e293b;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
  }

  .page-number:hover {
    background-color: #f2f7f5;
    border-color: var(--lib-green);
  }

  .page-number.active {
    background-color: var(--lib-green);
    border-color: var(--lib-green);
    color: #fff;
  }

  .page-ellipsis {
    width: 34px;
    text-align: center;
    color: #64748b;
    font-weight: 600;
  }

  .page-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: none;
    background: none;
    color: var(--lib-green);
    font-size: 15px;
    cursor: pointer;
  }

  .page-arrow:hover {
    color: var(--lib-green-dark);
  }

</style>
