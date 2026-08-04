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

      <div class="cat-head container d-flex justify-content-center flex-column align-items-center mb-4">
        <div class="container d-flex justify-content-center align-items-center">
          <hr class="flex-grow-1 my-auto opacity-100 h-2" style="border-color: #D4AD65; opacity: 1; border-width: 2px;">
          <span class="px-4 fs-1 text-dark fw-bold title-peminjaman">Formulir Peminjaman Buku</span>
          <hr class="flex-grow-1 my-auto opacity-100" style="border-color: #D4AD65; opacity: 1; border-width: 2px;">
        </div>
        <h2 style="font-size: 20px; margin-top: 15px; font-family: 'Plus Jakarta Sans', sans-serif;">Lengkapi data berikut untuk mengajukan peminjaman buku.</h2>
      </div>
      

      <div class="peminjaman-card">
        <div class="row g-4">
          <div class="col-8 col-md-4 pe-md-4">
            <div class="section-header mb-3">
              <h5 class="section-label font-display text-navy mb-2 fw-semibold">Informasi Buku</h5>
              <div class="gold-line"></div>
            </div>
            <div class="p-4 rounded-4 bg-light-subtle border border-2 border-dark  border-primary-custom">
              <div class="book-info-card justify-content-center d-flex flex-column align-items-center mb-3">
                <div class="book-info-cover-wrapper mb-3">
                  <img 
                    :src="buku.image_url || defaultCover" 
                    :alt="buku.judul_buku" 
                    class="book-info-cover img-fluid rounded-3 shadow-sm"/>
                </div>
              </div>
              <h5 class="font-display fw-bold text-navy mb-1">{{ buku.judul_buku }}</h5>
              <p class="text-muted small mb-3">{{ buku.pengarang || 'Penulis belum tersedia' }}</p>
              <div class="d-flex align-items-center gap-3 flex-wrap">
                <span class="badge bg-navy px-3 py-2 rounded-pill fw-normal">
                  {{ buku.nama_category || 'Tanpa Kategori' }}
                </span>
  
                <span 
                  class="status-indicator d-flex align-items-center gap-2 fw-medium"
                  :class="buku.status_buku === 'Tersedia' ? 'text-success' : 'text-danger'">
                  <span 
                    class="dot-status"
                    :class="buku.status_buku === 'Tersedia' ? 'bg-success' : 'bg-danger'"
                  ></span>
                  {{ buku.status_buku || 'Tersedia' }}
                </span>
              </div>
            </div>
        </div>

          <!-- Data Peminjam -->
          <div class="col-14 col-md-8">
            <h5 class="section-label font-display text-navy mb-3">Data Peminjam</h5>

            <!-- Sukses -->
            <div v-if="berhasil" class="text-center py-4">
              <i class="bi bi-check-circle-fill text-success display-4 mb-3"></i>
              <h5 class="font-display text-navy">Peminjaman Berhasil Diajukan</h5>
              <p class="text-muted mb-1">{{ berhasil.judul_buku }}</p>
              <p class="text-muted small">Batas pengembalian: <strong>{{ formatDueDate(berhasil.due_date) }}</strong></p>
              <button class="btn btn-navy-action px-4 py-2 rounded-pill mt-3" @click="kembaliKeDetail">
                Kembali ke Detail Buku
              </button>
            </div>

            <!-- Form -->
            <form v-else id="peminjaman-form" @submit.prevent="submitForm">
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

            </form>
            <div v-if="!berhasil" class="d-flex gap-3 mt-5">
              <button type="button" class="btn btn-outline-navy px-4 py-2 rounded-pill" @click="kembaliKeDetail">
                Kembali
              </button>
              <button type="submit" form="peminjaman-form" class="btn btn-navy-action px-4 py-2 rounded-pill flex-grow-1"
                :disabled="submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ submitting ? 'Mengirim...' : 'Ajukan Peminjaman' }}
              </button>
            </div>
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
  @import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300..700;1,300..700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300..700;1,300..700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');

  .text-navy {
    color: #0b1e3f !important;
  }

  .title-peminjaman{
    font-size: 2rem;
    font-family: 'Cormorant', serif;
    font-weight: 700;
  }

  .cat-head h2{
    font-family: '"Plus Jakarta Sans", sans-serif';
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
