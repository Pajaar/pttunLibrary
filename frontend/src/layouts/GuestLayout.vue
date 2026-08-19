<template>
  <div class="landing-wrapper">

    <div class="topbar-fluid">
      <svg class="gold-curve-svg" viewBox="0 0 300 60" preserveAspectRatio="none">
        <path d="M 0,60 Q 180,60 300,0 L 300,60 Z" fill="#D4AD65" />
      </svg>

      <div class="container d-flex align-items-center justify-content-between">
        <!-- Logo Kiri -->
        <div class="seal-container" style="flex: 0 0 auto;">
          <img src="@/assets/images/logo_Ma.png" alt="Logo Mahkamah Agung" class="main-seal-img" />
        </div>

        <!-- Teks & Kontak Tengah -->
        <div class="topbar-text-content text-center px-3 flex-grow-1">
          <h4 class="topbar-title mb-2 fw-bold">
            MAHKAMAH AGUNG REPUBLIK INDONESIA<br>
            DIREKTORAT JENDERAL BADAN PERADILAN MILITER<br>
            DAN PERADILAN TATA USAHA NEGARA<br>
            PENGADILAN TINGGI TATA USAHA NEGARA
          </h4>

          <div class="contact-info d-flex flex-column align-items-center gap-1">
            <div class="contact-item d-flex align-items-center gap-2">
              <i class="bi bi-geo-alt-fill text-gold"></i>
              <span class="contact-text">{{ contact.address }}</span>
            </div>

            <!-- Telepon, Fax, Email -->
            <div
              class="contact-sub-row d-flex flex-wrap align-items-center justify-content-center gap-3 mt-1">
              <div class="contact-item d-flex align-items-center gap-1">
                <i class="bi bi-telephone-fill text-gold"></i>
                <span class="contact-text">{{ contact.phone }}</span>
              </div>
              <div class="contact-item d-flex align-items-center gap-2">
                <i class="bi bi-printer-fill text-gold"></i>
                <span class="contact-text">{{ contact.fax }}</span>
              </div>
              <div class="contact-item d-flex align-items-center gap-1">
                <i class="bi bi-printer-fill text-gold"></i>
                <span class="contact-text">{{ contact.fax }}</span>
              </div>
              <div class="contact-item d-flex align-items-center gap-1">
                <i class="bi bi-envelope-fill text-gold"></i>
                <span class="contact-text">{{ contact.email }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Logo Kanan -->
        <div class="seal-container" style="flex: 0 0 auto;">
          <img src="@/assets/images/logo_tatausaha.png" alt="Logo PTTUN" class="main-seal-img" />
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
          <ul class="navbar-nav justify-content-center w-100 gap-3 gap-lg-0">
            <li class="nav-item" v-for="(item, i) in navItems" :key="i">
              <a href="#" class="nav-link" :class="{ active: isItemActive(item) }"
                @click.prevent="handleNavClick(item)">
                {{ item.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>

    <footer class="footer-fluid">
      <div class="container">
        <div class="row g-4">
          <!-- Kolom 1: Logo & Deskripsi -->
          <div class="col-12 col-md-6 col-lg-5">
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
            <p class="small lh-lg mt-3 opacity-75 pe-lg-4">
              Pusat Informasi dan referensi hukum di bidang Peradilan Tata Usaha Negara yang
              terpercaya, lengkap, dan mudah diakses.
            </p>
          </div>
          <!-- Wrapper Kolom 2 & 3 agar berdampingan di Mobile (6 & 6) -->
          <div class="col-12 col-md-6 col-lg-4">
            <div class="row g-3">
              <!-- Kolom 2: Navigasi -->
              <div class="col-6">
                <h5 class="gold-text mb-3 mb-md-4 d-flex align-items-center gap-2">
                  <i class="bi bi-book"></i> Navigasi
                </h5>
                <ul class="footer-links small">
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Beranda</a></li>
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Katalog Buku</a>
                  </li>
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Kategori</a></li>
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Layanan</a></li>
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Tentang</a></li>
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Kontak Kami</a></li>
                </ul>
              </div>

              <!-- Kolom 3: Layanan -->
              <div class="col-6">
                <h5 class="gold-text mb-3 mb-md-4 d-flex align-items-center gap-2">
                  <i class="bi bi-book"></i> Layanan
                </h5>
                <ul class="footer-links small">
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Katalog Buku</a>
                  </li>
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Buku Terbaru</a>
                  </li>
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Kategori Koleksi</a>
                  </li>
                  <li><a href="#"><i class="bi bi-chevron-right me-2 small"></i>Panduan
                      Penggunaan</a></li>
                </ul>
              </div>
            </div>
          </div>
          <!-- Kolom 4: Kontak & Jam Operasional -->
          <div class="col-12 col-md-12 col-lg-3">
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

        <!-- Footer Bottom -->
        <div class="footer-bottom">
          <div class="row align-items-center text-center text-md-start g-3">
            <div class="col-12 col-md-4">
              <p class="m-0 copyright-text">
                <i class="bi bi-c-circle"></i> 2026 Perpustakaan Digital PT TUN Jakarta.<br
                  class="d-none d-md-block"> All rights reserved.
              </p>
            </div>
            <div
              class="col-12 col-md-8 d-flex flex-column flex-md-row align-items-center justify-content-center justify-content-md-end gap-3 gap-md-4">
              <div class="vertical-rule d-none d-md-block"></div>
              <div class="text-nowrap">
                <span class="opacity-75 label-dev">Dikembangkan oleh:</span>
              </div>
              <div class="logo-container shadow-sm">
                <img src="/frontend/src/assets/images/cep-ccit.png" alt="Logo CEP CCIT"
                  class="dev-logo">
              </div>
              <div class="vertical-rule d-none d-md-block"></div>
              <div class="text-center text-md-start info-dev-text">
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
    ref,
    nextTick
  } from 'vue'
  import {
    useRouter,
    useRoute
  } from 'vue-router'

  const router = useRouter()
  const route = useRoute()

  const contact = ref({
    address: 'Jalan Cikini Raya No. 117, Kec. Menteng, Kota Jakarta Pusat, DKI Jakarta 10330',
    phone: '021-319 261 63',
    fax: '021-319 261 63',
    email: 'pttun.jakarta@gmail.com'
  })

  const navItems = ref([{
      label: 'Beranda',
      to: '/'
    },
    {
      label: 'Katalog Buku',
      to: '/katalog'
    },
    {
      label: 'Layanan',
      to: '/',
      targetId: 'layanan'
    },
    {
      label: 'Tentang',
      to: '/',
      targetId: 'about'
    },
  ])

  const isItemActive = (item) => {
    if (item.targetId) return false
    return route.path === item.to
  }

  const handleNavClick = async (item) => {
    if (item.targetId) {
      if (route.path !== '/') {
        await router.push('/')
        await nextTick()
      }

      const element = document.getElementById(item.targetId)
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth'
        })
      }
    } else {
      router.push(item.to)
    }
  }

</script>
