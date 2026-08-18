import { adminApiRequest } from './adminApi';

export const getRak = () => adminApiRequest('/admin/rak');
export const searchRak = (keyword) =>
  adminApiRequest(`/admin/rak/search?keyword=${encodeURIComponent(keyword)}`);
export const createRak = (data) =>
  adminApiRequest('/admin/rak', { method: 'POST', body: JSON.stringify(data) });
export const updateRak = (id, data) =>
  adminApiRequest(`/admin/rak/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRak = (id) => adminApiRequest(`/admin/rak/${id}`, { method: 'DELETE' });
