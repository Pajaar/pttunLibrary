<script setup>
import { ref, onMounted } from 'vue'
import { getBuku } from '../services/bookService'

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
  <section class="catalog-page">
    <h1>Katalog Buku</h1>

    <p v-if="sedangMemuat">Memuat data buku...</p>
    <p v-else-if="pesanError" class="error-message">{{ pesanError }}</p>
    <p v-else-if="daftarBuku.length === 0">Belum ada data buku.</p>

    <ul v-else class="book-list">
      <li v-for="buku in daftarBuku" :key="buku.id_buku || buku.id">
        <strong>{{ buku.judul || buku.judul_buku || buku.nama_buku || 'Judul belum tersedia' }}</strong>
        <span v-if="buku.penulis || buku.pengarang">
          {{ buku.penulis || buku.pengarang }}
        </span>
      </li>
    </ul>
  </section>
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

.book-list {
  display: grid;
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

li {
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

.error-message {
  color: #a33a1f;
  font-weight: 600;
}
</style>
