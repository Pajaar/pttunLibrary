# PTTUN Library

Aplikasi perpustakaan digital untuk kebutuhan pengelolaan koleksi buku, pengguna, dan peminjaman di lingkungan pengadilan.

## Menjalankan Proyek

Pasang dependensi frontend dari folder utama:

```sh
npm install
```

Pasang dependensi backend:

```sh
npm --prefix backend install
```

Jalankan frontend:

```sh
npm run dev:frontend
```

Jalankan backend:

```sh
npm run dev:backend
```

Jalankan keduanya sekaligus:

```sh
npm run dev:all
```

## Konfigurasi Backend

Backend membaca konfigurasi database dari `backend/.env`.

Contoh variabel yang dibutuhkan:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pttun_library
PORT=5000
```

Jika memakai Railway, gunakan host dan port dari bagian Public Networking database MySQL.
`PORT` adalah port server backend Express, sedangkan `DB_PORT` adalah port koneksi database.

Endpoint awal backend tersedia di:

```text
GET /api/buku
```
