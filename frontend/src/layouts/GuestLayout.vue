<template>
  <div class="landing-wrapper">

    <div class="topbar-fluid">
      <svg class="gold-curve-svg" viewBox="0 0 300 60" preserveAspectRatio="none">
        <path d="M 0,60 Q 180,60 300,0 L 300,60 Z" fill="#D4AD65" />
      </svg>

      <div class="container d-flex align-items-center justify-content-between">
        <div class="seal-container">
          <img src="@/assets/images/logo_Ma.png" alt="Logo Mahkamah Agung" class="main-seal-img" />
        </div>
        <div class="topbar-text-content">
          <h4 class="topbar-title mb-1">MAHKAMAH AGUNG REPUBLIK INDONESIA
            <br>DIREKTORAT JENDERAL BADAN PERADILAN MILITER<br>DAN PERADILAN TATA USAHA NEGARA <br> PENGADILAN
            TINGGI TATA USAHA NEGARA</h4>
          <div class="contact-grid d-flex flex-column gap-0">
            <div class="contact-item d-flex align-items-start gap-2">
              <i class="bi bi-geo-alt-fill text-gold"></i>
              <span class="contact-text">{{ contact.address }}</span>
            </div>

            <div class="contact-sub-row d-flex flex-wrap gap-3 mt-1">
              <div class="contact-item d-flex align-items-center gap-2">
                <i class="bi bi-telephone-fill text-gold"></i>
                <span class="contact-text">{{ contact.phone }}</span>
              </div>
              <div
                class="contact-sub-row d-flex flex-wrap gap-1 gap-md-4 mt-2 justify-content-center">
                <div class="contact-item d-flex align-items-center gap-1 gap-md-2">
                  <i class="bi bi-telephone-fill text-gold"></i>
                  <span class="contact-text">{{ contact.phone }}</span>
                </div>
                <div class="contact-item d-flex align-items-center gap-1 gap-md-2">
                  <i class="bi bi-printer-fill text-gold"></i>
                  <span class="contact-text">{{ contact.fax }}</span>
                </div>
                <div class="contact-item d-flex align-items-center gap-1 gap-md-2">
                  <i class="bi bi-envelope-fill text-gold"></i>
                  <span class="contact-text">{{ contact.email }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="seal-container text-end" style="flex: 0 0 auto;">
            <img src="@/assets/images/logo_tatausaha.png" alt="Logo PTTUN" class="main-seal-img" />
          </div>
        </div>
      </div>
    </div>

    <nav class="navbar navbar-expand-lg navbar-main w-100">
      <div class="container">
        <a class="navbar-brand brand" href="#">PTTUN Library</a>
        <button class="navbar-toggler bg-light" type="button" data-bs-toggle="collapse"
          data-bs-target="#mainNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav mx-auto">
            <li class="nav-item" v-for="(item, i) in navItems" :key="i">
              <router-link :to="item.to" class="nav-link" exact-active-class="active">
                {{ item.label }}
              </router-link>
            </li>
          </ul>
          <button class="a11y-toggle-btn d-flex align-items-center">
            <div class="toggle-knob"></div>
            <div class="toggle-content d-flex flex-column align-items-center">
              <i class="bi bi-person-wheelchair"></i>
              <span class="toggle-text">Aksesibilitas</span>
            </div>
          </button>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
    <footer class="footer-fluid">
      <div class="container">
        <div class="row g-4">
          <div class="col-lg-5 col-md-4">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="seal-lg">
                <img src="@/assets/images/logo_Ma.png" alt="Logo MA" class="main-seal-img">
              </div>
              <div>
                <h4 class="mb-0 text-uppercase h5 fw-bold">Perpustakaan Digital</h4>
                <h4 class="mb-0 text-uppercase h5 fw-bold">PT TUN Jakarta</h4>
                <div class="footer-rule"></div>
              </div>
            </div>
            <p class="small lh-lg mt-4 opacity-75 pe-lg-4">
              Pusat Informasi dan referensi hukum di bidang Peradilan Tata Usaha Negara yang
              terpercaya, lengkap, dan mudah diakses.
            </p>
          </div>

          <!-- Kolom 2: Navigasi -->
          <div class="col-lg-2 col-md-3 col-6">
            <h5 class="gold-text mb-4 d-flex align-items-center gap-2">
              <i class="bi bi-book"></i> Navigasi
            </h5>
            <ul class="footer-links small">
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Beranda</a></li>
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Katalog Buku</a></li>
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Kategori</a></li>
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Layanan</a></li>
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Tentang</a></li>
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Kontak Kami</a></li>
            </ul>
          </div>

          <!-- Kolom 3: Layanan -->
          <div class="col-lg-2 col-md-3 col-6">
            <h5 class="gold-text mb-4 d-flex align-items-center gap-2">
              <i class="bi bi-book"></i> Layanan
            </h5>
            <ul class="footer-links small">
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Katalog Buku</a></li>
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Buku Terbaru</a></li>
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Kategori Koleksi</a>
              </li>
              <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Panduan Penggunaan</a>
              </li>
            </ul>
          </div>
          <div class="col-lg-3 col-md-6">
            <h5 class="gold-text mb-3 d-flex align-items-center gap-2">
              <i class="bi bi-book"></i> Kontak Kami
            </h5>
            <div class="small d-flex flex-column gap-2 mb-4 opacity-90">
              <div class="d-flex align-items-start gap-2">
                <i class="bi bi-geo-alt-fill text-warning mt-1"></i>
                <span>Jalan Cikini Raya No. 117, Menteng, Jakarta Pusat, 10330</span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-telephone-fill text-warning"></i>
                <span>(021) 319 26163</span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-envelope-fill text-warning"></i>
                <span>pttun.jakarta@gmail.com</span>
              </div>
            </div>
            <h5 class="gold-text mb-3 d-flex align-items-center gap-2">
              <i class="bi bi-book"></i> Jam Operasional
            </h5>
            <table class="table table-borderless table-sm m-0 table-jam">
              <tbody>
                <tr>
                  <td width="40%">Senin - Kamis</td>
                  <td width="5%">:</td>
                  <td>08.00 - 16.30 WIB</td>
                </tr>
                <tr>
                  <td>Jumat</td>
                  <td>:</td>
                  <td>08.00 - 17.00 WIB</td>
                </tr>
                <tr>
                  <td>Sabtu - Minggu</td>
                  <td>:</td>
                  <td>Tutup</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
        <div class="footer-bottom">
          <div class="row align-items-center text-center text-md-start g-3">
            <div class="col-md-4">
              <p class="m-0 text-md-start copyright-text">
                <i class="bi bi-c-circle"></i> 2026 Perpustakaan Digital PT TUN Jakarta.<br
                  class="d-none d-md-block"> All rights reserved.
              </p>
            </div>
            <div
              class="col-md-8 d-flex flex-column flex-md-row align-items-center justify-content-md-end gap-4">
              <div class="vertical-rule d-none d-md-block"></div>
              <div class="text-nowrap">
                <span class="opacity-75 label-dev">Dikembangkan oleh:</span>
              </div>
              <div class="logo-container shadow-sm">
                <img src="/frontend/src/assets/images/cep-ccit.png" alt="Logo CEP CCIT"
                  class="dev-logo">
              </div>
              <div class="vertical-rule d-none d-md-block"></div>
              <div class="text-md-start text-center info-dev-text">
                <span class="fw-semibold text-white d-block">CEP CCIT-FTUI</span>
                <span class="small opacity-75 d-block text-job">Jurusan Teknologi Informasi - Full
                  Stack Developer</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </footer>

  </div>
</template>

<script setup>
  import {
    ref
  } from 'vue'

  const year = new Date().getFullYear()

  const contact = ref({
    address: 'Jalan Cikini Raya No. 117, Kec. Menteng, Kota Jakarta Pusat, DKI Jakarta 10330',
    phone: '021-319 261 63',
    fax: '021-319 261 63',
    email: 'pttun.jakarta@gmail.com'
  })

  // Konfigurasi path to yang sesuai dengan children di router/index.js
  const navItems = ref([{
      label: 'Beranda',
      to: '/'
    },
    {
      label: 'Katalog Buku',
      to: '/katalog'
    },
    {
      label: 'Kategori',
      to: '/kategori'
    },
    {
      label: 'Layanan',
      to: '/layanan'
    },
    {
      label: 'Tentang',
      to: '/about'
    },
  ])

</script>
