<script setup>
import { menuGroups } from '@/data/adminMenu.js'

defineProps({
  id: { type: String, default: 'sidebar' },
})
</script>

<template>
  <div :id="id" class="offcanvas-lg offcanvas-start sidebar-panel" tabindex="-1">
    <div class="d-flex align-items-center gap-2 px-4 py-4">
      <i class="bi bi-book-half fs-3 text-lib-green"></i>
      <div>
        <div class="fw-bold text-lib-green lh-1">Perpus Admin</div>
        <small class="text-muted">Library Dashboard</small>
      </div>
      <button
        type="button"
        class="btn-close d-lg-none ms-auto"
        data-bs-dismiss="offcanvas"
        :data-bs-target="`#${id}`"
        aria-label="Close"
      ></button>
    </div>

    <nav class="px-3 sidebar-nav">
      <template v-for="group in menuGroups" :key="group.label ?? 'root'">
        <div v-if="group.label" class="sidebar-group-label">{{ group.label }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          active-class="sidebar-link-active"
        >
          <i class="bi" :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>
  </div>
</template>

<style scoped>
.sidebar-panel {
  width: 260px;
  background-color: var(--lib-sidebar-bg);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-bottom: 2rem;
}

.sidebar-group-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9aa5b1;
  margin: 1rem 0.75rem 0.35rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  color: #495057;
  text-decoration: none;
  font-size: 0.92rem;
}

.sidebar-link i {
  font-size: 1.05rem;
  width: 1.2rem;
  text-align: center;
}

.sidebar-link:hover {
  background-color: rgba(10, 138, 95, 0.08);
  color: var(--lib-green);
}

.sidebar-link-active {
  background-color: var(--lib-green);
  color: #fff;
}
</style>
