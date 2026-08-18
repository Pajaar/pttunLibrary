<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { getRak, createRak, updateRak, deleteRak } from '@/services/rakService.js'
import { getBuku } from '@/services/bookAdminService.js'

// State Data
const shelves = ref([])
const books = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Search & Pagination
const searchKeyword = ref('')
const page = ref(1)
const pageSize = 10

// Modal & Form State
const modalEl = ref(null)
let modalInstance = null
const editingId = ref(null)

const emptyForm = () => ({
  nama_rak: '',
})
const form = reactive(emptyForm())
const formError = ref('')

// Style Pagination Active
const pageNumberActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}

// Fetch Data Rak & Buku (untuk menghitung jumlah buku per rak)
async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [rakRes, bookRes] = await Promise.all([getRak(), getBuku()])
    shelves.value = rakRes.data || []
    books.value = bookRes.data || []
  } catch (error) {
    errorMsg.value = error.message || 'Gagal memuat data rak.'
  } finally {
    loading.value = false
  }
}

// Computed: Menghitung berapa banyak buku di setiap rak
const shelfBookCounts = computed(() => {
  const counts = {}
  for (const b of books.value) {
    if (b.id_rak) {
      counts[b.id_rak] = (counts[b.id_rak] || 0) + 1
    }
  }
  return counts
})

// Filter & Pagination
const filteredShelves = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return shelves.value
  return shelves.value.filter((r) => r.nama_rak?.toLowerCase().includes(keyword))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredShelves.value.length / pageSize)))

const pagedShelves = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredShelves.value.slice(start, start + pageSize)
})

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

// Modal Handlers
function openCreateModal() {
  editingId.value = null
  formError.value = ''
  Object.assign(form, emptyForm())
  modalInstance?.show()
}

function openEditModal(rak) {
  editingId.value = rak.id_rak
  formError.value = ''
  Object.assign(form, {
    nama_rak: rak.nama_rak ?? '',
  })
  modalInstance?.show()
}

// Submit Form
async function submitForm() {
  formError.value = ''

  if (!form.nama_rak.trim()) {
    formError.value = 'Nama rak wajib diisi.'
    return
  }

  const payload = {
    nama_rak: form.nama_rak.trim(),
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateRak(editingId.value, payload)
      successMsg.value = 'Data rak berhasil diperbarui.'
    } else {
      await createRak(payload)
      successMsg.value = 'Rak baru berhasil ditambahkan.'
    }
    modalInstance?.hide()
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    formError.value = error.message || 'Gagal menyimpan data.'
  } finally {
    saving.value = false
  }
}

// Delete Handler
async function handleDelete(rak) {
  const count = shelfBookCounts.value[rak.id_rak] || 0
  if (count > 0) {
    alert(`Tidak dapat menghapus rak "${rak.nama_rak}" karena terdapat ${count} buku yang tersimpan di rak ini.`)
    return
  }

  const confirmed = window.confirm(`Hapus rak "${rak.nama_rak}"?`)
  if (!confirmed) return

  try {
    await deleteRak(rak.id_rak)
    successMsg.value = 'Rak berhasil dihapus.'
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message || 'Gagal menghapus rak.'
  }
}

onMounted(async () => {
  await nextTick()
  if (modalEl.value) {
    modalInstance = new Modal(modalEl.value)
  }
  loadData()
})
</script>

<template>
  <AdminLayout title="Daftar Rak">
    <div class="pt-4">
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <RouterLink to="/admin/dashboard">Dashboard</RouterLink>
          </li>
          <li class="breadcrumb-item active" aria-current="page">Daftar Rak</li>
        </ol>
      </nav>

      <!-- Alert Notification -->
      <div v-if="successMsg" class="alert alert-success alert-dismissible fade show" role="alert">
        {{ successMsg }}
        <button type="button" class="btn-close" @click="successMsg = ''"></button>
      </div>
      <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ errorMsg }}
        <button type="button" class="btn-close" @click="errorMsg = ''"></button>
      </div>

      <!-- Main Card -->
      <div class="card shadow-soft">
        <div class="card-body">
          <!-- Top Bar -->
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h6 class="mb-0 text-nowrap">Daftar Rak Perpus</h6>
            <div class="d-flex gap-2 flex-grow-1">
              <input
                v-model="searchKeyword"
                @input="resetPageOnSearch"
                type="text"
                class="form-control form-control-sm flex-grow-1"
                placeholder="Cari nama rak..."
              />
              <button
                class="btn btn-sm text-white text-nowrap"
                style="background-color: var(--lib-green)"
                @click="openCreateModal"
              >
                <i class="bi bi-plus-lg me-1"></i>Tambah Rak
              </button>
            </div>
          </div>

          <!-- Loading Spinner -->
          <div v-if="loading" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Memuat data rak...
          </div>

          <!-- Table Rak -->
          <div v-else class="table-responsive">
            <table class="table table-striped table-hover align-middle mb-0">
              <thead>
                <tr class="text-muted small text-uppercase">
                  <th style="width: 50px;">#</th>
                  <th style="min-width: 150px;">Nama Rak</th>
                  <th style="width: 130px;" class="text-center">Kapasitas Terisi</th>
                  <th class="text-end" style="width: 100px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedShelves.length === 0">
                  <td colspan="6" class="text-center text-muted py-4">
                    Tidak ada data rak yang ditemukan.
                  </td>
                </tr>

                <tr v-for="(rak, idx) in pagedShelves" :key="rak.id_rak">
                  <td class="text-muted small">{{ (page - 1) * pageSize + idx + 1 }}</td>
                  <td class="fw-semibold text-dark">
                    <i class="bi bi-archive me-1 text-secondary"></i>
                    {{ rak.nama_rak }}
                  </td>
                  <td class="text-center">
                    <span class="badge rounded-pill bg-light text-dark border">
                      <i class="bi bi-book me-1"></i>
                      {{ shelfBookCounts[rak.id_rak] || 0 }} Buku
                    </span>
                  </td>
                  <td class="text-end text-nowrap">
                    <div class="d-inline-flex gap-1">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        title="Edit"
                        @click="openEditModal(rak)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        title="Hapus"
                        @click="handleDelete(rak)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Nav -->
          <nav v-if="!loading && totalPages > 1" class="pagination-nav" aria-label="Navigasi halaman">
            <button v-if="page > 1" type="button" class="page-arrow" @click="goToPage(page - 1)">
              <i class="bi bi-chevron-left"></i>
            </button>

            <template v-for="(n, index) in pageNumbers" :key="`${n}-${index}`">
              <span v-if="n === '...'" class="page-ellipsis">...</span>
              <button
                v-else
                type="button"
                class="page-number"
                :class="{ active: n === page }"
                :style="n === page ? pageNumberActiveStyle : null"
                @click="goToPage(n)"
              >
                {{ n }}
              </button>
            </template>

            <button v-if="page < totalPages" type="button" class="page-arrow" @click="goToPage(page + 1)">
              <i class="bi bi-chevron-right"></i>
            </button>
          </nav>
        </div>
      </div>
    </div>

    <!-- Modal Form (Create / Edit) -->
    <div ref="modalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="submitForm">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingId ? 'Edit Rak' : 'Tambah Rak Baru' }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <div v-if="formError" class="alert alert-danger py-2 mb-3">{{ formError }}</div>

              <div class="mb-3">
                <label class="form-label">Nama / Kode Rak <span class="text-danger">*</span></label>
                <input
                  v-model="form.nama_rak"
                  type="text"
                  class="form-control"
                  placeholder="Contoh: Rak A1, Rak Fiksi 02"
                  required
                />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
              <button
                type="submit"
                class="btn text-white"
                style="background-color: var(--lib-green)"
                :disabled="saving"
              >
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}

/* Pagination Styling */
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
