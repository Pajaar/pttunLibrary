<template>
  <main class="home-page">
    <section class="hero">
      <p class="eyebrow">Sistem Informasi Perpustakaan</p>
      <h2>Kelola koleksi buku pengadilan dengan rapi dan mudah ditelusuri.</h2>
      <p>
        Backend sedang disiapkan untuk menyajikan data buku, pengguna, dan peminjaman
        melalui API internal perpustakaan.
      </p>
    </section>

    <section class="status-grid" aria-label="Status modul">
      <article>
        <strong>API Buku</strong>
        <span>Endpoint aktif di /api/buku</span>
      </article>
      <article>
        <strong>Database</strong>
        <span>Menggunakan konfigurasi .env backend</span>
      </article>
      <article>
        <strong>Bahasa</strong>
        <span>Antarmuka dan respons aktif memakai Bahasa Indonesia</span>
      </article>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  padding: 2rem 0;
}

.hero {
  max-width: 760px;
}

.eyebrow {
  color: #7a4f01;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

h2 {
  color: #18212f;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.1;
  margin: 0;
}

.hero p:last-child {
  color: #4b5563;
  font-size: 1.05rem;
  margin-top: 1rem;
}

.status-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 2rem;
}

article {
  border: 1px solid #d7dee8;
  border-radius: 8px;
  padding: 1rem;
}

strong,
span {
  display: block;
}

strong {
  color: #18212f;
  font-weight: 700;
}

span {
  color: #5f6b7a;
  margin-top: 0.25rem;
}
</style>
