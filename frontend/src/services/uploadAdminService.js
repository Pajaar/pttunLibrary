const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function uploadCoverAdmin(file) {
  const formData = new FormData();
  formData.append('cover', file, file.name || 'cover.jpg');

  const response = await fetch(`${API_BASE_URL}/admin/upload/cover`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || 'Gagal mengunggah cover');
  }

  return body.data;
}
