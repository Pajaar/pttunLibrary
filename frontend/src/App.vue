<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="app-header">
    <div>
      <p class="app-kicker">Perpustakaan Digital</p>
      <h1>PTTUN Library</h1>
    </div>

    <nav>
      <RouterLink to="/">Beranda</RouterLink>
      <RouterLink to="/katalog">Katalog</RouterLink>
      <RouterLink to="/about">Tentang</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 0;
  border-bottom: 1px solid #d7dee8;
}

.app-kicker {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

h1 {
  margin: 0;
  color: #18212f;
  font-size: 1.75rem;
  font-weight: 700;
}

nav {
  display: flex;
  gap: 0.75rem;
}

a {
  color: #1f4e79;
  font-weight: 600;
  text-decoration: none;
}

@media (max-width: 640px) {
  .app-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
