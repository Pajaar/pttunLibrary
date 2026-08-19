<template>
  <div class="container cek-peminjaman-container my-4 my-md-5">
    <div class="cat-head container d-flex justify-content-center flex-column align-items-center mb-4 px-0">
      <div class="w-100 d-flex justify-content-center align-items-center gap-2 gap-md-3">
        <hr class="flex-grow-1 my-auto opacity-100 d-none d-sm-block" style="border-color: #D4AD65; border-width: 2px;">
        <h1 class="px-2 px-md-4 text-dark fw-bold title-cek m-0 text-center">Cek Status Peminjaman</h1>
        <hr class="flex-grow-1 my-auto opacity-100 d-none d-sm-block" style="border-color: #D4AD65; border-width: 2px;">
      </div>
      <h2 class="form-subtitle text-muted text-center mt-3 mb-0">
        Masukkan nama dan nomor kontak yang sama seperti saat mengajukan peminjaman.
      </h2>
    </div>

    <div class="cek-card p-3 p-md-4 p-lg-5 mx-auto">
      <form @submit.prevent="cariPeminjaman">
        <div class="mb-3">
          <label class="form-label" for="nama_peminjam">Nama Lengkap</label>
          <div class="input-icon-wrapper">
            <i class="bi bi-person"></i>
            <input id="nama_peminjam" v-model="namaPeminjam" type="text"
              class="form-control cek-input" placeholder="Masukkan nama lengkap Anda" required>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label" for="no_telpon">Nomor Kontak</label>
          <div class="input-icon-wrapper">
            <i class="bi bi-telephone"></i>
            <input id="no_telpon" v-model="noTelpon" type="tel"
              class="form-control cek-input" placeholder="Contoh: 0821xxxxx" required>
          </div>
        </div>

        <div v-if="pesanError" class="alert alert-danger py-2 small fw-medium">{{ pesanError }}</div>

        <button type="submit" class="btn btn-navy-action w-100 px-4 py-2 rounded-pill" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
          {{ loading ? 'Mencari...' : 'Cek Status' }}
        </button>
      </form>

      <div v-if="hasSearched && !loading" class="mt-4 mt-md-5">
        <div v-if="hasil.length === 0" class="text-center py-4 text-muted">
          Tidak ditemukan peminjaman dengan data tersebut.
        </div>

        <div v-else class="d-flex flex-column gap-3">
          <div v-for="item in hasil" :key="item.id_peminjaman" class="hasil-item p-3 rounded-4">
            <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <h5 class="font-display text-navy mb-1">{{ item.judul_buku }}</h5>
              <span class="status-badge px-3 py-1 rounded-pill fw-medium"
                :class="statusBadgeClass(item.status)">
                {{ statusLabel(item.status) }}
              </span>
            </div>
            <p class="text-muted small mb-0">Tanggal pinjam: {{ formatTanggal(item.tanggal_pinjam) }}</p>
            <p class="text-muted small mb-0">Batas pengembalian: {{ formatTanggal(item.due_date) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { cekStatusPeminjaman } from '../services/loanService'

const namaPeminjam = ref('')
const noTelpon = ref('')

const loading = ref(false)
const pesanError = ref('')
const hasSearched = ref(false)
const hasil = ref([])

const cariPeminjaman = async () => {
  pesanError.value = ''

  if (!namaPeminjam.value.trim() || !noTelpon.value.trim()) {
    pesanError.value = 'Nama dan nomor kontak wajib diisi'
    return
  }

  loading.value = true
  hasSearched.value = false
  try {
    const response = await cekStatusPeminjaman({
      nama_peminjam: namaPeminjam.value.trim(),
      no_telpon: noTelpon.value.trim()
    })
    hasil.value = response.data
    hasSearched.value = true
  } catch (err) {
    pesanError.value = err.message || 'Gagal mengambil data peminjaman'
  } finally {
    loading.value = false
  }
}

const formatTanggal = (rawTanggal) => {
  if (!rawTanggal) return '-'
  const tanggal = new Date(rawTanggal)
  if (Number.isNaN(tanggal.getTime())) return rawTanggal || '-'

  return tanggal.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  })
}

const statusBadgeClass = (status) => {
  if (status === 'terlambat') return 'bg-danger text-white'
  if (status === 'dikembalikan') return 'bg-success text-white'
  return 'bg-navy'
}

const statusLabel = (status) => {
  if (status === 'terlambat') return 'Terlambat'
  if (status === 'dikembalikan') return 'Dikembalikan'
  return 'Dipinjam'
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant:wght@700&family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

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

.title-cek {
  font-family: 'Cormorant', serif;
  font-size: 1.75rem;
}

.form-subtitle {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
}

.cek-card {
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
  max-width: 520px;
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

.cek-input {
  padding: 0.65rem 1rem 0.65rem 2.6rem;
  border-radius: 30px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
}

.cek-input:focus {
  border-color: #0b1e3f;
  box-shadow: 0 0 0 0.25rem rgba(11, 30, 63, 0.15);
}

.btn-navy-action {
  background-color: #0b1e3f;
  color: #ffffff;
  font-weight: 600;
  border: none;
  transition: all 0.3s ease;
}

.btn-navy-action:hover:not(:disabled) {
  background-color: #5f4604;
  color: #ffffff;
}

.btn-navy-action:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.hasil-item {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}

.status-badge {
  font-size: 0.8rem;
}
</style>
