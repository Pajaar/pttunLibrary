import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    pengguna: null,
    token: null,
  }),
  actions: {
    setSesi(pengguna, token) {
      this.pengguna = pengguna;
      this.token = token;
    },
    hapusSesi() {
      this.pengguna = null;
      this.token = null;
    },
  },
});
