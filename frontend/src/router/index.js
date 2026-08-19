import { createRouter, createWebHistory } from 'vue-router'
import GuestLayout from '../layouts/GuestLayout.vue'
import HomeView from '../views/HomeView.vue'
import CatalogView from '../views/CatalogView.vue'
import { useAuthStore } from '../stores/auth.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: GuestLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('../views/AboutView.vue'),
        },
        {
          path: 'katalog',
          name: 'katalog',
          component: CatalogView,
        },
        {
          path: 'buku/:id',
          name: 'book-detail',
          component: () => import('../views/BookDetail.vue'),
        },
        {
          path: 'buku/:id/pinjam',
          name: 'peminjaman-form',
          component: () => import('../views/PeminjamanFormView.vue'),
        },
        {
          path: 'cek-peminjaman',
          name: 'cek-peminjaman',
          component: () => import('../views/CekPeminjamanView.vue'),
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/admin',
      redirect: '/admin/dashboard',
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('../views/admin/DashboardView.vue'),
    },
    {
      path: '/admin/categories',
      name: 'admin-categories',
      component: () => import('../views/admin/CategoriesView.vue'),
    },
    {
      path: '/admin/books',
      name: 'admin-books',
      component: () => import('../views/admin/BooksView.vue'),
    },
    {
      path: '/admin/shelves',
      name: 'admin-shelves',
      component: () => import('../views/admin/ShelvesView.vue'),
    },
    {
      path: '/admin/loans/monitoring',
      name: 'admin-loans-monitoring',
      component: () => import('../views/admin/LoanMonitoringView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  if (!to.path.startsWith('/admin')) return true

  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
