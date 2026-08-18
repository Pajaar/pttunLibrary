import { adminApiRequest } from './adminApi';

export const getPeminjaman = () => adminApiRequest('/admin/peminjaman');
export const updatePeminjaman = (id, data) =>
  adminApiRequest(`/admin/peminjaman/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateStatusPeminjaman = (id, status) =>
  adminApiRequest(`/admin/peminjaman/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
export const deletePeminjaman = (id) => adminApiRequest(`/admin/peminjaman/${id}`, { method: 'DELETE' });
