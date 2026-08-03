<template>
  <div>
    <section class="hero">
      <div class="container">
        <div class="row-hero">
          <img src="@/assets/images/maki_town-hall.png" alt="Logo PTTUN" class="logo-pttun">
          <h2>MAHKAMAH AGUNG REPUBLIK INDONESIA</h2>
        </div>
        <h1>DIREKTORAT JENDERAL<br>
          BADAN PERADILAN MILITER<br>
          DAN PERADILAN TATA USAHA NEGARA PENGADILAN TINGGI TATA USAHA NEGARA</h1>
          <div class="hero-rule"></div>
        <p class="lead">Melayani masyarakat melalui layanan perpustakaan digital yang cepat, <br>mudah, dan transparan.</p>
        <button class="btn btn-gold btn-hero">Cari Buku<i class="bi bi-chevron-right"></i></button>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="text-center mb-5">
          <div class="eyebrow">Nikmati</div>
          <div class="section-rule-broken"></div>
          <h2 class="section-title">Layanan Kami</h2>
        </div>
        <div class="row g-4">
          <div class="col-6 col-lg-3" v-for="(s, i) in services" :key="i">
            <div class="service-card">
              <div class="icon-circle"><i :class="s.icon"></i></div>
              <h5>{{ s.title }}</h5>
              <p>{{ s.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section pt-0">
      <div class="container">
        <div class="d-flex justify-content-between align-items-end flex-wrap mb-4 gap-3">
          <div>
            <div class="eyebrow">Koleksi</div>
            <h2 class="section-title mb-0">Buku Terbaru</h2>
          </div>
          <button class="btn btn-outline-gold">Lihat Semua Buku <i
              class="bi bi-chevron-right ms-1"></i></button>
        </div>
        <div class="row g-4">
          <div class="col-12 col-xl-4" v-for="(b, i) in books" :key="i">
            <div class="book-card d-flex">
              <div class="book-cover">
                <div class="frame">
                  <div class="title-mark">Book<br>Name</div>
                  <div class="author-mark">AUTHOR NAME</div>
                </div>
              </div>
              <div class="book-body">
                <h5><a href="#">{{ b.title }}</a></h5>
                <div class="author">Penulis Buku</div>
                <div class="badge-wrapper">
                  <span class="badge-tag" :style="{ background: b.tagBg, color: b.tagColor }">
                    {{ b.tag }}
                  </span>
                </div>
                <div class="year d-flex align-items-center gap-2">
                  <i class="bi bi-calendar-fill"></i>
                  <span>{{ b.year }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="text-center mb-5">
          <div class="eyebrow">Informasi</div>
          <div class="section-rule-broken"></div>
          <h2 class="section-title">Tentang Kami</h2>
        </div>
        <div class="row g-4">
          <div class="col-6 ">
            <div class="image">
              <img src="@/assets/images/gedung.jpg" alt="Library Image" class="img-fluid">
            </div>
          </div>
          <div class="col-6 content-library">
            <div class="d-flex align-items-center gap-3 about-library">
              <i class="bi bi-book" style="color: var(--gold)"></i>
              <h5 class="mb-0 eyebrow">Tentang Perpustakaan</h5>
            </div>
            <h1>Perpustakaan Digital <br>PT TUN Jakarta</h1>
            <p class="lead">Perpustakaan Digital Pengadilan Tinggi Tata Usaha Negara Jakarta
              merupakan layanan informasi yang menyediakan akses katalog koleksi buku hukum,
              peraturan perundang-undangan, jurnal, dan berbagai refrensi hukum lainnya. Sistem ini
              dirancang untuk memudahkan masyarakat dalam menemukan informasi koleksi secara cepat,
              akurat, dan terintegrasi dengan website resmi PTTUN Jakarta</p>
            <div class="mt-4 ps-4">
              <div class="row g-4 text-center">

                <!-- Kolom 1 -->
                <div class="col-6 col-lg-3 item">
                  <div class="icon-circle">
                    <i class="bi bi-book text-white"></i>
                  </div>
                  <h3 class="feature-title">Koleksi Lengkap</h3>
                  <p class="feature-text">Berbagai Koleksi buku hukum dan refrensi terpercaya</p>
                </div>

                <!-- Kolom 2 -->
                <div class="col-6 col-lg-3 item">
                  <div class="icon-circle">
                    <i class="bi bi-book"></i>
                  </div>
                  <h3 class="feature-title">Refrensi Hukum</h3>
                  <p class="feature-text">Sumber hukum akurat dan dapat dipertanggungjawabkan</p>
                </div>

                <!-- Kolom 3 -->
                <div class="col-6 col-lg-3 item">
                  <div class="icon-circle">
                    <i class="bi bi-book"></i>
                  </div>
                  <h3 class="feature-title">Pencarian Cepat</h3>
                  <p class="feature-text">Temukan buku yang Anda butuhkan dengan mudah dan efisien
                  </p>
                </div>
                <div class="col-6 col-lg-3 item">
                  <div class="icon-circle">
                    <i class="bi bi-book"></i>
                  </div>
                  <h3 class="feature-title">Terintegrasi</h3>
                  <p class="feature-text">Terhubung dengan website resmi PT TUN Jakarta</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>


  </div>
</template>

<script setup>
  import {
    ref
  } from 'vue'

  const focusSearch = () => {
    alert('Fitur pencarian buku akan segera hadir.')
  }

  const services = ref([{
      icon: 'bi bi-book',
      title: 'Katalog Buku',
      desc: 'Telusuri seluruh koleksi buku yang tersedia secara lengkap'
    },
    {
      icon: 'bi bi-journals',
      title: 'Buku Terbaru',
      desc: 'Temukan buku terbaru yang baru saja ditambahkan'
    },
    {
      icon: 'bi bi-grid-fill',
      title: 'Kategori',
      desc: 'Jelajahi buku berdasarkan kategori yang tersedia'
    },
    {
      icon: 'bi bi-headset',
      title: 'Panduan',
      desc: 'Panduan penggunaan dan layanan perpustakaan digital'
    },
  ])

  const books = ref([{
      title: 'Hukum Administrasi Negara',
      tag: 'Hukum Administrasi',
      tagBg: '#e7defb',
      tagColor: '#6b4fbb',
      year: 2024
    },
    {
      title: 'Peradilan Tata Usaha Negara',
      tag: 'Peradilan',
      tagBg: '#f5f0b8',
      tagColor: '#8a7a10',
      year: 2024
    },
    {
      title: 'Dasar-dasar Hukum Indonesia',
      tag: 'Hukum',
      tagBg: '#fbdac9',
      tagColor: '#c1571f',
      year: 2024
    },
  ])

  const photoCategories = ref([{
      name: 'Hukum Administrasi Negara',
      img: 'https://picsum.photos/seed/hukum-adm/600/400'
    },
    {
      name: 'Hukum Tata Usaha Negara',
      img: 'https://picsum.photos/seed/hukum-tun/600/400'
    },
    {
      name: 'Peraturan Perundang-undangan',
      img: 'https://picsum.photos/seed/perundangan/600/400'
    },
    {
      name: 'Putusan Pengadilan',
      img: 'https://picsum.photos/seed/putusan/600/400'
    },
    {
      name: 'Hukum Perdata',
      img: 'https://picsum.photos/seed/perdata/600/400'
    },
    {
      name: 'Hukum Pidana',
      img: 'https://picsum.photos/seed/pidana/600/400'
    },
    {
      name: 'Hukum Tata Negara',
      img: 'https://picsum.photos/seed/tatanegara/600/400'
    },
    {
      name: 'Jurnal Hukum',
      img: 'https://picsum.photos/seed/jurnal/600/400'
    },
    {
      name: 'Referensi & Ensiklopedia Hukum',
      img: 'https://picsum.photos/seed/referensi/600/400'
    },
  ])

  const listCategories = ref([{
      name: 'Hukum Administrasi Negara',
      count: 24
    },
    {
      name: 'Hukum Tata Usaha Negara',
      count: 18
    },
    {
      name: 'Peraturan Perundang-undangan',
      count: 32
    },
    {
      name: 'Putusan Pengadilan',
      count: 41
    },
    {
      name: 'Hukum Perdata',
      count: 15
    },
    {
      name: 'Hukum Pidana',
      count: 20
    },
    {
      name: 'Hukum Tata Negara',
      count: 12
    },
    {
      name: 'Refrensi & Ensiklopedia Hukum',
      count: 9
    },
  ])

</script>
