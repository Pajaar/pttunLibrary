<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

defineProps({
  title: { type: String, required: true },
})

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-between">
    <div class="d-flex align-items-center gap-3">
      <button
        class="btn btn-outline-light d-lg-none"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#sidebar"
        aria-controls="sidebar"
      >
        <i class="bi bi-list fs-5"></i>
      </button>
      <div>
        <small class="text-white-50 text-uppercase" style="letter-spacing: 0.08em">{{ title }}</small>
      </div>
    </div>

    <div class="d-flex align-items-center gap-3">
      <span class="text-white-50 small d-none d-md-inline">{{ authStore.username }}</span>
      <router-link to="/" class="btn btn-sm btn-outline-light" title="Kembali ke Beranda">
        <i class="bi bi-house-door"></i>
      </router-link>
      <button type="button" class="btn btn-sm btn-outline-light" title="Keluar" @click="handleLogout">
        <i class="bi bi-box-arrow-right"></i>
      </button>
      <div
        class="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0"
        style="width: 40px; height: 40px"
      >
        <i class="bi bi-person-fill text-lib-green fs-5"></i>
      </div>
    </div>
  </div>
</template>
