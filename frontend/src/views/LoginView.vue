<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleSubmit() {
  errorMsg.value = ''

  if (!username.value.trim() || !password.value) {
    errorMsg.value = 'Username dan password wajib diisi.'
    return
  }

  loading.value = true
  try {
    await authStore.login(username.value.trim(), password.value)
    router.push(route.query.redirect || '/admin/dashboard')
  } catch (error) {
    errorMsg.value = error.message || 'Username atau password salah.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap admin-shell d-flex align-items-center justify-content-center min-vh-100 bg-lib-green">
    <div class="card shadow-soft" style="width: 22rem">
      <div class="card-body p-4">
        <div class="text-center mb-4">
          <i class="bi bi-book-half fs-1 text-lib-green"></i>
          <h5 class="mt-2 mb-0">Perpus Admin</h5>
          <small class="text-muted">Masuk ke dashboard perpustakaan</small>
        </div>
        <form @submit.prevent="handleSubmit">
          <div v-if="errorMsg" class="alert alert-danger py-2">{{ errorMsg }}</div>
          <div class="mb-3">
            <label class="form-label">Username</label>
            <input v-model="username" type="text" class="form-control" autocomplete="username" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input
              v-model="password"
              type="password"
              class="form-control"
              autocomplete="current-password"
              required
            />
          </div>
          <button type="submit" class="btn btn-lib-green w-100 text-white" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
            Masuk
          </button>
          <div class="text-center mt-3">
            <router-link to="/" class="back-home-link">
              <i class="bi bi-arrow-left me-1"></i>Kembali ke Beranda
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-lib-green {
  background-color: var(--lib-green);
}

.btn-lib-green:hover {
  background-color: var(--lib-green-dark);
  color: #fff;
}

.back-home-link {
  color: #6c757d;
  font-size: 0.875rem;
  text-decoration: none;
}

.back-home-link:hover {
  color: var(--lib-green);
  text-decoration: underline;
}
</style>
