export const menuGroups = [
  {
    label: null,
    items: [{ label: 'Dashboard', icon: 'bi-speedometer2', to: '/admin/dashboard' }],
  },
  {
    label: 'Data Master',
    items: [
      { label: 'Kategori Buku', icon: 'bi-tags', to: '/admin/categories' },
      { label: 'Daftar Buku', icon: 'bi-book', to: '/admin/books' },
      { label: 'Daftar Rak', icon: 'bi-archive', to: '/admin/shelves' },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { label: 'Monitoring Peminjaman', icon: 'bi-clipboard-data', to: '/admin/loans/monitoring' },
    ],
  },
]
