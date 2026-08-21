<template>
  <div class="container book-detail-container my-3 my-md-5">
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
      <router-link to="/katalog" class="btn btn-navy-action px-4 py-2 mt-2">
        Kembali ke Katalog
      </router-link>
    </div>

    <!-- Content State -->
    <template v-else>
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb" class="mb-3 mb-md-4">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item">
            <router-link to="/katalog" class="text-muted text-decoration-none">Katalog Buku</router-link>
          </li>
          <li class="breadcrumb-item active text-navy font-display text-truncate" aria-current="page">
            {{ buku.judul_buku }}
          </li>
        </ol>
      </nav>

      <!-- Main Detail Section -->
      <div class="row g-4 mb-4 mb-md-5">
        <!-- Cover Gambar -->
        <div class="col-12 col-md-5 col-lg-4 text-center">
          <div class="detail-cover-wrapper">
            <img :src="buku.image_url || defaultCover" :alt="buku.judul_buku"
              class="img-fluid detail-cover-img" />
          </div>
        </div>

        <!-- Detail Informasi Buku -->
        <div class="col-12 col-md-7 col-lg-8 d-flex flex-column justify-content-between">
          <div class="book-info-header text-start">
            <span class="badge bg-navy px-3 py-2 mb-2">{{ buku.nama_category || 'Tanpa Kategori' }}</span>
            <h1 class="book-detail-title font-display">{{ buku.judul_buku }}</h1>
            <p class="book-detail-author">
              Penulis: <strong>{{ buku.pengarang || 'Penulis belum tersedia' }}</strong>
            </p>
          </div>

          <hr class="my-3 my-md-4 text-muted opacity-25">

          <!-- Information Grid -->
          <div class="row g-3 g-md-4">
            <div class="col-6">
              <div class="info-label text-uppercase text-muted">Penerbit</div>
              <div class="info-value text-truncate">{{ buku.penerbit || '-' }}</div>
            </div>
            <div class="col-6">
              <div class="info-label text-uppercase text-muted">Tahun Terbit</div>
              <div class="info-value">{{ buku.tahun_terbit || '-' }}</div>
            </div>
            <div class="col-6">
              <div class="info-label text-uppercase text-muted">Lokasi Rak</div>
              <div class="info-value text-truncate">{{ buku.nama_rak || '-' }}</div>
            </div>
            <div class="col-6">
              <div class="info-label text-uppercase text-muted">Section</div>
              <div class="info-value text-truncate">{{ buku.nama_section || '-' }}</div>
            </div>
          </div>

          <hr class="my-3 my-md-4 text-muted opacity-25">

          <!-- Status & Pinjam Button -->
          <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3">
            <div class="status-indicator d-flex align-items-center gap-2 fw-semibold"
              :class="buku.status_buku === 'Tersedia' ? 'text-success' : 'text-danger'">
              <span class="dot-status"
                :class="buku.status_buku === 'Tersedia' ? 'bg-success' : 'bg-danger'"></span>
              {{ buku.status_buku || 'Tersedia' }}
            </div>
            <button class="btn btn-navy-action w-100 w-sm-auto px-4 py-2 rounded-pill shadow-sm"
              @click="router.push({ name: 'peminjaman-form', params: { id: buku.id_buku } })">
              Pinjam Buku
            </button>
          </div>
        </div>
      </div>

      <!-- Rekomendasi Buku Kategori Serupa -->
      <div v-if="rekomendasiBuku.length > 0" class="recommendation-section mt-4 mt-md-5 pt-4">
        <h3 class="section-title font-display text-navy mb-1">Rekomendasi Buku</h3>
        <p class="text-muted small mb-3 mb-md-4">
          Temukan buku lain dengan topik dan pembahasan yang serupa.
        </p>

        <div class="row g-3 g-md-4">
          <div v-for="item in rekomendasiBuku" :key="item.id_buku" class="col-6 col-md-4 col-lg-3">
            <div class="card card-recommendation h-100 shadow-sm border-0 clickable-card"
              @click="goToDetail(item.id_buku)">
              <div class="card-img-wrapper position-relative">
                <span class="badge bg-navy position-absolute top-0 start-0 m-2 m-md-3 btn-sm text-truncate max-w-75">
                  {{ item.nama_category || 'Tanpa Kategori' }}
                </span>
                <img :src="item.image_url || defaultCover" class="card-img-top" :alt="item.judul_buku">
              </div>

              <!-- Body Kartu -->
              <div class="card-body d-flex flex-column justify-content-between p-2 p-md-3">
                <div>
                  <!-- Header Judul + Status Rata Kanan -->
                  <div class="d-flex justify-content-between align-items-start gap-1 mb-1">
                    <h5 class="card-title font-display mb-0 text-book-title" :title="item.judul_buku">
                      {{ item.judul_buku }}
                    </h5>
                    <span class="small fw-semibold d-inline-flex align-items-center gap-1 status-badge-right"
                      :class="item.status_buku === 'Tersedia' ? 'text-success' : 'text-danger'">
                      <span class="dot-status-sm"
                        :class="item.status_buku === 'Tersedia' ? 'bg-success' : 'bg-danger'"></span>
                      <span class="d-none d-sm-inline">{{ item.status_buku }}</span>
                    </span>
                  </div>
                  <p class="card-author text-muted mb-1">
                    {{ item.pengarang || 'Penulis belum tersedia' }}
                  </p>
                  <p class="card-year text-muted mb-2 mb-md-3">
                    {{ item.tahun_terbit || '-' }}
                  </p>
                </div>

                <!-- Tombol Aksi -->
                <button class="btn btn-outline-navy w-100 py-1 py-md-2">Lihat Buku</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBukuById, getBukuRekomendasi } from '../services/bookService'
import defaultCover from '@/assets/images/Logo_Ma.png'

const route = useRoute()
const router = useRouter()

const buku = ref(null)
const rekomendasiBuku = ref([])
const loading = ref(true)

const loadData = async () => {
  loading.value = true
  rekomendasiBuku.value = []
  try {
    const idParam = route.params.id

    const [bukuResult, rekoResult] = await Promise.allSettled([
      getBukuById(idParam),
      getBukuRekomendasi(idParam)
    ])

    buku.value = bukuResult.status === 'fulfilled' ? bukuResult.value.data : null

    if (bukuResult.status === 'rejected') {
      console.error('Gagal memuat detail buku:', bukuResult.reason)
    }
    if (rekoResult.status === 'fulfilled' && Array.isArray(rekoResult.value.data)) {
      rekomendasiBuku.value = rekoResult.value.data.slice(0, 4)
    } else if (rekoResult.status === 'rejected') {
      console.error('Gagal memuat rekomendasi buku:', rekoResult.reason)
    }
  } finally {
    loading.value = false
  }
}

const goToDetail = (id) => {
  router.push({
    name: 'book-detail',
    params: { id }
  })
}

onMounted(() => {
  loadData()
})

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

/* --- Detail Cover Wrapper --- */
.detail-cover-wrapper {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  overflow: hidden;
  background-color: #f8fafc;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

.detail-cover-img {
  width: 100%;
  height: 380px;
  object-fit: cover;
  background-color: #e2e8f0;
  border-radius: 12px;
  padding: 4px;
}

/* --- Typography Detail --- */
.book-detail-title {
  color: #0b1e3f;
  font-weight: 700;
  font-size: 1.6rem;
  margin-top: 6px;
  line-height: 1.3;
}

.book-detail-author {
  font-size: 0.95rem;
  color: #333;
}

.info-label {
  font-size: 0.7rem;
  letter-spacing: 0.8px;
  font-weight: 600;
  margin-bottom: 2px;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a1a1a;
}

.dot-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
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

/* --- Recommendation Cards --- */
.recommendation-section {
  border-top: 1px solid #e2e8f0;
}

.card-recommendation {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background-color: #ffffff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid #e2e8f0 !important;
}

.card-recommendation:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08) !important;
}

.card-recommendation .card-img-wrapper {
  position: relative;
  width: 100%;
  height: 240px;
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

.max-w-75 {
  max-width: 75%;
}

.text-book-title {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
  color: #0f172a;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  min-height: 2.6em;
}

.status-badge-right {
  white-space: nowrap;
  font-size: 0.75rem;
  padding-top: 2px;
}

.card-author {
  font-size: 0.78rem;
  margin-bottom: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-year {
  font-size: 0.75rem;
}

.dot-status-sm {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.btn-outline-navy {
  border: 1.5px solid #0b1e3f !important;
  color: #0b1e3f !important;
  background-color: transparent !important;
  border-radius: 30px !important;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-outline-navy:hover {
  background-color: #0b1e3f !important;
  color: #ffffff !important;
}

/* ==========================================
   MEDIA QUERIES (RESPONSIVE BREAKPOINTS)
   ========================================== */

/* Tablet (>= 768px) */
@media (min-width: 768px) {
  .book-detail-title {
    font-size: 2rem;
  }
  .book-detail-author {
    font-size: 1.05rem;
  }
  .info-label {
    font-size: 0.75rem;
  }
  .info-value {
    font-size: 1.1rem;
  }
  .detail-cover-img {
    height: 400px;
  }
  .card-recommendation .card-img-wrapper {
    height: 300px;
  }
  .text-book-title {
    font-size: 0.92rem;
  }
  .card-author {
    font-size: 0.82rem;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
  .btn-outline-navy {
    font-size: 0.85rem;
  }
}

/* Desktop (>= 992px) */
@media (min-width: 992px) {
  .book-detail-title {
    font-size: 2.25rem;
  }
  .card-recommendation .card-img-wrapper {
    height: 340px;
  }
}
</style>