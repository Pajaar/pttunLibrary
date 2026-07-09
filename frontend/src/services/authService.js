import { apiRequest } from './api';

export const login = (payload) =>
  apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
