<script setup>
  import {
    ref,
    computed,
    watch,
    onMounted
  } from 'vue'
  import {
    useRoute,
    useRouter
  } from 'vue-router'
  import {
    getBuku,
    getCategories
  } from '../services/bookService'
  import defaultCover from '@/assets/images/Logo_Ma.png'

  const route = useRoute()
  const router = useRouter()

  const daftarBuku = ref([])
  const sedangMemuat = ref(true)
  const pesanError = ref('')

  // Inisialisasi variabel filter membaca Query Parameter URL (agar ingat saat ditekan tombol BACK)
  const searchQuery = ref((route.query.q) || '')
  const selectedCategories = ref(
    route.query.category ?
    (Array.isArray(route.query.category) ? route.query.category : [route.query.category]) :
    []
  )
  const selectedStatus = ref((route.query.status) || '')
  const selectedRak = ref((route.query.rak) || '')
  const selectedYear = ref((route.query.year) || '')
  const sortBy = ref((route.query.sort) || 'relevan')
  const currentPage = ref(Number(route.query.page) || 1)

  const kategoriOptions = ref([])

  onMounted(async () => {
    try {
      const response = await getBuku()
      daftarBuku.value = Array.isArray(response.data) ? response.data : []
    } catch (error) {
      pesanError.value = error.message || 'Data buku belum bisa dimuat'
    } finally {
      sedangMemuat.value = false
    }

    try {
      const response = await getCategories()
      const categories = Array.isArray(response.data) ? response.data : []
      kategoriOptions.value = categories
        .map((category) => category.nama_category)
        .filter((nama) => !!nama)
    } catch (error) {
      console.error('Gagal memuat daftar kategori', error)
    }
  })

  function uniqueSorted(list, key) {
    const values = list
      .map((item) => item[key])
      .filter((value) => value !== null && value !== undefined && value !== '')
    return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)))
  }

  const statusOptions = computed(() => uniqueSorted(daftarBuku.value, 'status_buku'))
  const rakOptions = computed(() => uniqueSorted(daftarBuku.value, 'nama_rak'))
  const tahunOptions = computed(() =>
    uniqueSorted(daftarBuku.value, 'tahun_terbit').sort((a, b) => b - a)
  )

  const filteredBuku = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    return daftarBuku.value.filter((buku) => {
      const matchesSearch = !query || [buku.judul_buku, buku.pengarang, buku.penerbit].some(
        (field) => (field || '').toLowerCase().includes(query)
      )

      const matchesCategory =
        selectedCategories.value.length === 0 ||
        selectedCategories.value.includes(buku.nama_category)
      const matchesStatus = !selectedStatus.value || buku.status_buku === selectedStatus
        .value
      const matchesRak = !selectedRak.value || buku.nama_rak === selectedRak.value
      const matchesYear = !selectedYear.value || String(buku.tahun_terbit) === String(
        selectedYear.value)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesRak &&
        matchesYear
      )
    })
  })

  function resetKategori() {
    selectedCategories.value = []
  }

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

  const BOOKS_PER_PAGE = 9

  const totalPages = computed(() => Math.ceil(sortedBuku.value.length / BOOKS_PER_PAGE))

  const pagedBuku = computed(() => {
    const start = (currentPage.value - 1) * BOOKS_PER_PAGE
    return sortedBuku.value.slice(start, start + BOOKS_PER_PAGE)
  })

  const pageNumbers = computed(() => {
    const total = totalPages.value
    const current = currentPage.value

    if (total <= 1) return []
    if (total <= 7) {
      return Array.from({
        length: total
      }, (_, i) => i + 1)
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

  // Fungsi untuk sinkronisasi seluruh state filter ke Query String URL
  const updateQueryParams = () => {
    const query = {}

    if (searchQuery.value) query.q = searchQuery.value
    if (selectedCategories.value.length) query.category = selectedCategories.value
    if (selectedStatus.value) query.status = selectedStatus.value
    if (selectedRak.value) query.rak = selectedRak.value
    if (selectedYear.value) query.year = selectedYear.value
    if (sortBy.value !== 'relevan') query.sort = sortBy.value
    if (currentPage.value > 1) query.page = currentPage.value

    router.replace({
      query
    })
  }

  // Watcher untuk memantau perubahan filter dan memperbarui URL
  watch(
    [searchQuery, selectedCategories, selectedStatus, selectedRak, selectedYear, sortBy,
      currentPage
    ],
    () => {
      updateQueryParams()
    }, {
      deep: true
    }
  )

  // Saat hasil pencarian/filter berubah, kembalikan ke halaman 1 jika nomor halaman melebihi total halaman baru
  watch(sortedBuku, () => {
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = 1
    }
  })

  function goToPage(page) {
    if (page < 1 || page > totalPages.value || page === currentPage.value) return
    currentPage.value = page
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  function prevPage() {
    goToPage(currentPage.value - 1)
  }

  function nextPage() {
    goToPage(currentPage.value + 1)
  }

  const goToDetail = (id) => {
    router.push({
      name: 'book-detail',
      params: {
        id
      }
    })
  }

</script>

<template>
  <div class="catalog-page container-fluid">
    <div class="cat-head container d-flex justify-content-center align-items-center">
      <hr class="flex-grow-1 my-auto opacity-100 h-2" style="border-color: #D4AD65; opacity: 1;">
      <span class="px-3 fs-1 text-dark fw-bold title-katalog">Katalog Buku</span>
      <hr class="flex-grow-1 my-auto opacity-100" style="border-color: #D4AD65; opacity: 1;">
    </div>
    <span class="text-center fs-5 d-flex justify-content-center">
      Temukan koleksi buku hukum, peraturan, dan referensi yang tersedia di <br> Perpustakaan PTTUN
      Jakarta
    </span>
    <div class="container my-4">
      <div class="search-container">
        <div class="search-input-wrapper">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            class="form-control search-input"
            placeholder="Cari berdasarkan judul buku, pengarang, atau penerbit..."
            v-model="searchQuery">
        </div>
        <button class="search-button" type="button"> Cari Buku </button>
      </div>
    </div>
    <div class="container my-5">
      <div class="row g-4">
        <!-- Sidebar Filter -->
        <div class="col-lg-3">
          <div class="filter-box">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0">Kategori</h6>
              <button v-if="selectedCategories.length" type="button" class="btn-reset-filter"
                @click="resetKategori">
                Reset
              </button>
            </div>
            <div class="kategori-checkbox-list">
              <div class="form-check" v-for="kategori in kategoriOptions" :key="kategori">
                <input class="form-check-input" type="checkbox" :id="`kategori-${kategori}`"
                  :value="kategori" v-model="selectedCategories">
                <label class="form-check-label" :for="`kategori-${kategori}`">
                  {{ kategori }}
                </label>
              </div>
            </div>
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
            <div class="col-md-4" v-for="buku in pagedBuku" :key="buku.id_buku">
              <!-- Bungkus seluruh card dengan router-link -->
              <router-link :to="{ name: 'book-detail', params: { id: buku.id_buku } }"
                class="book-card text-decoration-none text-reset d-block">

                <div class="book-img-wrapper">
                  <img :src="buku.image_url || defaultCover" alt="Cover Buku" class="book-img">
                  <span class="category-badge">{{ buku.nama_category || 'Tanpa Kategori' }}</span>
                </div>
                <div class="book-body">
                  <div class="d-flex justify-content-between align-items-start gap-2">
                    <h6 class="book-title">{{ buku.judul_buku }}</h6>
                    <span class="status">• {{ buku.status_buku }}</span>
                  </div>
                  <p class="book-author">{{ buku.pengarang || 'Penulis belum tersedia' }}</p>
                  <small class="book-year">{{ buku.tahun_terbit || 'Tahun tidak tersedia' }}</small>
                  <button class="book-btn">Lihat Buku</button>
                </div>

              </router-link>
            </div>
          </div>

          <!-- Pagination -->
          <nav v-if="totalPages > 1" class="pagination-nav" aria-label="Navigasi halaman">
            <button v-if="currentPage > 1" type="button" class="page-arrow" @click="prevPage"
              aria-label="Halaman sebelumnya">
              <i class="fas fa-chevron-left"></i>
            </button>

            <template v-for="(page, index) in pageNumbers" :key="`${page}-${index}`">
              <span v-if="page === '...'" class="page-ellipsis">...</span>
              <button v-else type="button" class="page-number"
                :class="{ active: page === currentPage }" @click="goToPage(page)">
                {{ page }}
              </button>
            </template>

            <button v-if="currentPage < totalPages" type="button" class="page-arrow"
              @click="nextPage" aria-label="Halaman berikutnya">
              <i class="fas fa-chevron-right"></i>
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant:wght@700&family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

.catalog-page {
  padding: 2rem 0;
}

h1 {
  color: #18212f;
  font-weight: 800;
  margin-bottom: 1rem;
}

.title-katalog {
  font-family: 'Cormorant', serif;
}

.cat-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  white-space: nowrap;
}

.cat-subtitle {
  color: #475569;
  line-height: 1.6;
}

/* SEARCH CONTAINER - RESTRUCTURED FOR PERFECT RESPONSIVENESS */
.search-container {
  display: flex;
  align-items: center;
  width: 100%;
  background-color: #f1f3f7;
  border-radius: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 6px 8px 6px 6px;
  transition: all 0.3s ease;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  z-index: 2;
  font-size: 16px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 48px;
  border-radius: 30px;
  padding-left: 48px;
  padding-right: 16px;
  border: none;
  background-color: transparent;
  box-shadow: none;
  font-size: 15px;
}

.search-input:focus {
  background-color: transparent;
  outline: none;
  box-shadow: none;
}

.search-input::placeholder {
  color: rgba(33, 37, 41, 0.55);
}

.search-button {
  height: 48px;
  padding: 0 28px;
  border: none;
  border-radius: 25px;
  background-color: #0B1E3F;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.search-button:hover {
  background-color: #735505;
}

/* Filter Sidebar */
.filter-box {
  background-color: #fff;
  border: 1px solid #D4AD65;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
}

.filter-box h6 {
  font-weight: 700;
  margin-bottom: 12px;
}

.form-check {
  margin-bottom: 8px;
}

.form-check-label {
  font-size: 14px;
  font-weight: 500;
}

.form-check-input {
  border-color: #D4AD65;
}

.form-check-input:checked {
  background-color: #735505;
  border-color: #735505;
}

.kategori-checkbox-list {
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.btn-reset-filter {
  border: none;
  background: none;
  color: #735505;
  font-size: 12px;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}

.btn-reset-filter:hover {
  text-decoration: underline;
}

/* Book Header */
.book-header {
  width: 100%;
  gap: 16px;
}

.book-count {
  white-space: nowrap;
  font-weight: 700;
  font-size: 1.1rem;
}

.book-count span {
  display: inline;
  color: #735505;
}

.sort-select {
  width: 160px;
  border: 1px solid #735505;
  border-radius: 10px;
  font-size: 14px;
  padding: 8px 12px;
  flex-shrink: 0;
}

/* Book Card */
.book-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.book-img-wrapper {
  position: relative;
  width: 100%;
  height: 320px;
  background-color: #f8fafc;
}

.book-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.category-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background-color: rgba(30, 41, 59, 0.9);
  color: #ffffff;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  z-index: 2;
  backdrop-filter: blur(4px);
}

.book-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.book-title {
  font-family: 'Playfair Display', 'Georgia', serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.status {
  color: #10b981;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.book-author {
  font-size: 13px;
  color: #475569;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-year {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 14px;
}

.book-btn {
  width: 100%;
  margin-top: auto;
  padding: 9px;
  border-radius: 20px;
  border: 1.5px solid #1e293b;
  background-color: transparent;
  color: #1e293b;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.book-btn:hover {
  background-color: #1e293b;
  color: #ffffff;
}

.error-message {
  color: #a33a1f;
  font-weight: 600;
}

/* Pagination */
.pagination-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 32px;
  flex-wrap: wrap;
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #D4AD65;
  background-color: #fff;
  color: #1e293b;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.page-number:hover {
  background-color: #f8f0dc;
}

.page-number.active {
  background-color: #735505;
  border-color: #735505;
  color: #fff;
}

.page-ellipsis {
  width: 36px;
  text-align: center;
  color: #64748b;
  font-weight: 600;
}

.page-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: #735505;
  font-size: 16px;
  cursor: pointer;
}

.page-arrow:hover {
  color: #1e293b;
}

/* MEDIA QUERIES UNTUK TAMPILAN SELULER / MOBILE */
@media (max-width: 768px) {
  .search-container {
    flex-direction: column;
    padding: 10px;
    border-radius: 20px;
    gap: 10px;
  }

  .search-input-wrapper {
    width: 100%;
  }

  .search-input {
    height: 44px;
    background-color: #ffffff;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
  }

  .search-icon {
    left: 14px;
  }

  .search-button {
    width: 100%;
    height: 44px;
    border-radius: 12px;
  }

  .book-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center !important;
  }

  .book-count {
    font-size: 0.95rem;
  }

  .sort-select {
    width: auto;
    font-size: 13px;
    padding: 6px 10px;
  }

  .book-img-wrapper {
    height: 280px;
  }
}
</style>
