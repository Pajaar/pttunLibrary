import { defineStore } from 'pinia'
import { login as loginRequest, logout as logoutRequest, me as meRequest } from '@/services/authService.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: null,
    isAuthenticated: false,
    checking: true,
  }),
  actions: {
    async checkSession() {
      this.checking = true
      try {
        const res = await meRequest()
        this.username = res.data.username
        this.isAuthenticated = true
      } catch {
        this.username = null
        this.isAuthenticated = false
      } finally {
        this.checking = false
      }
    },
    async login(username, password) {
      const res = await loginRequest(username, password)
      this.username = res.data.username
      this.isAuthenticated = true
    },
    async logout() {
      try {
        await logoutRequest()
      } finally {
        this.username = null
        this.isAuthenticated = false
      }
    },
  },
})
