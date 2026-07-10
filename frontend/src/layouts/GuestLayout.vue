<template>
  <div class="landing-wrapper">

    <div class="topbar-fluid">
      <svg class="gold-curve-svg" viewBox="0 0 300 60" preserveAspectRatio="none">
        <path d="M 0,60 Q 180,60 300,0 L 300,60 Z" fill="#D4AD65" />
      </svg>

      <div class="container d-flex align-items-center gap-4 py-3 position-relative"
        style="z-index: 2;">
        <div class="seal-container">
          <img src="@/assets/images/logo_Ma.png" alt="Logo Mahkamah Agung" class="main-seal-img" />
        </div>

        <div class="vertical-divider-gold"></div>

        <div class="topbar-text-content">
          <h4 class="topbar-title mb-1">MAHKAMAH AGUNG REPUBLIK INDONESIA</h4>
          <h3 class="topbar-subtitle mb-3">Pengadilan Tinggi Tata Usaha Negara Jakarta</h3>
          <div class="contact-grid d-flex flex-column gap-2">
            <div class="contact-item d-flex align-items-start gap-2">
              <i class="bi bi-geo-alt-fill text-gold"></i>
              <span class="contact-text">{{ contact.address }}</span>
            </div>

            <div class="contact-sub-row d-flex flex-wrap gap-4 mt-2">
              <div class="contact-item d-flex align-items-center gap-2">
                <i class="bi bi-telephone-fill text-gold"></i>
                <span class="contact-text">{{ contact.phone }}</span>
              </div>
              <div class="contact-item d-flex align-items-center gap-2">
                <i class="bi bi-printer-fill text-gold"></i>
                <span class="contact-text">{{ contact.fax }}</span>
              </div>
              <div class="contact-item d-flex align-items-center gap-2">
                <i class="bi bi-envelope-fill text-gold"></i>
                <span class="contact-text">{{ contact.email }}</span>
              </div>

            </div>
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
        <div class="d-flex align-items-center gap-3 py-4">
          <div class="seal-lg"><i class="fa-solid fa-scale-balanced"></i></div>
          <div>
            <h4 class="mb-0">Perpustakaan Digital</h4>
            <h4 class="mb-0">PT TUN Jakarta</h4>
            <div class="footer-rule"></div>
          </div>
        </div>
        <div class="footer-bottom py-3">
          &copy; {{ year }} Pengadilan Tinggi Tata Usaha Negara Jakarta — Mahkamah Agung Republik
          Indonesia. Seluruh hak cipta dilindungi.
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
