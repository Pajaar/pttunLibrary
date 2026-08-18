<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Pie } from 'vue-chartjs'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { getBuku, getDashboardStats } from '@/services/bookAdminService.js'
import { getCategory } from '@/services/categoryService.js'
import { getPeminjaman } from '@/services/loanAdminService.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
)

// State Reactive untuk Card Stats
const stats = ref([
  {
    label: 'Total Judul Buku',
    value: '0',
    icon: 'bi-book',
    color: 'primary',
    trend: 'DB',
    trendUp: true,
    note: 'Database',
  },
  {
    label: 'Total Eksemplar',
    value: '0',
    icon: 'bi-journal-bookmark',
    color: 'success',
    trend: 'DB',
    trendUp: true,
    note: 'Fisik buku',
  },
  {
    label: 'Buku Dipinjam',
    value: '0',
    icon: 'bi-arrow-left-right',
    color: 'warning',
    trend: 'DB',
    trendUp: true,
    note: 'Peminjaman aktif',
  },
  {
    label: 'Total Kategori',
    value: '0',
    icon: 'bi-tags',
    color: 'info',
    trend: 'DB',
    trendUp: true,
    note: 'Database',
  },
  {
    label: 'Total Rak',
    value: '0',
    icon: 'bi-archive',
    color: 'secondary',
    trend: 'DB',
    trendUp: true,
    note: 'Database',
  },
])

const loadingStats = ref(true)

// State Reactive khusus untuk data Kategori, Buku & Peminjaman dari Database
const categoriesList = ref([])
const booksList = ref([])
const loansList = ref([])

// Load Data Dashboard & Perhitungan Kategori secara Paralel
onMounted(async () => {
  try {
    const [statsRes, catRes, bookRes, loanRes] = await Promise.allSettled([
      getDashboardStats(),
      getCategory(),
      getBuku(),
      getPeminjaman(),
    ])

    if (loanRes.status === 'fulfilled') {
      loansList.value = loanRes.value.data || []
    }

    // 1. Process Stats Response
    if (statsRes.status === 'fulfilled') {
      const data = statsRes.value.data

      if (data) {
        const totalJudul = data.total_judul_buku ?? 0
        const totalEksemplar = data.total_eksemplar ?? 0
        const totalKategori = data.total_kategori ?? 0
        const totalRak = data.total_rak ?? 0
        const bukuDipinjam = loansList.value.filter(
          (l) => l.status === 'dipinjam' || l.status === 'terlambat',
        ).length

        stats.value = [
          {
            label: 'TOTAL JUDUL BUKU',
            value: Number(totalJudul).toLocaleString('id-ID'),
            icon: 'bi-book',
            color: 'primary',
            trend: 'DB',
            trendUp: true,
            note: 'Database',
          },
          {
            label: 'TOTAL EKSEMPLAR',
            value: Number(totalEksemplar).toLocaleString('id-ID'),
            icon: 'bi-journal-bookmark',
            color: 'success',
            trend: 'DB',
            trendUp: true,
            note: 'Fisik buku',
          },
          {
            label: 'BUKU DIPINJAM',
            value: String(bukuDipinjam),
            icon: 'bi-arrow-left-right',
            color: 'warning',
            trend: 'DB',
            trendUp: true,
            note: 'Peminjaman aktif',
          },
          {
            label: 'TOTAL KATEGORI',
            value: String(totalKategori),
            icon: 'bi-tags',
            color: 'info',
            trend: 'DB',
            trendUp: true,
            note: 'Database',
          },
          {
            label: 'TOTAL RAK',
            value: String(totalRak),
            icon: 'bi-archive',
            color: 'secondary',
            trend: 'DB',
            trendUp: true,
            note: 'Database',
          },
        ]
      }
    }

    // 2. Process Categories & Books Response
    if (catRes.status === 'fulfilled') {
      categoriesList.value = catRes.value.data || []
    }
    if (bookRes.status === 'fulfilled') {
      booksList.value = bookRes.value.data || []
    }
  } catch (error) {
    console.error('Gagal memuat data dashboard:', error)
  } finally {
    loadingStats.value = false
  }
})

// Setup Line Chart Peminjaman: jumlah peminjaman per bulan pada tahun berjalan
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const loansChartData = computed(() => {
  const currentYear = new Date().getFullYear()
  const counts = new Array(12).fill(0)

  for (const loan of loansList.value) {
    if (!loan.tanggal_pinjam) continue
    const tanggal = new Date(`${loan.tanggal_pinjam}T00:00:00`)
    if (tanggal.getFullYear() === currentYear) {
      counts[tanggal.getMonth()]++
    }
  }

  return {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: String(currentYear),
        data: counts,
        borderColor: '#0a8a5f',
        backgroundColor: 'rgba(10, 138, 95, 0.15)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      },
    ],
  }
})

const loansChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } },
}

// COMPUTED: Pie Chart Kategori Dinamis berdasarkan jumlah buku di Database
const categoriesChartData = computed(() => {
  // Hitung jumlah buku per id_category
  const counts = {}
  for (const b of booksList.value) {
    if (b.id_category) {
      counts[b.id_category] = (counts[b.id_category] || 0) + 1
    }
  }

  // Kumpulkan label nama kategori dan jumlah bukunya
  const labels = []
  const data = []

  categoriesList.value.forEach((cat) => {
    const totalBuku = counts[cat.id_category] || 0
    labels.push(cat.nama_category)
    data.push(totalBuku)
  })

  // Palette warna dasar
  const baseColors = [
    '#0a8a5f', '#2fb380', '#f0ad4e', '#5bc0de',
    '#d9534f', '#6f42c1', '#fd7e14', '#20c997',
    '#e83e8c', '#17a2b8', '#6c757d', '#343a40'
  ]

  // Warna menyesuaikan dinamis dengan jumlah kategori
  const dynamicColors = labels.map((_, index) => baseColors[index % baseColors.length])

  return {
    labels: labels.length ? labels : ['Belum Ada Kategori'],
    datasets: [
      {
        data: data.length ? data : [0],
        backgroundColor: dynamicColors.length ? dynamicColors : ['#0a8a5f'],
        borderWidth: 0,
      },
    ],
  }
})

const categoriesChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 12, font: { size: 11 } },
    },
  },
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusBadgeClass(status) {
  if (status === 'terlambat') return 'bg-danger'
  return 'bg-warning text-dark'
}

function statusLabel(status) {
  if (status === 'terlambat') return 'Terlambat'
  return 'Dipinjam'
}

// 5 peminjaman terbaru (backend sudah mengurutkan berdasarkan tanggal_pinjam terbaru)
const recentLoans = computed(() => loansList.value.slice(0, 5))

// 5 buku yang akan jatuh tempo (masih dipinjam, belum terlambat), diurutkan terdekat dulu
const dueSoonBooks = computed(() =>
  loansList.value
    .filter((l) => l.status === 'dipinjam')
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5),
)
</script>

<template>
  <AdminLayout title="Dashboard">
    <div class="stats-row row g-3">
      <div v-for="stat in stats" :key="stat.label" class="col-6 col-md-4 col-xl-2">
        <div class="card shadow-soft h-100">
          <div class="card-body">
            <div class="d-flex align-items-start justify-content-between">
              <div>
                <small
                  class="text-muted text-uppercase"
                  style="font-size: 0.68rem; letter-spacing: 0.04em"
                  >{{ stat.label }}</small
                >
                <div class="fs-4 fw-bold">{{ stat.value }}</div>
              </div>
              <div
                class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                :class="`bg-${stat.color} bg-opacity-10`"
                style="width: 42px; height: 42px"
              >
                <i class="bi" :class="[stat.icon, `text-${stat.color}`]"></i>
              </div>
            </div>
            <div class="mt-2 small">
              <span :class="stat.trendUp ? 'text-success' : 'text-danger'">
                <i class="bi" :class="stat.trendUp ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                {{ stat.trend }}
              </span>
              <span class="text-muted"> {{ stat.note }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-12 col-xl-8">
        <div class="card shadow-soft h-100">
          <div class="card-body">
            <small class="text-muted text-uppercase" style="font-size: 0.7rem">Ringkasan</small>
            <h6 class="mb-3">Peminjaman per Bulan</h6>
            <div style="height: 280px">
              <Line :data="loansChartData" :options="loansChartOptions" />
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-4">
        <div class="card shadow-soft h-100">
          <div class="card-body">
            <small class="text-muted text-uppercase" style="font-size: 0.7rem">Statistik</small>
            <h6 class="mb-3">Kategori Buku</h6>
            <div style="height: 280px">
              <Pie :data="categoriesChartData" :options="categoriesChartOptions" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1 mb-2">
      <div class="col-12 col-xl-7">
        <div class="card shadow-soft h-100">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Peminjaman Terakhir</h6>
              <RouterLink to="/admin/loans/monitoring" class="btn btn-sm btn-outline-success"
                >Lihat Semua</RouterLink
              >
            </div>
            <div class="table-responsive">
              <table class="table table-striped table-hover align-middle mb-0">
                <thead>
                  <tr class="text-muted small text-uppercase">
                    <th>Peminjam</th>
                    <th>Buku</th>
                    <th>Jatuh Tempo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="recentLoans.length === 0">
                    <td colspan="4" class="text-center text-muted py-4">
                      Belum ada data peminjaman.
                    </td>
                  </tr>
                  <tr v-for="loan in recentLoans" :key="loan.id_peminjaman">
                    <td>{{ loan.nama_peminjam }}</td>
                    <td>{{ loan.judul_buku }}</td>
                    <td>{{ formatDate(loan.due_date) }}</td>
                    <td>
                      <span class="badge" :class="statusBadgeClass(loan.status)">{{
                        statusLabel(loan.status)
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-5">
        <div class="card shadow-soft h-100">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Buku Akan Jatuh Tempo</h6>
              <RouterLink to="/admin/loans/monitoring" class="btn btn-sm btn-outline-success"
                >Lihat Semua</RouterLink
              >
            </div>
            <div class="table-responsive">
              <table class="table table-striped table-hover align-middle mb-0">
                <thead>
                  <tr class="text-muted small text-uppercase">
                    <th>Buku</th>
                    <th>Peminjam</th>
                    <th>Jatuh Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="dueSoonBooks.length === 0">
                    <td colspan="3" class="text-center text-muted py-4">
                      Tidak ada buku yang akan jatuh tempo.
                    </td>
                  </tr>
                  <tr v-for="loan in dueSoonBooks" :key="loan.id_peminjaman">
                    <td>{{ loan.judul_buku }}</td>
                    <td>{{ loan.nama_peminjam }}</td>
                    <td>{{ formatDate(loan.due_date) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.stats-row {
  margin-top: -3.75rem;
}
</style>
