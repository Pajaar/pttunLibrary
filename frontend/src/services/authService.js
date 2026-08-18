import { apiRequest } from './api';

export const login = (username, password) =>
  apiRequest('/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

export const logout = () =>
  apiRequest('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

export const me = () =>
  apiRequest('/auth/me', {
    credentials: 'include',
  });
