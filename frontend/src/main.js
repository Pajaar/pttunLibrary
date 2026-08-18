import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router/index.js'
import { useAuthStore } from './stores/auth.js'

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.min.js"
import "bootstrap-icons/font/bootstrap-icons.css"

import "./assets/styles/main.css"
import "./assets/styles/admin.css"

const app = createApp(App)

app.use(createPinia())

const authStore = useAuthStore()
authStore.checkSession().finally(() => {
  app.use(router)
  app.mount('#app')
})
