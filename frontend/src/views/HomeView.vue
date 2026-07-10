<template>
  <div>
    <section class="hero">
      <div class="container">
        <h1>Perpustakaan Digital Mahkamah Agung RI</h1>
        <h2>Pengadilan Tinggi Tata Usaha Negara Jakarta</h2>
        <p class="lead">Melayani masyarakat melalui layanan perpustakaan digital yang cepat, mudah, dan transparan.</p>
        <button class="btn btn-gold">Cari Buku</button>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="text-center mb-5">
          <div class="eyebrow">Nikmati</div>
          <h2 class="section-title">Layanan Kami</h2>
          <div class="section-rule"></div>
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
          <button class="btn btn-outline-gold">Lihat Semua Buku <i class="fa-solid fa-arrow-right ms-1"></i></button>
        </div>

        <div class="row g-4">
          <div class="col-md-4" v-for="(b, i) in books" :key="i">
            <div class="book-card">
              <div class="book-cover">
                <div class="frame">
                  <div class="title-mark">Book<br>Name</div>
                  <div class="author-mark">AUTHOR NAME</div>
                </div>
              </div>
              <div class="book-body">
                <h5>{{ b.title }}</h5>
                <div class="author">Penulis Buku</div>
                <span class="badge-tag" :style="{background: b.tagBg, color: b.tagColor}">{{ b.tag }}</span>
                <div class="year"><i class="fa-regular fa-calendar"></i>{{ b.year }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="background: var(--cream-2);">
      <div class="container">
        <div class="text-center mb-5">
          <div class="eyebrow">Jelajahi</div>
          <h2 class="section-title">Kategori Populer</h2>
          <div class="section-rule"></div>
          <p class="section-sub">Temukan berbagai koleksi buku hukum berdasarkan kategori yang tersedia.</p>
        </div>

        <div class="row g-4">
          <div class="col-md-4" v-for="(c, i) in photoCategories" :key="i">
            <div class="cat-photo" :style="{backgroundImage: 'url(' + c.img + ')'}">
              <span>{{ c.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section pt-5">
      <div class="container">
        <div class="row g-4">
          <div class="col-6 col-lg-3" v-for="(c, i) in listCategories" :key="i">
            <div class="cat-list-card">
              <div class="icon-circle"><i class="fa-solid fa-book"></i></div>
              <h6>{{ c.name }}</h6>
              <div class="count">{{ c.count }} Buku</div>
              <a href="#">Lihat Koleksi <i class="fa-solid fa-arrow-right ms-1"></i></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const focusSearch = () => {
  alert('Fitur pencarian buku akan segera hadir.')
}

const services = ref([
  { icon: 'fa-solid fa-book-open', title: 'Katalog Buku', desc: 'Telusuri seluruh koleksi buku yang tersedia secara lengkap' },
  { icon: 'fa-solid fa-book-medical', title: 'Buku Terbaru', desc: 'Temukan buku terbaru yang baru saja ditambahkan' },
  { icon: 'fa-solid fa-border-all', title: 'Kategori', desc: 'Jelajahi buku berdasarkan kategori yang tersedia' },
  { icon: 'fa-solid fa-headset', title: 'Panduan', desc: 'Panduan penggunaan dan layanan perpustakaan digital' },
])

const books = ref([
  { title: 'Hukum Administrasi Negara', tag: 'Hukum Administrasi', tagBg: '#e7defb', tagColor: '#6b4fbb', year: 2024 },
  { title: 'Peradilan Tata Usaha Negara', tag: 'Peradilan', tagBg: '#f5f0b8', tagColor: '#8a7a10', year: 2024 },
  { title: 'Dasar-dasar Hukum Indonesia', tag: 'Hukum', tagBg: '#fbdac9', tagColor: '#c1571f', year: 2024 },
])

const photoCategories = ref([
  { name: 'Hukum Administrasi Negara', img: 'https://picsum.photos/seed/hukum-adm/600/400' },
  { name: 'Hukum Tata Usaha Negara', img: 'https://picsum.photos/seed/hukum-tun/600/400' },
  { name: 'Peraturan Perundang-undangan', img: 'https://picsum.photos/seed/perundangan/600/400' },
  { name: 'Putusan Pengadilan', img: 'https://picsum.photos/seed/putusan/600/400' },
  { name: 'Hukum Perdata', img: 'https://picsum.photos/seed/perdata/600/400' },
  { name: 'Hukum Pidana', img: 'https://picsum.photos/seed/pidana/600/400' },
  { name: 'Hukum Tata Negara', img: 'https://picsum.photos/seed/tatanegara/600/400' },
  { name: 'Jurnal Hukum', img: 'https://picsum.photos/seed/jurnal/600/400' },
  { name: 'Referensi & Ensiklopedia Hukum', img: 'https://picsum.photos/seed/referensi/600/400' },
])

const listCategories = ref([
  { name: 'Hukum Administrasi Negara', count: 24 },
  { name: 'Hukum Tata Usaha Negara', count: 18 },
  { name: 'Peraturan Perundang-undangan', count: 32 },
  { name: 'Putusan Pengadilan', count: 41 },
  { name: 'Hukum Perdata', count: 15 },
  { name: 'Hukum Pidana', count: 20 },
  { name: 'Hukum Tata Negara', count: 12 },
  { name: 'Refrensi & Ensiklopedia Hukum', count: 9 },
])
</script>