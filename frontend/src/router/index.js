// import { createRouter, createWebHistory } from 'vue-router'
// import HomeView from '../views/HomeView.vue'

// const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes: [
//     {
//       path: '/',
//       name: 'home',
//       component: HomeView,
//     },
//     {
//       path: '/about',
//       name: 'about',
//       // route level code-splitting
//       // this generates a separate chunk (About.[hash].js) for this route
//       // which is lazy-loaded when the route is visited.
//       component: () => import('../views/AboutView.vue'),
//     },
//     {
//       path: '/katalog',
//       name: 'katalog',
//       component: () => import('../views/CatalogView.vue'),
//     },
//   ],
// })

// export default router

import { createRouter, createWebHistory } from 'vue-router'
import GuestLayout from '../layouts/GuestLayout.vue'
import HomeView from '../views/HomeView.vue'
import CatalogView from '../views/CatalogView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: GuestLayout, // <-- Layout ini yang jadi induk utamanya
      children: [
        {
          path: '', // Kosong artinya mengakses base URL ('/')
          name: 'home',
          component: HomeView,
        },
        {
          path: 'about', // Mengakses '/about'
          name: 'about',
          component: () => import('../views/AboutView.vue'),
        },
        {
          path: 'katalog', // Mengakses '/katalog'
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
        }
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'), // <-- Halaman login terpisah dari GuestLayout (tidak pakai navbar/footer perpustakaan)
    },
  ],
})

export default router
