<template>
  <div class="container book-detail-container my-5">
  <!-- Breadcrumb -->
  <nav aria-label="breadcrumb" class="mb-4">
    <ol class="breadcrumb">
      <li class="breadcrumb-item"><a href="#" class="text-muted">Katalog Buku</a></li>
      <li class="breadcrumb-item active text-navy font-display" aria-current="page">Informasi Buku</li>
    </ol>
  </nav>

  <!-- Main Detail Section -->
  <div class="row g-4 mb-5">
    <!-- Cover Buku -->
    <div class="col-12 col-md-4 text-center text-md-start">
      <div class="detail-cover-wrapper">
        <img src="/frontend/src/assets/images/hukum.png" alt="Cover Buku" class="img-fluid detail-cover-img" />
      </div>
    </div>

    <!-- Informasi Detail -->
    <div class="col-12 col-md-8 d-flex flex-column justify-content-between">
      <div class="book-info-header">
        <span class="badge bg-navy px-3 py-2 mb-2">Hukum Pidana</span>
        <h1 class="book-detail-title font-display">Hukum Pidana-Ishaq</h1>
        <p class="book-detail-author">Penulis: <strong>Dr. H. Ishaq, S.H., M.Hum.</strong></p>
      </div>

      <hr class="my-4 text-muted opacity-25">

      <div class="row g-5">
        <div class="col-6 col-sm-6 col-md-6">
          <div class="info-label text-uppercase text-muted">Penerbit</div>
          <div class="info-value">Rajawali Pers</div>
        </div>
        <div class="col-6 col-sm-6 col-md-6">
          <div class="info-label text-uppercase text-muted">Tahun Terbit</div>
          <div class="info-value">2021</div>
        </div>
        <div class="col-6 col-sm-6 col-md-6">
          <div class="info-label text-uppercase text-muted">Halaman</div>
          <div class="info-value">312 Halaman</div>
        </div>
        <div class="col-6 col-sm-6 col-md-6">
          <div class="info-label text-uppercase text-muted">Lokasi Rak</div>
          <div class="info-value">Rak 1</div>
        </div>
      </div>

      <hr class="my-4 text-muted opacity-25">

      <!-- Status & Aksi -->
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div class="status-indicator d-flex align-items-center gap-2 text-success fw-semibold">
          <span class="dot-status"></span> Tersedia
        </div>
        <button class="btn btn-navy-action px-4 py-2 rounded-pill shadow-sm">Pinjam Buku</button>
      </div>
    </div>
  </div>

  <!-- Section Rekomendasi Buku -->
  <div class="recommendation-section mt-5 pt-4">
    <h3 class="section-title font-display text-navy mb-1">Rekomendasi Buku</h3>
    <p class="text-muted small mb-4">Temukan buku lain dengan topik dan pembahasan yang serupa.</p>

    <div class="row g-4">
      <!-- Card Rekomendasi 1 (Ulangi sesuai data) -->
      <div class="col-12 col-sm-6 col-md-4 col-lg-4">
        <div class="card card-recommendation h-100 shadow-sm border-0">
          <div class="card-img-wrapper position-relative">
            <span class="badge bg-navy position-absolute top-0 start-0 m-3 btn-sm">Hukum Pidana</span>
            <img src="/frontend/src/assets/images/hukum.png" class="card-img-top" alt="Cover Rekomendasi">
          </div>
          <div class="card-body d-flex flex-column justify-content-between p-3">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title font-display mb-0">Hukum Pidana-Ishaq</h5>
                <span class="text-success small fw-semibold d-flex align-items-center gap-1">
                  <span class="dot-status-sm"></span> Tersedia
                </span>
              </div>
              <p class="card-author text-muted mb-1">Dr. H. Ishaq, S.H., M.Hum.</p>
              <p class="card-year text-muted mb-3">2021</p>
            </div>
            <button class="btn btn-outline-navy w-100 py-2">Lihat Buku</button>
          </div>
        </div>
      </div>

      <!-- Card Rekomendasi 2 -->
      <div class="col-12 col-sm-6 col-md-4 col-lg-4">
        <div class="card card-recommendation h-100 shadow-sm border-0">
          <div class="card-img-wrapper position-relative">
            <span class="badge bg-navy position-absolute top-0 start-0 m-3 btn-sm">Hukum Pidana</span>
            <img src="/frontend/src/assets/images/hukum.png" class="card-img-top" alt="Cover Rekomendasi">
          </div>
          <div class="card-body d-flex flex-column justify-content-between p-3">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title font-display mb-0">Hukum Pidana-Ishaq</h5>
                <span class="text-success small fw-semibold d-flex align-items-center gap-1">
                  <span class="dot-status-sm"></span> Tersedia
                </span>
              </div>
              <p class="card-author text-muted mb-1">Dr. H. Ishaq, S.H., M.Hum.</p>
              <p class="card-year text-muted mb-3">2021</p>
            </div>
            <button class="btn btn-outline-navy w-100 py-2">Lihat Buku</button>
          </div>
        </div>
      </div>

      <!-- Card Rekomendasi 3 -->
      <div class="col-12 col-sm-6 col-md-4 col-lg-4">
        <div class="card card-recommendation h-100 shadow-sm border-0">
          <div class="card-img-wrapper position-relative">
            <span class="badge bg-navy position-absolute top-0 start-0 m-3 btn-sm">Hukum Pidana</span>
            <img src="/frontend/src/assets/images/hukum.png" class="card-img-top" alt="Cover Rekomendasi">
          </div>
          <div class="card-body d-flex flex-column justify-content-between p-3">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title font-display mb-0">Hukum Pidana-Ishaq</h5>
                <span class="text-success small fw-semibold d-flex align-items-center gap-1">
                  <span class="dot-status-sm"></span> Tersedia
                </span>
              </div>
              <p class="card-author text-muted mb-1">Dr. H. Ishaq, S.H., M.Hum.</p>
              <p class="card-year text-muted mb-3">2021</p>
            </div>
            <button class="btn btn-outline-navy w-100 py-2">Lihat Buku</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
</template>

<style>
.text-navy {
  color: #0c2454 !important;
}

.bg-navy {
  background-color: #0c2454 !important;
  color: #ffffff !important;
}

.font-display {
  font-family: 'Playfair Display', serif;
}

.detail-cover-wrapper {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  overflow: hidden;
  display: inline-block;
}

.detail-cover-img {
  max-height: 480px;
  object-fit: cover;
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.book-detail-title {
  color: #0c2454;
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
  background-color: #198754;
  border-radius: 50%;
  display: inline-block;
}

.dot-status-sm {
  width: 7px;
  height: 7px;
  background-color: #198754;
  border-radius: 50%;
  display: inline-block;
}

.btn-navy-action {
  background-color: #0c2454;
  color: #ffffff;
  font-weight: 600;
  border: none;
  transition: all 0.3s ease;
}

.btn-navy-action:hover {
  background-color: #081a3d;
  color: #e0b877;
  transform: translateY(-2px);
}

.card-recommendation {
  background: #ffffff;
  border-radius: 16px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12) !important;
  overflow: hidden !important; 
  border: none !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card-recommendation:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.18) !important;
}

.card-recommendation .card-img-wrapper {
  position: relative;
  width: 100%;
  background-color: #f8f9fa; /* Menjaga area belakang jika cover transparan */
}

.card-recommendation img.card-img-top {
  max-height: auto;
  object-fit: cover;
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.card-recommendation .card-body {
  padding: 1.25rem !important;
}

.card-recommendation .card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0c2454;
  margin-bottom: 4px;
}

.card-recommendation .card-author {
  font-size: 0.85rem;
  color: #555555;
  margin-bottom: 2px;
}

.card-recommendation .card-year {
  font-size: 0.85rem;
  color: #888888;
  margin-bottom: 15px; /* Memberi jarak ke tombol di bawahnya */
}

.btn-outline-navy {
  border: 1px solid #0c2454 !important;
  color: #0c2454 !important;
  background-color: transparent !important;
  border-radius: 30px !important; 
  font-size: 0.85rem;
  font-weight: 600;
  padding: 10px 0 !important;
  width: 100%;
  transition: all 0.3s ease;
}

.btn-outline-navy:hover {
  background-color: #0c2454 !important;
  color: #ffffff !important;
}

@media (max-width: 767px) {
  /* Di layar HP tinggi gambar sedikit diturunkan agar seimbang */
  .card-recommendation img.card-img-top {
    height: 380px !important; 
  }
}

@media (max-width: 767px) {
  .book-detail-title {
    font-size: 1.65rem;
  }
  
  .info-value {
    font-size: 0.95rem;
  }

  .detail-cover-img {
    max-height: 320px;
    margin-bottom: 15px;
  }

  .card-recommendation img {
    height: 260px;
  }
}
</style>

