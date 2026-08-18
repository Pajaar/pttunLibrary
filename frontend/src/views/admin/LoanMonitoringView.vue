<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  getPeminjaman,
  updatePeminjaman,
  updateStatusPeminjaman,
  deletePeminjaman,
} from '@/services/loanAdminService.js'

const loans = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const searchKeyword = ref('')
const page = ref(1)
const pageSize = 10

const modalEl = ref(null)
let modalInstance = null
const editingId = ref(null)

const emptyForm = () => ({
  nama_peminjam: '',
  no_telpon: '',
  durasi_hari: 7,
})
const form = reactive(emptyForm())
const formError = ref('')

const pageNumberActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}

function statusBadgeClass(status) {
  if (status === 'terlambat') return 'bg-danger'
  if (status === 'dikembalikan') return 'bg-success'
  return 'bg-warning text-dark'
}

function statusLabel(status) {
  if (status === 'terlambat') return 'Terlambat'
  if (status === 'dikembalikan') return 'Dikembalikan'
  return 'Dipinjam'
}

function formatTanggal(value) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await getPeminjaman()
    loans.value = res.data || []
  } catch (error) {
    errorMsg.value = error.message || 'Gagal memuat data peminjaman.'
  } finally {
    loading.value = false
  }
}

const filteredLoans = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return loans.value
  return loans.value.filter(
    (l) =>
      l.nama_peminjam?.toLowerCase().includes(keyword) ||
      l.judul_buku?.toLowerCase().includes(keyword),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLoans.value.length / pageSize)))

const pagedLoans = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredLoans.value.slice(start, start + pageSize)
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

function openEditModal(loan) {
  editingId.value = loan.id_peminjaman
  formError.value = ''
  Object.assign(form, {
    nama_peminjam: loan.nama_peminjam ?? '',
    no_telpon: loan.no_telpon ?? '',
    durasi_hari: loan.durasi_hari ?? 7,
  })
  modalInstance?.show()
}

async function submitForm() {
  formError.value = ''

  if (!form.nama_peminjam.trim()) {
    formError.value = 'Nama peminjam wajib diisi.'
    return
  }
  if (!form.no_telpon.trim()) {
    formError.value = 'Nomor telepon wajib diisi.'
    return
  }
  const durasi = Number(form.durasi_hari)
  if (!Number.isInteger(durasi) || durasi < 1 || durasi > 7) {
    formError.value = 'Durasi pinjam harus berupa angka antara 1 dan 7 hari.'
    return
  }

  const payload = {
    nama_peminjam: form.nama_peminjam.trim(),
    no_telpon: form.no_telpon.trim(),
    durasi_hari: durasi,
  }

  saving.value = true
  try {
    await updatePeminjaman(editingId.value, payload)
    successMsg.value = 'Data peminjaman berhasil diperbarui.'
    modalInstance?.hide()
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    formError.value = error.message || 'Gagal menyimpan data.'
  } finally {
    saving.value = false
  }
}

async function handleDelete(loan) {
  const confirmed = window.confirm(
    `Hapus data peminjaman "${loan.judul_buku}" oleh ${loan.nama_peminjam}? Tindakan ini tidak bisa dibatalkan.`,
  )
  if (!confirmed) return

  try {
    await deletePeminjaman(loan.id_peminjaman)
    successMsg.value = 'Data peminjaman berhasil dihapus.'
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message || 'Gagal menghapus data peminjaman.'
  }
}

async function handleMarkReturned(loan) {
  const confirmed = window.confirm(
    `Tandai peminjaman "${loan.judul_buku}" oleh ${loan.nama_peminjam} sebagai dikembalikan?`,
  )
  if (!confirmed) return

  try {
    await updateStatusPeminjaman(loan.id_peminjaman, 'dikembalikan')
    successMsg.value = 'Peminjaman berhasil ditandai sebagai dikembalikan.'
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message || 'Gagal menandai peminjaman sebagai dikembalikan.'
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
  <AdminLayout title="Monitoring Peminjaman">
    <div class="pt-4">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <RouterLink to="/admin/dashboard">Dashboard</RouterLink>
          </li>
          <li class="breadcrumb-item active" aria-current="page">Monitoring Peminjaman</li>
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
            <h6 class="mb-0 text-nowrap">Monitoring Peminjaman</h6>
            <input
              v-model="searchKeyword"
              @input="resetPageOnSearch"
              type="text"
              class="form-control form-control-sm flex-grow-1"
              placeholder="Cari nama peminjam atau judul buku..."
            />
          </div>

          <div v-if="loading" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Memuat data peminjaman...
          </div>

          <div v-else class="table-responsive">
            <table class="table table-striped table-hover align-middle mb-0">
              <thead>
                <tr class="text-muted small text-uppercase">
                  <th style="width: 50px;">#</th>
                  <th>Peminjam</th>
                  <th>Judul Buku</th>
                  <th>Tanggal Pinjam</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th class="text-end" style="width: 130px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedLoans.length === 0">
                  <td colspan="7" class="text-center text-muted py-4">
                    Tidak ada data peminjaman yang ditemukan.
                  </td>
                </tr>

                <tr
                  v-for="(loan, idx) in pagedLoans"
                  :key="loan.id_peminjaman"
                  :class="{ 'table-danger': loan.status === 'terlambat' }"
                >
                  <td class="text-muted small">{{ (page - 1) * pageSize + idx + 1 }}</td>
                  <td>
                    <div class="fw-semibold text-dark">{{ loan.nama_peminjam }}</div>
                    <div class="small text-muted">{{ loan.no_telpon }}</div>
                  </td>
                  <td style="max-width: 220px" :title="loan.judul_buku">{{ loan.judul_buku }}</td>
                  <td>{{ formatTanggal(loan.tanggal_pinjam) }}</td>
                  <td>{{ formatTanggal(loan.due_date) }}</td>
                  <td>
                    <span class="badge" :class="statusBadgeClass(loan.status)">
                      {{ statusLabel(loan.status) }}
                    </span>
                  </td>
                  <td class="text-end text-nowrap" style="width: 130px; min-width: 130px;">
                    <div class="d-inline-flex gap-1 flex-nowrap">
                      <button
                        v-if="loan.status !== 'dikembalikan'"
                        class="btn btn-sm btn-outline-success"
                        title="Tandai Dikembalikan"
                        @click="handleMarkReturned(loan)"
                      >
                        <i class="bi bi-check-lg"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        title="Edit"
                        @click="openEditModal(loan)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        title="Hapus"
                        @click="handleDelete(loan)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

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

    <!-- Modal Form Edit -->
    <div ref="modalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="submitForm">
            <div class="modal-header">
              <h5 class="modal-title">Edit Peminjaman</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <div v-if="formError" class="alert alert-danger py-2 mb-3">{{ formError }}</div>

              <div class="mb-3">
                <label class="form-label">Nama Peminjam <span class="text-danger">*</span></label>
                <input v-model="form.nama_peminjam" type="text" class="form-control" required />
              </div>

              <div class="mb-3">
                <label class="form-label">Nomor Telepon <span class="text-danger">*</span></label>
                <input v-model="form.no_telpon" type="text" class="form-control" required />
              </div>

              <div class="mb-3">
                <label class="form-label">Durasi Pinjam (hari)</label>
                <input
                  v-model="form.durasi_hari"
                  type="number"
                  min="1"
                  max="7"
                  class="form-control"
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
