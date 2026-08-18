import { adminApiRequest } from './adminApi';

export const getCategory = () => adminApiRequest('/admin/category');
export const searchCategory = (keyword) =>
  adminApiRequest(`/admin/category/search?keyword=${encodeURIComponent(keyword)}`);
export const createCategory = (data) =>
  adminApiRequest('/admin/category', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id, data) =>
  adminApiRequest(`/admin/category/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory = (id) => adminApiRequest(`/admin/category/${id}`, { method: 'DELETE' });
