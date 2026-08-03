import { apiRequest } from './api';

export const getPeminjaman = () => apiRequest('/peminjaman');

export const ajukanPeminjaman = (payload) =>
  apiRequest('/peminjaman', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
