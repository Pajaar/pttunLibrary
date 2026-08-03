const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Permintaan ke server gagal';
    try {
      const body = await response.json();
      if (body && body.message) {
        message = body.message;
      }
    } catch {
      // Response bukan JSON valid (mis. halaman error HTML) — pakai pesan default.
    }
    throw new Error(message);
  }

  return response.json();
};
