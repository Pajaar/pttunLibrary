<template>
  <div class="container book-detail-container my-5">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-navy" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">Memuat detail buku...</p>
    </div>

    <!-- Error / Not Found State -->
    <div v-else-if="!buku" class="text-center py-5">
      <h3 class="text-navy">Buku Tidak Ditemukan</h3>
      <p class="text-muted">Data buku tidak tersedia atau telah dihapus.</p>
      <router-link to="/" class="btn btn-navy-action px-4 py-2 mt-2">Kembali ke Katalog
      </router-link>
    </div>

    <!-- Content State -->
    <template v-else>
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb" class="mb-4">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <router-link to="/katalog" class="text-muted text-decoration-none">Katalog Buku</router-link>
          </li>
          <li class="breadcrumb-item active text-navy font-display" aria-current="page">
            {{ buku.judul_buku }}
          </li>
        </ol>
      </nav>

      <!-- Main Detail Section -->
      <div class="row g-4 mb-5">
        <!-- Cover Gambar -->
        <div class="col-12 col-md-4 text-center text-md-start">
          <div class="detail-cover-wrapper">
            <img :src="buku.image_url || defaultCover" :alt="buku.judul_buku" class="img-fluid detail-cover-img" />
          </div>
        </div>

        <!-- Detail Informasi Buku -->
        <div class="col-12 col-md-8 d-flex flex-column justify-content-between">
          <div class="book-info-header">
            <span
              class="badge bg-navy px-3 py-2 mb-2">{{ buku.nama_category || 'Tanpa Kategori' }}</span>
            <h1 class="book-detail-title font-display">{{ buku.judul_buku }}</h1>
            <p class="book-detail-author">Penulis:
              <strong>{{ buku.pengarang || 'Penulis belum tersedia' }}</strong></p>
          </div>

          <hr class="my-4 text-muted opacity-25">

          <!-- Information Grid -->
          <div class="row g-4">
            <div class="col-6 col-sm-6 col-md-6">
              <div class="info-label text-uppercase text-muted">Penerbit</div>
              <div class="info-value">{{ buku.penerbit || '-' }}</div>
            </div>
            <div class="col-6 col-sm-6 col-md-6">
              <div class="info-label text-uppercase text-muted">Tahun Terbit</div>
              <div class="info-value">{{ buku.tahun_terbit || '-' }}</div>
            </div>
            <div class="col-6 col-sm-6 col-md-6">
              <div class="info-label text-uppercase text-muted">Lokasi Rak</div>
              <div class="info-value">{{ buku.nama_rak || '-' }}</div>
            </div>
            <div class="col-6 col-sm-6 col-md-6">
              <div class="info-label text-uppercase text-muted">Section</div>
              <div class="info-value">{{ buku.nama_section || '-' }}</div>
            </div>
          </div>

          <hr class="my-4 text-muted opacity-25">

          <!-- Status & Pinjam Button -->
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div class="status-indicator d-flex align-items-center gap-2 fw-semibold"
              :class="buku.status_buku === 'Tersedia' ? 'text-success' : 'text-danger'">
              <span class="dot-status" :class="buku.status_buku === 'Tersedia' ? 'bg-success' : 'bg-danger'"></span>
              {{ buku.status_buku || 'Tersedia' }}
            </div>
            <button class="btn btn-navy-action px-4 py-2 rounded-pill shadow-sm">Pinjam
              Buku</button>
          </div>
        </div>
      </div>

      <!-- Rekomendasi Buku Kategori Serupa -->
      <div v-if="rekomendasiBuku.length > 0" class="recommendation-section mt-5 pt-4">
        <h3 class="section-title font-display text-navy mb-1">Rekomendasi Buku</h3>
        <p class="text-muted small mb-4">Temukan buku lain dengan pembahasan yang serupa.</p>

        <div class="row g-4">
          <div v-for="item in rekomendasiBuku" :key="item.id_buku" class="col-12 col-sm-6 col-md-4">
            <div class="card card-recommendation h-100 shadow-sm border-0 clickable-card"
              @click="goToDetail(item.id_buku)">
              <div class="card-img-wrapper position-relative">
                <span class="badge bg-navy position-absolute top-0 start-0 m-3 btn-sm">
                  {{ item.nama_category || 'Tanpa Kategori' }}
                </span>
                <img :src="item.image_url || defaultCover" class="card-img-top"
                  :alt="item.judul_buku">
              </div>

              <!-- Body Kartu -->
              <div class="card-body d-flex flex-column justify-content-between p-3">
                <div>
                  <!-- Header Judul + Status Rata Kanan -->
                  <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                    <!-- Judul Buku (Max 2 Baris) -->
                    <h5 class="card-title font-display mb-0 text-book-title"
                      :title="item.judul_buku">
                      {{ item.judul_buku }}
                    </h5>

                    <!-- Status Buku di Sebelah Kanan -->
                    <span
                      class="small fw-semibold d-inline-flex align-items-center gap-1 status-badge-right"
                      :class="item.status_buku === 'Tersedia' ? 'text-success' : 'text-danger'">
                      <span class="dot-status-sm"
                        :class="item.status_buku === 'Tersedia' ? 'bg-success' : 'bg-danger'"></span>
                      {{ item.status_buku }}
                    </span>
                  </div>
                  <p class="card-author text-muted mb-1">
                    {{ item.pengarang || 'Penulis belum tersedia' }}
                  </p>
                  <p class="card-year text-muted mb-3">
                    {{ item.tahun_terbit || '-' }}
                  </p>
                </div>

                <!-- Tombol Aksi -->
                <button class="btn btn-outline-navy w-100 py-2">Lihat Buku</button>
              </div>
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
    onMounted,
    watch
  } from 'vue'
  import {
    useRoute,
    useRouter
  } from 'vue-router'
  import {
    getBuku
  } from '../services/bookService'
  import defaultCover from '@/assets/images/Logo_Ma.png'

  const route = useRoute()
  const router = useRouter()

  const buku = ref(null)
  const rekomendasiBuku = ref([])
  const loading = ref(true)

  const loadData = async () => {
    loading.value = true
    try {
      const idParam = route.params.id

      // Memanggil getBuku() seperti halnya pada CatalogView
      const response = await getBuku()
      const allBuku = Array.isArray(response.data) ? response.data : []

      // Mencari buku spesifik berdasarkan id_buku dari URL
      buku.value = allBuku.find(item => String(item.id_buku) === String(idParam)) || null

      // Menyiapkan rekomendasi (kategori sama, ID berbeda)
      if (buku.value) {
        rekomendasiBuku.value = allBuku
          .filter(item =>
            String(item.id_buku) !== String(idParam) &&
            item.nama_category === buku.value.nama_category
          )
          .slice(0, 3)
      }
    } catch (err) {
      console.error('Gagal memuat detail buku:', err)
      buku.value = null
    } finally {
      loading.value = false
    }
  }

  const goToDetail = (id) => {
    router.push({
      name: 'book-detail',
      params: {
        id
      }
    })
  }

  onMounted(() => {
    loadData()
  })

  // Watcher agar navigasi antar rekomendasi buku berjalan lancar
  watch(
    () => route.params.id,
    (newId) => {
      if (newId) {
        loadData()
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
    }
  )

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

  .clickable-card {
    cursor: pointer;
  }

  .detail-cover-wrapper {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border-radius: 12px;
    overflow: hidden;
    display: inline-block;
    background-color: #f8fafc;
    width: 100%;
    max-width: 320px;
  }

  .detail-cover-img {
    width: 100%;
    height: 420px;
    object-fit: cover;
    background-color: #e2e8f0;
    border-radius: 12px;
    padding: 4px;
  }

  .book-detail-title {
    color: #0b1e3f;
    font-weight: 700;
    font-size: 2.25rem;
    margin-top: 10px;
  }

  .book-detail-author {
    font-size: 1.1rem;
    color: #333;
  }

  .info-label {
    font-size: 0.75rem;
    letter-spacing: 1px;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .info-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1a1a1a;
  }

  .dot-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }

  .dot-status-sm {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
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

  .recommendation-section {
    border-top: 1px solid #e2e8f0;
  }

  .recommendation-col {
    width: 100%;
    max-width: 260px;
    flex: 0 0 auto;
  }

  .card-recommendation {
    border-radius: 16px;
    overflow: hidden;
    background-color: #ffffff;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border: 1px solid #e2e8f0 !important;
  }

  .card-recommendation:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08) !important;
  }

  .card-recommendation .card-img-wrapper {
    position: relative;
    width: 100%;
    height: 390px;
    background-color: #f8fafc;
    overflow: hidden;
  }

  .card-recommendation img.card-img-top {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .text-book-title {
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.35;
    color: #0f172a;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
    min-height: 2.7em;
  }

  /* Status Buku di Sebelah Kanan */
  .status-badge-right {
    white-space: nowrap;
    font-size: 0.8rem;
    padding-top: 2px;
  }

  /* Penulis & Tahun */
  .card-author {
    font-size: 0.825rem;
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
    min-height: 2.7em;
  }

  .card-year {
    font-size: 0.8rem;
  }

  /* Indikator Titik Status */
  .dot-status-sm {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .clickable-card {
    cursor: pointer;
  }

  .btn-outline-navy {
    border: 1.5px solid #0b1e3f !important;
    color: #0b1e3f !important;
    background-color: transparent !important;
    border-radius: 30px !important;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 10px 0 !important;
    width: 100%;
    transition: all 0.3s ease;
  }

  .btn-outline-navy:hover {
    background-color: #0b1e3f !important;
    color: #ffffff !important;
  }

</style>
