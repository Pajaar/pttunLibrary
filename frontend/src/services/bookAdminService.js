import { adminApiRequest } from './adminApi';

export const getBuku = () => adminApiRequest('/admin/buku');
export const getBukuById = (id) => adminApiRequest(`/admin/buku/${id}`);
export const searchBuku = (keyword) =>
  adminApiRequest(`/admin/buku/search?keyword=${encodeURIComponent(keyword)}`);
export const getSection = () => adminApiRequest('/admin/buku/section');
export const getDashboardStats = () => adminApiRequest('/admin/buku/dashboard/stats');
export const createBuku = (data) =>
  adminApiRequest('/admin/buku', { method: 'POST', body: JSON.stringify(data) });
export const updateBuku = (id, data) =>
  adminApiRequest(`/admin/buku/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBuku = (id) => adminApiRequest(`/admin/buku/${id}`, { method: 'DELETE' });
