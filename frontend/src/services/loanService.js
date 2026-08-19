import { apiRequest } from './api';

export const getPeminjaman = () => apiRequest('/peminjaman');

export const ajukanPeminjaman = (payload) =>
  apiRequest('/peminjaman', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const cekStatusPeminjaman = ({ nama_peminjam, no_telpon }) =>
  apiRequest(
    `/peminjaman/cek?nama_peminjam=${encodeURIComponent(nama_peminjam)}&no_telpon=${encodeURIComponent(no_telpon)}`,
  );
