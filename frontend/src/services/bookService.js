import { apiRequest } from './api';

export const getBuku = () => apiRequest('/buku');
export const getBukuTerbaru = () => apiRequest('/buku?sort=terbaru');
export const getCategories = () => apiRequest('/buku/categories');

export const getBukuById = (id) => apiRequest(`/buku/${id}`);