<script setup>
import AppSidebar from '@/components/admin/AppSidebar.vue'
import AppTopbar from '@/components/admin/AppTopbar.vue'

defineProps({
  title: { type: String, default: 'Dashboard' },
})
</script>

<template>
  <div class="d-flex admin-shell">
    <AppSidebar id="sidebar" />

    <div class="flex-grow-1 main-column">
      <header class="page-header bg-lib-green px-4 pt-4 pb-5">
        <AppTopbar :title="title" />
      </header>

      <main class="content-area px-4">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
}

.main-column {
  min-width: 0;
}

.page-header {
  background: linear-gradient(135deg, var(--lib-green), var(--lib-green-dark));
}

.content-area {
  padding-bottom: 2.5rem;
}
</style>
