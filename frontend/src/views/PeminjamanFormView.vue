<template>
  <div class="container peminjaman-container my-4 my-md-5">
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
      <router-link to="/katalog" class="btn btn-navy-action px-4 py-2 mt-2">
        Kembali ke Katalog
      </router-link>
    </div>

    <!-- Content State -->
    <template v-else>
      <nav aria-label="breadcrumb" class="mb-4">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item d-none d-sm-inline-block">
            <router-link to="/katalog" class="text-muted text-decoration-none">Katalog Buku</router-link>
          </li>
          <li class="breadcrumb-item">
            <router-link :to="{ name: 'book-detail', params: { id: buku.id_buku } }"
              class="text-muted text-decoration-none text-truncate d-inline-block align-middle" style="max-width: 150px;">
              Informasi Buku
            </router-link>
          </li>
          <li class="breadcrumb-item active text-navy font-display" aria-current="page">
            Peminjaman
          </li>
        </ol>
      </nav>

      <div class="cat-head container d-flex justify-content-center flex-column align-items-center mb-4 px-0">
        <div class="w-100 d-flex justify-content-center align-items-center gap-2 gap-md-3">
          <hr class="flex-grow-1 my-auto opacity-100 d-none d-sm-block" style="border-color: #D4AD65; border-width: 2px;">
          <h1 class="px-2 px-md-4 text-dark fw-bold title-peminjaman m-0 text-center">Formulir Peminjaman</h1>
          <hr class="flex-grow-1 my-auto opacity-100 d-none d-sm-block" style="border-color: #D4AD65; border-width: 2px;">
        </div>
        <h2 class="form-subtitle text-muted text-center mt-3 mb-0">
          Lengkapi data berikut untuk mengajukan peminjaman buku.
        </h2>
      </div>

      <div class="peminjaman-card p-3 p-md-4 p-lg-5">
        <div class="row g-4 g-lg-5">
          <!-- Informasi Buku -->
          <div class="col-12 col-lg-4 border-end-lg pe-lg-4">
            <div class="section-header mb-3">
              <h5 class="section-label font-display text-navy mb-2 fw-semibold">Informasi Buku</h5>
            </div>
            <div class="p-3 p-md-4 rounded-4 bg-light-subtle border border-2 border-primary-custom text-center text-sm-start text-lg-center">
              <div class="d-flex flex-column flex-sm-row flex-lg-column align-items-center gap-3 gap-lg-0">
                
                <div class="book-info-cover-wrapper mb-lg-3 flex-shrink-0">
                  <img :src="buku.image_url || defaultCover" :alt="buku.judul_buku" 
                    class="book-info-cover img-fluid rounded-3 shadow-sm"/>
                </div>
                
                <div class="flex-grow-1 text-center text-sm-start text-lg-center">
                  <h5 class="font-display fw-bold text-navy mb-1">{{ buku.judul_buku }}</h5>
                  <p class="text-muted small mb-3">{{ buku.pengarang || 'Penulis belum tersedia' }}</p>
                  
                  <div class="d-flex justify-content-center justify-content-sm-start justify-content-lg-center align-items-center gap-2 flex-wrap">
                    <span class="badge bg-navy px-3 py-2 rounded-pill fw-normal">
                      {{ buku.nama_category || 'Tanpa Kategori' }}
                    </span>
                    <span class="status-indicator d-flex align-items-center gap-1 fw-medium"
                      :class="buku.status_buku === 'Tersedia' ? 'text-success' : 'text-danger'">
                      <span class="dot-status" :class="buku.status_buku === 'Tersedia' ? 'bg-success' : 'bg-danger'"></span>
                      {{ buku.status_buku || 'Tersedia' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Peminjam -->
          <div class="col-12 col-lg-8">
            <h5 class="section-label font-display text-navy mb-3 mb-md-4">Data Peminjam</h5>

            <!-- Sukses -->
            <div v-if="berhasil" class="text-center py-4 py-md-5">
              <i class="bi bi-check-circle-fill text-success display-3 mb-3"></i>
              <h4 class="font-display text-navy mb-2">Peminjaman Berhasil Diajukan</h4>
              <p class="text-muted mb-1">{{ berhasil.judul_buku }}</p>
              <p class="text-muted small mb-4">Batas pengembalian: <strong>{{ formatDueDate(berhasil.due_date) }}</strong></p>
              <div class="d-flex flex-column flex-sm-row justify-content-center gap-2 gap-sm-3">
                <button class="btn btn-navy-action w-100 w-sm-auto px-4 py-2 rounded-pill" @click="kembaliKeDetail">
                  Kembali ke Detail Buku
                </button>
                <router-link :to="{ name: 'cek-peminjaman' }" class="btn btn-outline-navy w-100 w-sm-auto px-4 py-2 rounded-pill">
                  Cek Status Peminjaman
                </router-link>
              </div>
            </div>

            <!-- Form -->
            <form v-else id="peminjaman-form" @submit.prevent="submitForm" novalidate>
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
                  <input id="no_telpon" v-model="noTelpon" type="tel"
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
              <p class="warning-text small mb-4">
                *Masa peminjaman maksimal 7 hari. Pengembalian yang terlambat dapat dikenakan
                ketentuan sesuai kebijakan perpustakaan.
              </p>

              <div class="info-box d-flex align-items-start gap-3 mb-4">
                <i class="bi bi-exclamation-circle fs-5 mt-1"></i>
                <span class="lh-sm">Pastikan data yang Anda masukkan sudah benar. Petugas perpustakaan akan
                  menghubungi Anda melalui nomor kontak yang terdaftar untuk proses peminjaman.</span>
              </div>

              <div class="form-check mb-4">
                <input id="pernyataan_tanggung_jawab" v-model="pernyataanDisetujui" type="checkbox"
                  class="form-check-input">
                <label class="form-check-label small" for="pernyataan_tanggung_jawab">
                  Saya menyatakan data ini benar dan bertanggung jawab mengembalikan buku tepat waktu.
                </label>
              </div>

              <div v-if="pesanError" class="alert alert-danger py-2 small fw-medium">{{ pesanError }}</div>
            </form>

            <div v-if="!berhasil" class="d-flex flex-column-reverse flex-sm-row gap-2 gap-sm-3 mt-4 mt-md-5 pt-2">
              <button type="button" class="btn btn-outline-navy w-100 w-sm-auto px-4 py-2 rounded-pill" @click="kembaliKeDetail">
                Batal & Kembali
              </button>
              <button type="submit" form="peminjaman-form" class="btn btn-navy-action w-100 flex-sm-grow-1 px-4 py-2 rounded-pill"
                :disabled="submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ submitting ? 'Mengirim Data...' : 'Ajukan Peminjaman' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBukuById } from '../services/bookService'
import { ajukanPeminjaman } from '../services/loanService'
import defaultCover from '@/assets/images/Logo_Ma.png'

const route = useRoute()
const router = useRouter()

const buku = ref(null)
const loading = ref(true)

const namaPeminjam = ref('')
const noTelpon = ref('')
const durasiHari = ref('')
const pernyataanDisetujui = ref(false)

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
  router.push({ name: 'book-detail', params: { id: route.params.id } })
}

const formatDueDate = (rawDueDate) => {
  if (!rawDueDate) return '-'
  const tanggal = new Date(rawDueDate)
  if (Number.isNaN(tanggal.getTime())) return rawDueDate || '-'

  return tanggal.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  })
}

const submitForm = async () => {
  pesanError.value = ''

  if (!namaPeminjam.value.trim() || !noTelpon.value.trim() || !durasiHari.value) {
    pesanError.value = 'Nama, nomor kontak, dan durasi peminjaman wajib diisi'
    return
  }

  if (!pernyataanDisetujui.value) {
    pesanError.value = 'Anda harus menyetujui pernyataan tanggung jawab sebelum mengajukan peminjaman'
    return
  }

  submitting.value = true
  try {
    const response = await ajukanPeminjaman({
      id_detail: Number(route.params.id),
      nama_peminjam: namaPeminjam.value.trim(),
      no_telpon: noTelpon.value.trim(),
      durasi_hari: Number(durasiHari.value),
      konfirmasi_tanggung_jawab: pernyataanDisetujui.value
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

.title-peminjaman {
  font-family: 'Cormorant', serif;
  font-size: 1.75rem;
}

.form-subtitle {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
}

.peminjaman-card {
  background-color: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

.section-label {
  border-bottom: 2px solid #d4ad65;
  padding-bottom: 0.5rem;
  display: inline-block;
}

.border-primary-custom {
  border-color: #e2e8f0 !important;
}

.book-info-cover-wrapper {
  width: 100%;
  max-width: 140px; /* Diperkecil untuk mobile */
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
}

.book-info-cover {
  width: 100%;
  height: 200px;
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
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
}

.peminjaman-input:focus {
  border-color: #0b1e3f;
  box-shadow: 0 0 0 0.25rem rgba(11, 30, 63, 0.15);
}

.warning-text {
  color: #c1571f;
  line-height: 1.4;
}

.info-box {
  background-color: #f8fafc;
  border-radius: 12px;
  padding: 1rem;
  font-size: 0.85rem;
  color: #475569;
  border: 1px solid #e2e8f0;
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

.btn-outline-navy {
  border: 1.5px solid #0b1e3f;
  color: #0b1e3f;
  background-color: transparent;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-outline-navy:hover {
  background-color: #0b1e3f;
  color: #ffffff;
}

.w-sm-auto {
  width: auto !important;
}

/* RESPONSIVE MEDIA QUERIES */

@media (min-width: 576px) {
  .title-peminjaman {
    font-size: 2.25rem;
  }
  .form-subtitle {
    font-size: 1.1rem;
  }
  .book-info-cover-wrapper {
    max-width: 160px;
  }
  .book-info-cover {
    height: 220px;
  }
}

@media (min-width: 992px) {
  .border-end-lg {
    border-right: 1px solid #e2e8f0;
  }
  .book-info-cover-wrapper {
    max-width: 220px;
  }
  .book-info-cover {
    height: 280px;
  }
}
</style>