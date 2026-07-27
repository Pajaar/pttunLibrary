import { apiRequest } from './api';

export const getBuku = () => apiRequest('/buku');
export const getCategories = () => apiRequest('/buku/categories');
