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

<template>
  <div class="catalog-page container-fluid">
    <div class="cat-head container d-flex justify-content-center align-items-center">
      <hr class="flex-grow-1 my-auto opacity-100 h-2" style="border-color: #D4AD65; opacity: 1;">
      <span class="px-3 fs-1 text-dark fw-bold">Katalog Buku</span>
      <hr class="flex-grow-1 my-auto opacity-100" style="border-color: #D4AD65; opacity: 1;">
    </div>

    <span class="text-center fs-5 d-flex justify-content-center">Temukan koleksi buku hukum,
      peraturan, dan referensi yang tersedia di <br> Perpustakaan PTTUN Jakarta</span>

    <div class="container mt-4 mb-4">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input type="text" class="form-control search-input"
          placeholder="Cari berdasarkan judul buku... ">
        <button class="search-button"> Cari Buku </button>
      </div>
    </div>

    <div class="container my-5">
      <div class="row g-4">

        <!-- Sidebar Filter -->
        <div class="col-lg-3">
          <div class="filter-box">
            <h6>Kategori</h6>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="hukum-administrasi">
              <label class="form-check-label" for="hukum-administrasi">
                Hukum Administrasi Negara
              </label>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="hukum-perdata">
              <label class="form-check-label" for="hukum-perdata">
                Hukum Perdata
              </label>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="hukum-pidana">
              <label class="form-check-label" for="hukum-pidana">
                Hukum Pidana
              </label>
            </div>
          </div>

          <div class="filter-box">
            <h6>Tipe Buku</h6>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="jurnal">
              <label class="form-check-label" for="jurnal">Jurnal</label>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="putusan">
              <label class="form-check-label" for="putusan">Putusan</label>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="laporan">
              <label class="form-check-label" for="laporan">Laporan</label>
            </div>
          </div>

          <div class="filter-box">
            <h6>Ketersediaan</h6>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="semua">
              <label class="form-check-label" for="semua">Semua</label>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="tersedia">
              <label class="form-check-label" for="tersedia">Tersedia</label>
            </div>

            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="dipinjam">
              <label class="form-check-label" for="dipinjam">Sedang Dipinjam</label>
            </div>
          </div>
        </div>

        <!-- Book Content -->
        <div class="col-lg-9">
          <div class="d-flex justify-content-between align-items-center book-header">
            <h4 class="mb-0 book-count">
              Menampilkan <span>{{ daftarBuku.length }}</span> dari
              <span>{{ daftarBuku.length }}</span> buku
            </h4>

            <select class="form-select sort-select">
              <option>Paling Relevan</option>
              <option>Terbaru</option>
              <option>Judul A-Z</option>
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

          <div class="row g-4 mt-2">
            <div class="col-md-4" v-for="buku in daftarBuku" :key="buku.id_buku || buku.id">
              <div class="book-card">

                <!-- Wrapper untuk gambar dan badge -->
                <div class="book-img-wrapper">
                  <!-- Menggunakan data cover dinamis, jika kosong akan pakai cadangan Logo_Ma.png -->
                  <!-- Note: Sesuaikan path relative-nya dari komponen ini ke folder assets kamu -->
                  <img
                    :src="buku.cover || buku.cover_buku || defaultCover"
                    alt="Cover Buku" class="book-img">
                  <!-- Badge kategori melayang di atas gambar -->
                  <span
                    class="category-badge">{{ buku.kategori || buku.nama_kategori || 'Hukum Pidana' }}</span>
                </div>

                <!-- Konten detail buku -->
                <div class="book-body">
                  <div class="d-flex justify-content-between align-items-start gap-2">
                    <h6 class="book-title">{{ buku.judul || buku.judul_buku || 'Judul Buku' }}</h6>
                    <span class="status">•
                      {{ buku.status || buku.ketersediaan || 'Tersedia' }}</span>
                  </div>
                  <p class="book-author">
                    {{ buku.penulis || buku.pengarang || 'Penulis belum tersedia' }}</p>
                  <small
                    class="book-year">{{ buku.tahun || buku.tahun_terbit || 'Tahun tidak tersedia' }}</small>
                  <button class="book-btn">Lihat Buku</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
  .catalog-page {
    padding: 2rem 0;
  }

  h1 {
    color: #18212f;
    font-weight: 800;
    margin-bottom: 1rem;
  }

  /* Search Bar */
  .search-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 60px;
    border-radius: 30px;
    background-color: rgba(212, 173, 101, 0.15);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
    padding: 5px 25px 5px 5px;
  }

  .search-input {
    flex: 1;
    height: 100%;
    border-radius: 30px;
    padding-left: 50px;
    border: none;
    background-color: transparent;
    box-shadow: none;
  }

  .search-input:focus {
    background-color: transparent;
    outline: none;
    box-shadow: none;
  }

  .search-icon {
    position: absolute;
    left: 20px;
    color: #000000;
    z-index: 2;
  }

  .search-input::placeholder {
    color: rgba(33, 37, 41, 0.6);
  }

  .search-button {
    height: 42px;
    padding: 0 23px;
    border: none;
    border-radius: 30px;
    background-color: #735505;
    color: white;
    font-weight: 600;
    white-space: nowrap;
    transition: 0.2s ease;
    margin-left: 8px;
  }

  .search-button:hover {
    background-color: #5f4604;
  }

  /* Filter Sidebar */
  .filter-box {
    background-color: #fff;
    border: 1px solid #D4AD65;
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 24px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
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

  /* Book Header */
  .book-header {
    width: 100%;
    gap: 16px;
  }

  .book-count {
    white-space: nowrap;
    font-weight: 700;
  }

  .book-count span {
    display: inline;
    color: #735505;
    margin-top: 0;
  }

  .sort-select {
    width: 150px;
    border: 1px solid #735505;
    border-radius: 10px;
    font-size: 14px;
    padding: 10px;
    flex-shrink: 0;
  }

  /* Book Card */
  .book-card {
    display: flex;
    flex-direction: column;
    background-color: #fff;
    border-radius: 20px;
    /* Sudut melengkung halus sesuai gambar */
    overflow: hidden;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    /* Shadow tipis modern */
    height: 100%;
  }

  /* Area Gambar */
  .book-img-wrapper {
    position: relative;
    width: 100%;
    height: 380px;
    background-color: #f8fafc;
  }

  .book-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Badge Kategori Melayang */
  .category-badge {
    position: absolute;
    top: 14px;
    left: 14px;
    background-color: #1e293b;
    /* Warna gelap khas banner */
    color: #ffffff;
    padding: 6px 14px;
    border-radius: 30px;
    font-size: 11px;
    font-weight: 500;
    z-index: 5;
  }

  /* Area Teks di Bawah Gambar */
  .book-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  /* Tipografi Judul (Gaya Serif Meniru Gambar) */
  .book-title {
    font-family: 'Playfair Display', 'Georgia', serif;
    font-size: 1.15rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.4;
    margin-bottom: 8px;
  }

  /* Label Status 'Tersedia' */
  .status {
    color: #10b981;
    /* Warna hijau segar */
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    /* Mencegah kata membungkus ke bawah */
    text-transform: capitalize;
  }

  /* Nama Penulis */
  .book-author {
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    color: #334155;
    margin-bottom: 4px;
    font-weight: 400;
  }

  /* Tahun Terbit */
  .book-year {
    display: block;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: #64748b;
    margin-bottom: 16px;
  }

  /* Tombol 'Lihat Buku' Sesuai Gambar */
  .book-btn {
    width: 100%;
    margin-top: auto;
    /* Memaksa tombol selalu berada paling bawah kartu */
    padding: 11px;
    border-radius: 30px;
    border: 1.5px solid #1e293b;
    /* Border warna navy gelap tipis */
    background-color: transparent;
    color: #1e293b;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  /* Efek Hover Tombol */
  .book-btn:hover {
    background-color: #1e293b;
    color: #ffffff;
  }

  /* Dynamic Book List */
  .book-list {
    display: grid;
    gap: 0.75rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .book-list li {
    border: 1px solid #d7dee8;
    border-radius: 8px;
    padding: 1rem;
  }

  .book-list strong,
  .book-list span {
    display: block;
  }

  .book-list strong {
    color: #18212f;
    font-weight: 700;
  }

  .book-list span {
    color: #5f6b7a;
    margin-top: 0.25rem;
  }

  .error-message {
    color: #a33a1f;
    font-weight: 600;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .book-header {
      flex-direction: column;
      align-items: flex-start !important;
    }

    .book-count {
      white-space: normal;
    }

    .sort-select {
      width: 100%;
    }

    .search-container {
      height: auto;
      flex-direction: column;
      align-items: stretch;
      padding: 8px;
      border-radius: 20px;
    }

    .search-input {
      height: 48px;
      padding-left: 45px;
    }

    .search-button {
      width: 100%;
      margin-left: 0;
      margin-top: 8px;
    }

    .search-icon {
      top: 32px;
      left: 22px;
    }
  }

</style>
