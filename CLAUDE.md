# PTTUN Jakarta — Library Management System (Sistem Manajemen Perpustakaan)

## Context
Internal library system for PTTUN (Pengadilan Tinggi Tata Usaha Negara) Jakarta,
built during internship. No public-facing auth — this is an internal admin tool
used by library staff, so a login system was deliberately excluded (considered
unnecessary risk for a government institution's internal tool).

## Stack
- Frontend: Vue 3, Bootstrap
- Backend: Node.js/Express, mysql2, cors, dotenv
- Database: MySQL

## Folder structure
- /backend — Express API, mysql2 queries
- /frontend — Vue 3 app

## Database schema (source of truth — do not redesign without asking)
Tables: `buku`, `detail_buku`, `category`, `rak`, `section`, `peminjaman`

- **buku**: core book title record. Fields: `judul_buku` (no length limit set),
  category link.
- **detail_buku**: 1 row per unique book title (NOT per physical copy).
  Holds location + stock: `rak`, `section`, `jumlah_eksemplar`,
  `stok_tersedia`, `status_buku` (tersedia/tidak tersedia — derived from
  stok_tersedia), `pengarang`, `penerbit`, `tahun_terbit`, `halaman`,
  `image_url` (VARCHAR(500), nullable), `created_at` (TIMESTAMP, added to support
  sorting "buku terbaru" / newest-books endpoint). `pengarang`/`penerbit` have no fixed
  varchar length (some titles/names are long).
  Rule: 1 buku = 1 detail_buku, always.
- **category**: 14 fixed categories, full names only (never abbreviate):
  Pidana Materiil, Pidana Khusus, Perdata, Peraturan, Biografi, Monografi
  Hukum, TUN, Hukum Acara, Hukum Publik, Majalah, Lain-lain, Sejarah,
  Statistika, Ketentuan.
- **rak**: 10 total (rak 1–9 + rak utama).
- **section**: subdivision within a rak.
- **peminjaman** (borrowing): `nama`, `nomor_telpon`, `durasi_peminjaman`
  (max 7 hari), `due_date`, `status`.

Current data: 191 unique buku (deduplicated from 199 raw spreadsheet rows,
merged against Data_Buku_PTTUN_terbaru.xlsx as reference — sheets rak8/rak9
finalized).

## Conventions
- Field names in Indonesian, matching the domain (nama_buku, tahun_terbit, etc.)
- No login/auth — do not suggest adding one unless explicitly asked.

## Commands
- Backend dev: <fill in — e.g. `npm run dev` in /backend>
- Frontend dev: <fill in — e.g. `npm run dev` in /frontend>
- DB migration/seed: <fill in once you have a script>

## Open / in progress
- Search/filter fields for book search: not finalized yet.
- Full database details still being sent/decided incrementally.