# Frontend Admin Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire dashboard_pttun's proven admin frontend (login, route guard, and full CRUD UI for buku/category/rak/peminjaman) into pttunLibrary's frontend, backed entirely by the `/api/admin/*` endpoints Plan 2 already built, per `docs/superpowers/specs/2026-08-18-frontend-admin-wiring-design.md`.

**Architecture:** New Pinia store (`stores/auth.js`) populated once at app boot via `GET /api/auth/me`, gating a `router.beforeEach` guard on every `/admin/*` route. A new admin-only service layer (`bookAdminService.js`, `categoryService.js`, `rakService.js`, `loanAdminService.js`, `uploadAdminService.js`, all built on a shared `adminApi.js` fetch wrapper) targets `/api/admin/*` — kept separate from the existing public `bookService.js`/`loanService.js`/`api.js`, which are untouched. Five view files (`DashboardView.vue`, `CategoriesView.vue`, `ShelvesView.vue`, `BooksView.vue`, `LoanMonitoringView.vue`) are ported from dashboard_pttun's actual working code with import paths and endpoints adapted, plus one new "Tandai Dikembalikan" button. `AdminLayout.vue` + new `components/admin/AppSidebar.vue`/`AppTopbar.vue` render from a hardcoded `data/adminMenu.js` array (not router-meta-driven, matching dashboard's proven pattern). `CoverScanner` is explicitly not ported (Plan 4).

**Tech Stack:** Vue 3 (`<script setup>`), Vue Router 5 (`router.beforeEach` guard), Pinia, Bootstrap 5 (`bootstrap` JS `Modal`/offcanvas, no Popper-dependent components used), `chart.js` + `vue-chartjs` (new dependencies), native `fetch`.

## Global Constraints

- Field names and all user-facing text in Indonesian, matching the rest of the app.
- **This repo's frontend has no `frontend/package.json`** — the Vite project root is the repo root (`vite.config.js` aliases `@` to `./frontend/src` and proxies `/api` to `http://localhost:5000`). All `npm install` commands for frontend dependencies run at the **repo root**, not inside `frontend/`.
- The dev backend runs on port 5000 (confirmed live: `/api/admin/buku`, `/api/admin/category`, `/api/admin/rak`, `/api/admin/peminjaman`, `/api/admin/upload/cover`, all behind `requireAuth`; `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`). Do not invent different paths — these are the real, already-mounted routes (verified by reading the current `backend/routes/*.js` and `backend/controllers/*.js` this session, not assumed from the admin-backend-routes plan draft, which had since been renamed: rate limiter is `adminWriteLimiter`, not `writeLimiter`, after code review).
- Every admin `fetch` call (`adminApi.js`, `uploadAdminService.js`, and `authService.js`'s `login`/`logout`/`me`) must set `credentials: 'include'` — required for the session cookie to round-trip once frontend and backend are served from different origins in production (dev's Vite proxy makes this a no-op locally, but omitting it would silently break production).
- **CSS scoping:** dashboard_pttun's admin theme defines bare `.card`/`.shadow-soft` overrides and `--lib-green` tokens. pttunLibrary's public site already uses plain Bootstrap `.card` elsewhere (confirmed via grep — no literal collision exists yet, but the public site owns that class first). To avoid any future collision, `.card` and `.shadow-soft` overrides go in a new `frontend/src/assets/styles/admin.css`, scoped under a `.admin-shell` selector prefix (e.g. `.admin-shell .card`). The `--lib-green` custom properties and the namespaced `.text-lib-green`/`.bg-lib-green` utility classes stay unscoped (safe — nothing else uses that prefix). `LoginView.vue`'s root wrapper also carries the `admin-shell` class so its ported `card shadow-soft` styling resolves correctly even though it sits outside `AdminLayout`.
- Response envelope from every `/api/admin/*` and `/api/auth/*` endpoint is `{ message, data }` (data is the array/object, never a bare array) — do not unwrap incorrectly in service files.
- No automated test framework in this repo (established convention) — verification is manual, via the running dev server in the Browser pane.
- Any step that would upload a real file to Cloudinary (external, quota-consuming) needs the user's explicit go-ahead first, same standing rule as Plan 2.
- Do not touch `/backend` in this plan — every endpoint already exists.
- Do not modify `frontend/src/layouts/MemberLayout.vue`, `frontend/src/layouts/GuestLayout.vue`, or any public-facing view (`HomeView.vue`, `CatalogView.vue`, `BookDetail.vue`, `PeminjamanFormView.vue`, `AboutView.vue`) — out of scope.
- No "Co-Authored-By" trailer on any commit — hard requirement for this repo.

---

### Task 1: Frontend dependencies and shared admin CSS tokens

**Files:**
- Modify: `package.json`, `package-lock.json` (repo root) — add `chart.js`, `vue-chartjs` via `npm install`.
- Create: `frontend/src/assets/styles/admin.css`
- Modify: `frontend/src/main.js` — import the new stylesheet.

**Interfaces:**
- Produces: `--lib-green`, `--lib-green-dark`, `--lib-sidebar-bg`, `--lib-content-bg` CSS custom properties (global); `.text-lib-green`, `.bg-lib-green` utility classes (global); `.admin-shell .card` / `.admin-shell .shadow-soft` overrides (scoped).
- Consumes: nothing from earlier tasks (first task).

- [ ] **Step 1: Install chart.js and vue-chartjs at the repo root**

```bash
npm install chart.js@^4.5.1 vue-chartjs@^5.3.4
```

- [ ] **Step 2: Create `frontend/src/assets/styles/admin.css`**

```css
:root {
  --lib-green: #0a8a5f;
  --lib-green-dark: #067a52;
  --lib-sidebar-bg: #ffffff;
  --lib-content-bg: #f4f6f9;
}

.text-lib-green {
  color: var(--lib-green) !important;
}

.bg-lib-green {
  background-color: var(--lib-green) !important;
}

.admin-shell {
  background-color: var(--lib-content-bg);
}

.admin-shell .card {
  border: none;
  border-radius: 0.75rem;
}

.admin-shell .shadow-soft {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
```

- [ ] **Step 3: Modify `frontend/src/main.js`** — add the import right after the existing stylesheet import

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router/index.js'

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.min.js"
import "bootstrap-icons/font/bootstrap-icons.css"

import "./assets/styles/main.css"
import "./assets/styles/admin.css"

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
```

- [ ] **Step 4: Self-review**

Confirm: `package.json`'s `dependencies` block now lists `chart.js` and `vue-chartjs` (npm-managed, not hand-edited). `admin.css` scopes `.card`/`.shadow-soft` under `.admin-shell` — re-read the file to confirm no bare `.card`/`.shadow-soft` selector was written. `main.js`'s import order is unchanged except for the one new line.

- [ ] **Step 5: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are inside the correct working directory and branch. If either doesn't match what you were told, STOP and report back — do not commit.

```bash
git add package.json package-lock.json frontend/src/assets/styles/admin.css frontend/src/main.js
git commit -m "$(cat <<'EOF'
Add chart.js/vue-chartjs deps and shared admin CSS tokens

admin.css ports dashboard_pttun's --lib-green theme tokens, scoping the
.card/.shadow-soft overrides under .admin-shell so they can't collide
with the public site's existing Bootstrap .card usage.
EOF
)"
```

---

### Task 2: Auth store, real login/logout/session-check service, and a working LoginView

**Files:**
- Modify: `frontend/src/services/authService.js` — replace stub `login` with a full `login`/`logout`/`me` set.
- Create: `frontend/src/stores/auth.js`
- Delete: `frontend/src/stores/authStores.js` — unused stub (confirmed zero imports anywhere in the codebase), superseded by `stores/auth.js`.
- Modify: `frontend/src/views/LoginView.vue` — currently empty; add a real form.

**Interfaces:**
- Produces: `authService.login(username, password) => Promise<{ message, data: { username } }>`, `.logout() => Promise<{ message }>`, `.me() => Promise<{ message, data: { username } }>` — all reject with an `Error` carrying the backend's Indonesian message on non-2xx.
- Produces: Pinia store `useAuthStore` (id `'auth'`) — state `{ username: string|null, isAuthenticated: boolean, checking: boolean }`; actions `checkSession()`, `login(username, password)`, `logout()`.
- Consumes: `apiRequest` from the existing `frontend/src/services/api.js` (unmodified, public file — reused because `/api/auth/*` isn't admin-namespaced).

- [ ] **Step 1: Replace `frontend/src/services/authService.js`**

```js
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
```

- [ ] **Step 2: Create `frontend/src/stores/auth.js`**

```js
import { defineStore } from 'pinia'
import { login as loginRequest, logout as logoutRequest, me as meRequest } from '@/services/authService.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: null,
    isAuthenticated: false,
    checking: true,
  }),
  actions: {
    async checkSession() {
      this.checking = true
      try {
        const res = await meRequest()
        this.username = res.data.username
        this.isAuthenticated = true
      } catch {
        this.username = null
        this.isAuthenticated = false
      } finally {
        this.checking = false
      }
    },
    async login(username, password) {
      const res = await loginRequest(username, password)
      this.username = res.data.username
      this.isAuthenticated = true
    },
    async logout() {
      try {
        await logoutRequest()
      } finally {
        this.username = null
        this.isAuthenticated = false
      }
    },
  },
})
```

- [ ] **Step 3: Delete `frontend/src/stores/authStores.js`**

```bash
git rm frontend/src/stores/authStores.js
```

- [ ] **Step 4: Replace `frontend/src/views/LoginView.vue`**

```vue
<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleSubmit() {
  errorMsg.value = ''

  if (!username.value.trim() || !password.value) {
    errorMsg.value = 'Username dan password wajib diisi.'
    return
  }

  loading.value = true
  try {
    await authStore.login(username.value.trim(), password.value)
    router.push(route.query.redirect || '/admin/dashboard')
  } catch (error) {
    errorMsg.value = error.message || 'Username atau password salah.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap admin-shell d-flex align-items-center justify-content-center min-vh-100 bg-lib-green">
    <div class="card shadow-soft" style="width: 22rem">
      <div class="card-body p-4">
        <div class="text-center mb-4">
          <i class="bi bi-book-half fs-1 text-lib-green"></i>
          <h5 class="mt-2 mb-0">Perpus Admin</h5>
          <small class="text-muted">Masuk ke dashboard perpustakaan</small>
        </div>
        <form @submit.prevent="handleSubmit">
          <div v-if="errorMsg" class="alert alert-danger py-2">{{ errorMsg }}</div>
          <div class="mb-3">
            <label class="form-label">Username</label>
            <input v-model="username" type="text" class="form-control" autocomplete="username" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input
              v-model="password"
              type="password"
              class="form-control"
              autocomplete="current-password"
              required
            />
          </div>
          <button type="submit" class="btn btn-lib-green w-100 text-white" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
            Masuk
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-lib-green {
  background-color: var(--lib-green);
}

.btn-lib-green:hover {
  background-color: var(--lib-green-dark);
  color: #fff;
}
</style>
```

- [ ] **Step 5: Self-review**

Confirm: `authService.js`'s three exports all pass `credentials: 'include'`. `stores/auth.js`'s `checkSession()` never throws (catches and sets `isAuthenticated = false` — needed since this runs for every anonymous public visitor too, once wired in Task 9). No file anywhere still imports the deleted `authStores.js` (re-grep for `authStores` to confirm zero matches). `LoginView.vue`'s `router.push('/admin/dashboard')` target doesn't exist as a route yet — that's expected; the admin routes aren't registered until Task 9, so this view can't be end-to-end tested until then.

- [ ] **Step 6: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/services/authService.js frontend/src/stores/auth.js frontend/src/views/LoginView.vue
git rm frontend/src/stores/authStores.js
git commit -m "$(cat <<'EOF'
Add real login/logout/session-check auth store and working LoginView

authService.js now covers the full session lifecycle (all three calls
send credentials:'include' for the session cookie to round-trip).
stores/auth.js replaces the unused, never-imported token-shaped
authStores.js stub. LoginView.vue's form is new code, not a port —
dashboard_pttun's own LoginView was never functional. Not reachable
end-to-end yet — the /admin/* routes it targets are wired in a later
task.
EOF
)"
```

---

### Task 3: Admin layout shell — sidebar, topbar, AdminLayout

**Files:**
- Create: `frontend/src/data/adminMenu.js`
- Create: `frontend/src/components/admin/AppSidebar.vue`
- Create: `frontend/src/components/admin/AppTopbar.vue`
- Modify: `frontend/src/layouts/AdminLayout.vue` — currently empty; fill in.

**Interfaces:**
- Produces: `menuGroups` array exported from `data/adminMenu.js` — `[{ label: string|null, items: [{ label, icon, to }] }]`.
- Produces: `AdminLayout` — accepts a `title` prop (`String`, default `'Dashboard'`), renders `<slot />` for page content.
- Consumes: `useAuthStore` (Task 2) for the topbar's username display and logout button.

- [ ] **Step 1: Create `frontend/src/data/adminMenu.js`**

Ported from dashboard_pttun's `src/data/menu.js`, with every `to` path re-prefixed under `/admin` (dashboard's own paths were unprefixed):

```js
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
```

- [ ] **Step 2: Create `frontend/src/components/admin/AppSidebar.vue`**

Direct port of dashboard_pttun's `src/components/layout/AppSidebar.vue` (only the `menu.js` import path changes):

```vue
<script setup>
import { menuGroups } from '@/data/adminMenu.js'

defineProps({
  id: { type: String, default: 'sidebar' },
})
</script>

<template>
  <div :id="id" class="offcanvas-lg offcanvas-start sidebar-panel" tabindex="-1">
    <div class="d-flex align-items-center gap-2 px-4 py-4">
      <i class="bi bi-book-half fs-3 text-lib-green"></i>
      <div>
        <div class="fw-bold text-lib-green lh-1">Perpus Admin</div>
        <small class="text-muted">Library Dashboard</small>
      </div>
      <button
        type="button"
        class="btn-close d-lg-none ms-auto"
        data-bs-dismiss="offcanvas"
        :data-bs-target="`#${id}`"
        aria-label="Close"
      ></button>
    </div>

    <nav class="px-3 sidebar-nav">
      <template v-for="group in menuGroups" :key="group.label ?? 'root'">
        <div v-if="group.label" class="sidebar-group-label">{{ group.label }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          active-class="sidebar-link-active"
        >
          <i class="bi" :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>
  </div>
</template>

<style scoped>
.sidebar-panel {
  width: 260px;
  background-color: var(--lib-sidebar-bg);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-bottom: 2rem;
}

.sidebar-group-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9aa5b1;
  margin: 1rem 0.75rem 0.35rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  color: #495057;
  text-decoration: none;
  font-size: 0.92rem;
}

.sidebar-link i {
  font-size: 1.05rem;
  width: 1.2rem;
  text-align: center;
}

.sidebar-link:hover {
  background-color: rgba(10, 138, 95, 0.08);
  color: var(--lib-green);
}

.sidebar-link-active {
  background-color: var(--lib-green);
  color: #fff;
}
</style>
```

- [ ] **Step 3: Create `frontend/src/components/admin/AppTopbar.vue`**

Ported from dashboard_pttun's `src/components/layout/AppTopbar.vue`, with a logout button added — the original had no logout affordance anywhere, which would leave staff with no way to end a session:

```vue
<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

defineProps({
  title: { type: String, required: true },
})

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-between">
    <div class="d-flex align-items-center gap-3">
      <button
        class="btn btn-outline-light d-lg-none"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#sidebar"
        aria-controls="sidebar"
      >
        <i class="bi bi-list fs-5"></i>
      </button>
      <div>
        <small class="text-white-50 text-uppercase" style="letter-spacing: 0.08em">{{ title }}</small>
      </div>
    </div>

    <div class="d-flex align-items-center gap-3">
      <span class="text-white-50 small d-none d-md-inline">{{ authStore.username }}</span>
      <button type="button" class="btn btn-sm btn-outline-light" title="Keluar" @click="handleLogout">
        <i class="bi bi-box-arrow-right"></i>
      </button>
      <div
        class="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0"
        style="width: 40px; height: 40px"
      >
        <i class="bi bi-person-fill text-lib-green fs-5"></i>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Replace `frontend/src/layouts/AdminLayout.vue`**

Direct port of dashboard_pttun's `src/layouts/AdminLayout.vue`, only the child-component import paths change (`@/components/admin/...` instead of `@/components/layout/...`):

```vue
<script setup>
import AppSidebar from '@/components/admin/AppSidebar.vue'
import AppTopbar from '@/components/admin/AppTopbar.vue'

defineProps({
  title: { type: String, default: 'Dashboard' },
})
</script>

<template>
  <div class="d-flex admin-shell">
    <AppSidebar id="sidebar" />

    <div class="flex-grow-1 main-column">
      <header class="page-header bg-lib-green px-4 pt-4 pb-5">
        <AppTopbar :title="title" />
      </header>

      <main class="content-area px-4">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
}

.main-column {
  min-width: 0;
}

.page-header {
  background: linear-gradient(135deg, var(--lib-green), var(--lib-green-dark));
}

.content-area {
  padding-bottom: 2.5rem;
}
</style>
```

- [ ] **Step 5: Self-review**

Confirm: `adminMenu.js`'s every `to` value starts with `/admin/`. `AdminLayout.vue` contains no auth/session logic (matches spec Decision 3 — purely presentational). `AppTopbar.vue`'s logout button is the only new behavior beyond the direct port. None of these three files are reachable yet — no view imports `AdminLayout` until Task 5 onward, and no route renders any of them until Task 9.

- [ ] **Step 6: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/data/adminMenu.js frontend/src/components/admin/AppSidebar.vue frontend/src/components/admin/AppTopbar.vue frontend/src/layouts/AdminLayout.vue
git commit -m "$(cat <<'EOF'
Add admin layout shell — sidebar, topbar, AdminLayout

Ported from dashboard_pttun's proven layout components, menu paths
re-prefixed under /admin. AppTopbar gains a logout button (the
original had none) so the login this plan adds has a way to end a
session. Not reachable yet — no route renders AdminLayout until a
later task.
EOF
)"
```

---

### Task 4: Admin service layer

**Files:**
- Create: `frontend/src/services/adminApi.js`
- Create: `frontend/src/services/bookAdminService.js`
- Create: `frontend/src/services/categoryService.js`
- Create: `frontend/src/services/rakService.js`
- Create: `frontend/src/services/loanAdminService.js`
- Create: `frontend/src/services/uploadAdminService.js`

**Interfaces:**
- Produces: `adminApiRequest(path, options) => Promise<{ message, data }>` — throws `Error(message)` on non-2xx, same shape as the existing public `api.js`, but always sends `credentials: 'include'`.
- Produces: `bookAdminService.{getBuku, getBukuById, searchBuku, getSection, getDashboardStats, createBuku, updateBuku, deleteBuku}`.
- Produces: `categoryService.{getCategory, searchCategory, createCategory, updateCategory, deleteCategory}`.
- Produces: `rakService.{getRak, searchRak, createRak, updateRak, deleteRak}`.
- Produces: `loanAdminService.{getPeminjaman, updatePeminjaman, updateStatusPeminjaman, deletePeminjaman}`.
- Produces: `uploadAdminService.uploadCoverAdmin(file) => Promise<{ url, public_id, bytes, width, height }>`.
- Consumes: nothing from Tasks 1-3 (pure service files, kept deliberately independent of the layout/store work so they're each individually reviewable).

- [ ] **Step 1: Create `frontend/src/services/adminApi.js`**

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const adminApiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
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
```

- [ ] **Step 2: Create `frontend/src/services/bookAdminService.js`**

Endpoints match `backend/routes/adminBukuRoutes.js` exactly (`GET /api/admin/buku`, `/search`, `/section`, `/dashboard/stats`, `POST /`, `GET /PUT /DELETE /:id`):

```js
import { adminApiRequest } from './adminApi';

export const getBuku = () => adminApiRequest('/admin/buku');
export const getBukuById = (id) => adminApiRequest(`/admin/buku/${id}`);
export const searchBuku = (keyword) =>
  adminApiRequest(`/admin/buku/search?keyword=${encodeURIComponent(keyword)}`);
export const getSection = () => adminApiRequest('/admin/buku/section');
export const getDashboardStats = () => adminApiRequest('/admin/buku/dashboard/stats');
export const createBuku = (data) =>
  adminApiRequest('/admin/buku', { method: 'POST', body: JSON.stringify(data) });
export const updateBuku = (id, data) =>
  adminApiRequest(`/admin/buku/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBuku = (id) => adminApiRequest(`/admin/buku/${id}`, { method: 'DELETE' });
```

- [ ] **Step 3: Create `frontend/src/services/categoryService.js`**

Endpoints match `backend/routes/categoryRoutes.js`, mounted at `/api/admin/category` (singular — not dashboard_pttun's `/categories`):

```js
import { adminApiRequest } from './adminApi';

export const getCategory = () => adminApiRequest('/admin/category');
export const searchCategory = (keyword) =>
  adminApiRequest(`/admin/category/search?keyword=${encodeURIComponent(keyword)}`);
export const createCategory = (data) =>
  adminApiRequest('/admin/category', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id, data) =>
  adminApiRequest(`/admin/category/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory = (id) => adminApiRequest(`/admin/category/${id}`, { method: 'DELETE' });
```

- [ ] **Step 4: Create `frontend/src/services/rakService.js`**

Endpoints match `backend/routes/rakRoutes.js`, mounted at `/api/admin/rak`:

```js
import { adminApiRequest } from './adminApi';

export const getRak = () => adminApiRequest('/admin/rak');
export const searchRak = (keyword) =>
  adminApiRequest(`/admin/rak/search?keyword=${encodeURIComponent(keyword)}`);
export const createRak = (data) =>
  adminApiRequest('/admin/rak', { method: 'POST', body: JSON.stringify(data) });
export const updateRak = (id, data) =>
  adminApiRequest(`/admin/rak/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRak = (id) => adminApiRequest(`/admin/rak/${id}`, { method: 'DELETE' });
```

- [ ] **Step 5: Create `frontend/src/services/loanAdminService.js`**

Endpoints match `backend/routes/adminPeminjamanRoutes.js`, mounted at `/api/admin/peminjaman`. `updateStatusPeminjaman` is new (not in dashboard_pttun's original `loanService.js`) — backs the "Tandai Dikembalikan" button from spec Decision 6:

```js
import { adminApiRequest } from './adminApi';

export const getPeminjaman = () => adminApiRequest('/admin/peminjaman');
export const updatePeminjaman = (id, data) =>
  adminApiRequest(`/admin/peminjaman/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateStatusPeminjaman = (id, status) =>
  adminApiRequest(`/admin/peminjaman/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
export const deletePeminjaman = (id) => adminApiRequest(`/admin/peminjaman/${id}`, { method: 'DELETE' });
```

- [ ] **Step 6: Create `frontend/src/services/uploadAdminService.js`**

Not a JSON call — multipart form upload, so it doesn't go through `adminApi.js`. Targets `/api/admin/upload/cover` (dashboard_pttun's original `uploadService.js` hit the unauthenticated `/upload/cover`):

```js
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
```

- [ ] **Step 7: Syntax check**

```bash
node --check frontend/src/services/adminApi.js
node --check frontend/src/services/bookAdminService.js
node --check frontend/src/services/categoryService.js
node --check frontend/src/services/rakService.js
node --check frontend/src/services/loanAdminService.js
node --check frontend/src/services/uploadAdminService.js
```
Expected: no output (all pass — the repo root `package.json` has `"type": "module"`, so `node --check` parses these as ESM without needing to resolve the `import` targets).

- [ ] **Step 8: Self-review**

Confirm: every path is prefixed `/admin/` except none — re-verify against the actual mounted routes listed in this task's Interfaces block (`/api/admin/buku`, `/api/admin/category` singular, `/api/admin/rak`, `/api/admin/peminjaman`, `/api/admin/upload/cover`). `adminApi.js` and `uploadAdminService.js` both set `credentials: 'include'`. No file in this task imports anything from Tasks 1-3 (kept independent, as designed).

- [ ] **Step 9: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/services/adminApi.js frontend/src/services/bookAdminService.js frontend/src/services/categoryService.js frontend/src/services/rakService.js frontend/src/services/loanAdminService.js frontend/src/services/uploadAdminService.js
git commit -m "$(cat <<'EOF'
Add admin service layer (buku, category, rak, peminjaman, upload)

Kept separate from the existing public bookService.js/loanService.js/
api.js, mirroring the backend's Admin-suffixed naming split. Every
call targets the already-live /api/admin/* routes and sends
credentials:'include' for the session cookie. Not consumed by any
view yet.
EOF
)"
```

---

### Task 5: Categories and Shelves views

**Files:**
- Create: `frontend/src/views/admin/CategoriesView.vue`
- Create: `frontend/src/views/admin/ShelvesView.vue`

**Interfaces:**
- Consumes: `categoryService` and `rakService` (Task 4), `bookAdminService.getBuku` (Task 4, used only to compute per-category/per-rak book counts), `AdminLayout` (Task 3).
- Produces: two standalone route-target components — no route registers them until Task 9.

- [ ] **Step 1: Create `frontend/src/views/admin/CategoriesView.vue`**

Ported from dashboard_pttun's `src/views/CategoriesView.vue`. Only the service imports and the breadcrumb's `RouterLink` target change:

```vue
<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { getCategory, createCategory, updateCategory, deleteCategory } from '@/services/categoryService.js'
import { getBuku } from '@/services/bookAdminService.js'

// State Data
const categories = ref([])
const books = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Search & Pagination
const searchKeyword = ref('')
const page = ref(1)
const pageSize = 10

// Modal & Form State
const modalEl = ref(null)
let modalInstance = null
const editingId = ref(null)

const emptyForm = () => ({
  nama_category: '',
})
const form = reactive(emptyForm())
const formError = ref('')

// CSS Style untuk Pagination Active
const pageNumberActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}

// 1. Fetch Data Kategori & Data Buku (untuk menghitung jumlah relasi buku)
async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [catRes, bookRes] = await Promise.all([getCategory(), getBuku()])
    categories.value = catRes.data || []
    books.value = bookRes.data || []
  } catch (error) {
    errorMsg.value = error.message || 'Gagal memuat data kategori.'
  } finally {
    loading.value = false
  }
}

// Computed: Menghitung berapa banyak buku dalam setiap kategori
const categoryBookCounts = computed(() => {
  const counts = {}
  for (const b of books.value) {
    if (b.id_category) {
      counts[b.id_category] = (counts[b.id_category] || 0) + 1
    }
  }
  return counts
})

// Filter & Pagination
const filteredCategories = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return categories.value
  return categories.value.filter(
    (c) =>
      c.nama_category?.toLowerCase().includes(keyword) ||
      c.deskripsi?.toLowerCase().includes(keyword)
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCategories.value.length / pageSize)))

const pagedCategories = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredCategories.value.slice(start, start + pageSize)
})

const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = page.value

  if (total <= 1) return []
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const siblingCount = 1
  const start = Math.max(2, current - siblingCount)
  const end = Math.min(total - 1, current + siblingCount)

  const pages = [1]
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)

  return pages
})

function goToPage(n) {
  if (n < 1 || n > totalPages.value || n === page.value) return
  page.value = n
}

function resetPageOnSearch() {
  page.value = 1
}

// Handler Modal Create / Edit
function openCreateModal() {
  editingId.value = null
  formError.value = ''
  Object.assign(form, emptyForm())
  modalInstance?.show()
}

function openEditModal(category) {
  editingId.value = category.id_category
  formError.value = ''
  Object.assign(form, {
    nama_category: category.nama_category ?? '',
    deskripsi: category.deskripsi ?? ''
  })
  modalInstance?.show()
}

// Submit Form
async function submitForm() {
  formError.value = ''

  if (!form.nama_category.trim()) {
    formError.value = 'Nama kategori wajib diisi.'
    return
  }

  const payload = {
    nama_category: form.nama_category.trim(),
    deskripsi: form.deskripsi ? form.deskripsi.trim() : null
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateCategory(editingId.value, payload)
      successMsg.value = 'Kategori berhasil diperbarui.'
    } else {
      await createCategory(payload)
      successMsg.value = 'Kategori baru berhasil ditambahkan.'
    }
    modalInstance?.hide()
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    formError.value = error.message || 'Gagal menyimpan data.'
  } finally {
    saving.value = false
  }
}

// Delete Handler
async function handleDelete(category) {
  const count = categoryBookCounts.value[category.id_category] || 0
  if (count > 0) {
    alert(`Tidak dapat menghapus kategori "${category.nama_category}" karena terdapat ${count} buku yang terhubung dengan kategori ini.`)
    return
  }

  const confirmed = window.confirm(`Hapus kategori "${category.nama_category}"?`)
  if (!confirmed) return

  try {
    await deleteCategory(category.id_category)
    successMsg.value = 'Kategori berhasil dihapus.'
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message || 'Gagal menghapus kategori.'
  }
}

onMounted(async () => {
  await nextTick()
  if (modalEl.value) {
    modalInstance = new Modal(modalEl.value)
  }
  loadData()
})
</script>

<template>
  <AdminLayout title="Kategori Buku">
    <div class="pt-4">
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <RouterLink to="/admin/dashboard">Dashboard</RouterLink>
          </li>
          <li class="breadcrumb-item active" aria-current="page">Kategori Buku</li>
        </ol>
      </nav>

      <!-- Alert Notification -->
      <div v-if="successMsg" class="alert alert-success alert-dismissible fade show" role="alert">
        {{ successMsg }}
        <button type="button" class="btn-close" @click="successMsg = ''"></button>
      </div>
      <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ errorMsg }}
        <button type="button" class="btn-close" @click="errorMsg = ''"></button>
      </div>

      <!-- Main Card -->
      <div class="card shadow-soft">
        <div class="card-body">
          <!-- Top Bar (Search & Button) -->
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h6 class="mb-0 text-nowrap">Kategori Buku</h6>
            <div class="d-flex gap-2 flex-grow-1">
              <input
                v-model="searchKeyword"
                @input="resetPageOnSearch"
                type="text"
                class="form-control form-control-sm flex-grow-1"
              />
              <button
                class="btn btn-sm text-white text-nowrap"
                style="background-color: var(--lib-green)"
                @click="openCreateModal"
              >
                <i class="bi bi-plus-lg me-1"></i>Tambah Kategori
              </button>
            </div>
          </div>

          <!-- Loading Spinner -->
          <div v-if="loading" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Memuat data kategori...
          </div>

          <!-- Table Kategori -->
          <div v-else class="table-responsive">
            <table class="table table-striped table-hover align-middle mb-0">
              <thead>
                <tr class="text-muted small text-uppercase">
                  <th style="width: 50px;">#</th>
                  <th style="min-width: 180px;">Nama Kategori</th>
                  <th style="width: 130px;" class="text-center">Jumlah Buku</th>
                  <th class="text-end" style="width: 100px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedCategories.length === 0">
                  <td colspan="5" class="text-center text-muted py-4">
                    Tidak ada data kategori yang ditemukan.
                  </td>
                </tr>

                <tr v-for="(cat, idx) in pagedCategories" :key="cat.id_category">
                  <td class="text-muted small">{{ (page - 1) * pageSize + idx + 1 }}</td>
                  <td class="fw-semibold text-dark">
                    {{ cat.nama_category }}
                  </td>
                  <td class="text-center">
                    <span class="badge rounded-pill bg-light text-dark border">
                      <i class="bi bi-book me-1"></i>
                      {{ categoryBookCounts[cat.id_category] || 0 }} Buku
                    </span>
                  </td>
                  <td class="text-end text-nowrap" style="width: 100px; min-width: 100px;">
                    <div class="d-inline-flex gap-1 flex-nowrap">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        title="Edit"
                        @click="openEditModal(cat)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        title="Hapus"
                        @click="handleDelete(cat)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Nav -->
          <nav v-if="!loading && totalPages > 1" class="pagination-nav" aria-label="Navigasi halaman">
            <button
              v-if="page > 1"
              type="button"
              class="page-arrow"
              @click="goToPage(page - 1)"
              aria-label="Halaman sebelumnya"
            >
              <i class="bi bi-chevron-left"></i>
            </button>

            <template v-for="(n, index) in pageNumbers" :key="`${n}-${index}`">
              <span v-if="n === '...'" class="page-ellipsis">...</span>
              <button
                v-else
                type="button"
                class="page-number"
                :class="{ active: n === page }"
                :style="n === page ? pageNumberActiveStyle : null"
                @click="goToPage(n)"
              >
                {{ n }}
              </button>
            </template>

            <button
              v-if="page < totalPages"
              type="button"
              class="page-arrow"
              @click="goToPage(page + 1)"
              aria-label="Halaman berikutnya"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </nav>
        </div>
      </div>
    </div>

    <!-- Modal Form (Create / Edit) -->
    <div ref="modalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="submitForm">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingId ? 'Edit Kategori' : 'Tambah Kategori Baru' }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <div v-if="formError" class="alert alert-danger py-2 mb-3">{{ formError }}</div>

              <div class="mb-3">
                <label class="form-label">Nama Kategori <span class="text-danger">*</span></label>
                <input
                  v-model="form.nama_category"
                  type="text"
                  class="form-control"
                  placeholder="Contoh: Peraturan, Monografi, Majalah..."
                  required
                />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
              <button
                type="submit"
                class="btn text-white"
                style="background-color: var(--lib-green)"
                :disabled="saving"
              >
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}

/* Pagination Styling */
.pagination-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #d8dee6;
  background-color: #fff;
  color: #1e293b;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.page-number:hover {
  background-color: #f2f7f5;
  border-color: var(--lib-green);
}

.page-number.active {
  background-color: var(--lib-green);
  border-color: var(--lib-green);
  color: #fff;
}

.page-ellipsis {
  width: 34px;
  text-align: center;
  color: #64748b;
  font-weight: 600;
}

.page-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: none;
  color: var(--lib-green);
  font-size: 15px;
  cursor: pointer;
}

.page-arrow:hover {
  color: var(--lib-green-dark);
}
</style>
```

- [ ] **Step 2: Create `frontend/src/views/admin/ShelvesView.vue`**

Ported from dashboard_pttun's `src/views/ShelvesView.vue`, same adaptation pattern:

```vue
<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { getRak, createRak, updateRak, deleteRak } from '@/services/rakService.js'
import { getBuku } from '@/services/bookAdminService.js'

// State Data
const shelves = ref([])
const books = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Search & Pagination
const searchKeyword = ref('')
const page = ref(1)
const pageSize = 10

// Modal & Form State
const modalEl = ref(null)
let modalInstance = null
const editingId = ref(null)

const emptyForm = () => ({
  nama_rak: '',
})
const form = reactive(emptyForm())
const formError = ref('')

// Style Pagination Active
const pageNumberActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}

// Fetch Data Rak & Buku (untuk menghitung jumlah buku per rak)
async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [rakRes, bookRes] = await Promise.all([getRak(), getBuku()])
    shelves.value = rakRes.data || []
    books.value = bookRes.data || []
  } catch (error) {
    errorMsg.value = error.message || 'Gagal memuat data rak.'
  } finally {
    loading.value = false
  }
}

// Computed: Menghitung berapa banyak buku di setiap rak
const shelfBookCounts = computed(() => {
  const counts = {}
  for (const b of books.value) {
    if (b.id_rak) {
      counts[b.id_rak] = (counts[b.id_rak] || 0) + 1
    }
  }
  return counts
})

// Filter & Pagination
const filteredShelves = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return shelves.value
  return shelves.value.filter((r) => r.nama_rak?.toLowerCase().includes(keyword))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredShelves.value.length / pageSize)))

const pagedShelves = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredShelves.value.slice(start, start + pageSize)
})

const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = page.value

  if (total <= 1) return []
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const siblingCount = 1
  const start = Math.max(2, current - siblingCount)
  const end = Math.min(total - 1, current + siblingCount)

  const pages = [1]
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)

  return pages
})

function goToPage(n) {
  if (n < 1 || n > totalPages.value || n === page.value) return
  page.value = n
}

function resetPageOnSearch() {
  page.value = 1
}

// Modal Handlers
function openCreateModal() {
  editingId.value = null
  formError.value = ''
  Object.assign(form, emptyForm())
  modalInstance?.show()
}

function openEditModal(rak) {
  editingId.value = rak.id_rak
  formError.value = ''
  Object.assign(form, {
    nama_rak: rak.nama_rak ?? '',
  })
  modalInstance?.show()
}

// Submit Form
async function submitForm() {
  formError.value = ''

  if (!form.nama_rak.trim()) {
    formError.value = 'Nama rak wajib diisi.'
    return
  }

  const payload = {
    nama_rak: form.nama_rak.trim(),
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateRak(editingId.value, payload)
      successMsg.value = 'Data rak berhasil diperbarui.'
    } else {
      await createRak(payload)
      successMsg.value = 'Rak baru berhasil ditambahkan.'
    }
    modalInstance?.hide()
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    formError.value = error.message || 'Gagal menyimpan data.'
  } finally {
    saving.value = false
  }
}

// Delete Handler
async function handleDelete(rak) {
  const count = shelfBookCounts.value[rak.id_rak] || 0
  if (count > 0) {
    alert(`Tidak dapat menghapus rak "${rak.nama_rak}" karena terdapat ${count} buku yang tersimpan di rak ini.`)
    return
  }

  const confirmed = window.confirm(`Hapus rak "${rak.nama_rak}"?`)
  if (!confirmed) return

  try {
    await deleteRak(rak.id_rak)
    successMsg.value = 'Rak berhasil dihapus.'
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message || 'Gagal menghapus rak.'
  }
}

onMounted(async () => {
  await nextTick()
  if (modalEl.value) {
    modalInstance = new Modal(modalEl.value)
  }
  loadData()
})
</script>

<template>
  <AdminLayout title="Daftar Rak">
    <div class="pt-4">
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <RouterLink to="/admin/dashboard">Dashboard</RouterLink>
          </li>
          <li class="breadcrumb-item active" aria-current="page">Daftar Rak</li>
        </ol>
      </nav>

      <!-- Alert Notification -->
      <div v-if="successMsg" class="alert alert-success alert-dismissible fade show" role="alert">
        {{ successMsg }}
        <button type="button" class="btn-close" @click="successMsg = ''"></button>
      </div>
      <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ errorMsg }}
        <button type="button" class="btn-close" @click="errorMsg = ''"></button>
      </div>

      <!-- Main Card -->
      <div class="card shadow-soft">
        <div class="card-body">
          <!-- Top Bar -->
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h6 class="mb-0 text-nowrap">Daftar Rak Perpus</h6>
            <div class="d-flex gap-2 flex-grow-1">
              <input
                v-model="searchKeyword"
                @input="resetPageOnSearch"
                type="text"
                class="form-control form-control-sm flex-grow-1"
                placeholder="Cari nama rak..."
              />
              <button
                class="btn btn-sm text-white text-nowrap"
                style="background-color: var(--lib-green)"
                @click="openCreateModal"
              >
                <i class="bi bi-plus-lg me-1"></i>Tambah Rak
              </button>
            </div>
          </div>

          <!-- Loading Spinner -->
          <div v-if="loading" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Memuat data rak...
          </div>

          <!-- Table Rak -->
          <div v-else class="table-responsive">
            <table class="table table-striped table-hover align-middle mb-0">
              <thead>
                <tr class="text-muted small text-uppercase">
                  <th style="width: 50px;">#</th>
                  <th style="min-width: 150px;">Nama Rak</th>
                  <th style="width: 130px;" class="text-center">Kapasitas Terisi</th>
                  <th class="text-end" style="width: 100px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedShelves.length === 0">
                  <td colspan="6" class="text-center text-muted py-4">
                    Tidak ada data rak yang ditemukan.
                  </td>
                </tr>

                <tr v-for="(rak, idx) in pagedShelves" :key="rak.id_rak">
                  <td class="text-muted small">{{ (page - 1) * pageSize + idx + 1 }}</td>
                  <td class="fw-semibold text-dark">
                    <i class="bi bi-archive me-1 text-secondary"></i>
                    {{ rak.nama_rak }}
                  </td>
                  <td class="text-center">
                    <span class="badge rounded-pill bg-light text-dark border">
                      <i class="bi bi-book me-1"></i>
                      {{ shelfBookCounts[rak.id_rak] || 0 }} Buku
                    </span>
                  </td>
                  <td class="text-end text-nowrap">
                    <div class="d-inline-flex gap-1">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        title="Edit"
                        @click="openEditModal(rak)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        title="Hapus"
                        @click="handleDelete(rak)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Nav -->
          <nav v-if="!loading && totalPages > 1" class="pagination-nav" aria-label="Navigasi halaman">
            <button v-if="page > 1" type="button" class="page-arrow" @click="goToPage(page - 1)">
              <i class="bi bi-chevron-left"></i>
            </button>

            <template v-for="(n, index) in pageNumbers" :key="`${n}-${index}`">
              <span v-if="n === '...'" class="page-ellipsis">...</span>
              <button
                v-else
                type="button"
                class="page-number"
                :class="{ active: n === page }"
                :style="n === page ? pageNumberActiveStyle : null"
                @click="goToPage(n)"
              >
                {{ n }}
              </button>
            </template>

            <button v-if="page < totalPages" type="button" class="page-arrow" @click="goToPage(page + 1)">
              <i class="bi bi-chevron-right"></i>
            </button>
          </nav>
        </div>
      </div>
    </div>

    <!-- Modal Form (Create / Edit) -->
    <div ref="modalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="submitForm">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingId ? 'Edit Rak' : 'Tambah Rak Baru' }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <div v-if="formError" class="alert alert-danger py-2 mb-3">{{ formError }}</div>

              <div class="mb-3">
                <label class="form-label">Nama / Kode Rak <span class="text-danger">*</span></label>
                <input
                  v-model="form.nama_rak"
                  type="text"
                  class="form-control"
                  placeholder="Contoh: Rak A1, Rak Fiksi 02"
                  required
                />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
              <button
                type="submit"
                class="btn text-white"
                style="background-color: var(--lib-green)"
                :disabled="saving"
              >
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}

/* Pagination Styling */
.pagination-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #d8dee6;
  background-color: #fff;
  color: #1e293b;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.page-number:hover {
  background-color: #f2f7f5;
  border-color: var(--lib-green);
}

.page-number.active {
  background-color: var(--lib-green);
  border-color: var(--lib-green);
  color: #fff;
}

.page-ellipsis {
  width: 34px;
  text-align: center;
  color: #64748b;
  font-weight: 600;
}

.page-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: none;
  color: var(--lib-green);
  font-size: 15px;
  cursor: pointer;
}

.page-arrow:hover {
  color: var(--lib-green-dark);
}
</style>
```

- [ ] **Step 3: Self-review**

Confirm: both files import from the new admin-suffixed service files only (`categoryService.js`/`rakService.js`/`bookAdminService.js`), never the public `bookService.js`. Both breadcrumbs link to `/admin/dashboard`. `nama_category`/`nama_rak` field names match the real DB columns (confirmed against `CategoryModel.js`/`RakModel.js` this session). Neither file is reachable yet — no route renders them until Task 9.

- [ ] **Step 4: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/views/admin/CategoriesView.vue frontend/src/views/admin/ShelvesView.vue
git commit -m "$(cat <<'EOF'
Add CategoriesView and ShelvesView admin pages

Ported from dashboard_pttun's working list+modal-CRUD pattern, service
imports switched to the new admin-suffixed service files. Not
reachable yet — routes are wired in a later task.
EOF
)"
```

---

### Task 6: Books view (with cover upload, no cover scanner)

**Files:**
- Create: `frontend/src/views/admin/BooksView.vue`

**Interfaces:**
- Consumes: `bookAdminService.{getBuku, getSection, createBuku, updateBuku, deleteBuku}`, `categoryService.getCategory`, `rakService.getRak`, `uploadAdminService.uploadCoverAdmin` (all Task 4), `AdminLayout` (Task 3).

- [ ] **Step 1: Create `frontend/src/views/admin/BooksView.vue`**

Ported from dashboard_pttun's `src/views/BooksView.vue`. Per spec Decision 4: `CoverScanner` is **not** imported or rendered — the URL-text-input-plus-scan-button form is replaced with a plain file input that uploads directly via `uploadCoverAdmin`, with a comment marking Plan 4's hook point:

```vue
<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { getBuku, getSection, createBuku, updateBuku, deleteBuku } from '@/services/bookAdminService.js'
import { getCategory } from '@/services/categoryService.js'
import { getRak } from '@/services/rakService.js'
import { uploadCoverAdmin } from '@/services/uploadAdminService.js'

const books = ref([])
const categories = ref([])
const rakList = ref([])
const sectionList = ref([])

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const uploadingCover = ref(false)
const uploadError = ref('')

const searchKeyword = ref('')
const selectedRak = ref('') // '' = Semua Rak
const page = ref(1)
const pageSize = 10

const modalEl = ref(null)
let modalInstance = null

const editingId = ref(null)
const emptyForm = () => ({
  judul_buku: '',
  id_category: '',
  pengarang: '',
  penerbit: '',
  tahun_terbit: '',
  halaman: '',
  id_rak: '',
  id_section: '',
  total_buku: 1,
  stok_tersedia: 1,
  image_url: '',
})
const form = reactive(emptyForm())
const formError = ref('')

function statusBadgeClass(status) {
  return status === 'Tersedia' ? 'bg-success' : 'bg-secondary'
}

const rakPillActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}
const pageNumberActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}

async function loadBooks() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await getBuku()
    books.value = res.data
  } catch (error) {
    errorMsg.value = error.message
  } finally {
    loading.value = false
  }
}

async function loadLookups() {
  try {
    const [catRes, rakRes, sectionRes] = await Promise.all([getCategory(), getRak(), getSection()])
    categories.value = catRes.data
    rakList.value = rakRes.data
    sectionList.value = sectionRes.data
  } catch (error) {
    errorMsg.value = error.message
  }
}

// Jumlah buku per rak, dipakai untuk badge angka di pill rak
const rakCounts = computed(() => {
  const counts = {}
  for (const b of books.value) {
    counts[b.id_rak] = (counts[b.id_rak] || 0) + 1
  }
  return counts
})

function selectRak(id_rak) {
  selectedRak.value = id_rak
  page.value = 1
}

const rakFilteredBooks = computed(() => {
  if (!selectedRak.value) return books.value
  return books.value.filter((b) => b.id_rak === selectedRak.value)
})

const filteredBooks = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return rakFilteredBooks.value
  return rakFilteredBooks.value.filter(
    (b) =>
      b.judul_buku?.toLowerCase().includes(keyword) ||
      b.pengarang?.toLowerCase().includes(keyword) ||
      b.nama_category?.toLowerCase().includes(keyword),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredBooks.value.length / pageSize)))

const pagedBooks = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredBooks.value.slice(start, start + pageSize)
})

// Nomor halaman dengan elipsis, meniru pagination di pttunLibrary
const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = page.value

  if (total <= 1) return []
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const siblingCount = 1
  const start = Math.max(2, current - siblingCount)
  const end = Math.min(total - 1, current + siblingCount)

  const pages = [1]
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)

  return pages
})

function goToPage(n) {
  if (n < 1 || n > totalPages.value || n === page.value) return
  page.value = n
}

function resetPageOnSearch() {
  page.value = 1
}

function openCreateModal() {
  editingId.value = null
  formError.value = ''
  uploadError.value = ''
  Object.assign(form, emptyForm())
  if (selectedRak.value) {
    form.id_rak = selectedRak.value
  }
  modalInstance?.show()
}

function openEditModal(book) {
  editingId.value = book.id_buku
  formError.value = ''
  uploadError.value = ''
  Object.assign(form, {
    judul_buku: book.judul_buku ?? '',
    id_category: book.id_category ?? '',
    pengarang: book.pengarang ?? '',
    penerbit: book.penerbit ?? '',
    tahun_terbit: book.tahun_terbit ?? '',
    halaman: book.halaman ?? '',
    id_rak: book.id_rak ?? '',
    id_section: book.id_section ?? '',
    total_buku: book.total_buku ?? 1,
    stok_tersedia: book.stok_tersedia ?? 1,
    image_url: book.image_url ?? '',
  })
  modalInstance?.show()
}

async function handleCoverFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  uploadingCover.value = true
  uploadError.value = ''
  try {
    const result = await uploadCoverAdmin(file)
    form.image_url = result.url
  } catch (error) {
    uploadError.value = error.message
  } finally {
    uploadingCover.value = false
    event.target.value = ''
  }
}

async function submitForm() {
  formError.value = ''

  if (!form.judul_buku.trim()) {
    formError.value = 'Judul buku wajib diisi.'
    return
  }
  if (!form.id_rak) {
    formError.value = 'Rak wajib dipilih.'
    return
  }

  const payload = {
    judul_buku: form.judul_buku.trim(),
    id_category: form.id_category || null,
    pengarang: form.pengarang || null,
    penerbit: form.penerbit || null,
    tahun_terbit: form.tahun_terbit ? Number(form.tahun_terbit) : null,
    halaman: form.halaman ? Number(form.halaman) : null,
    id_rak: Number(form.id_rak),
    id_section: form.id_section || null,
    total_buku: Number(form.total_buku) || 1,
    stok_tersedia: Number(form.stok_tersedia) || 0,
    image_url: form.image_url || null,
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateBuku(editingId.value, payload)
      successMsg.value = 'Buku berhasil diperbarui.'
    } else {
      await createBuku(payload)
      successMsg.value = 'Buku baru berhasil ditambahkan.'
    }
    modalInstance?.hide()
    await loadBooks()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    formError.value = error.message
  } finally {
    saving.value = false
  }
}

async function handleDelete(book) {
  const confirmed = window.confirm(`Hapus buku "${book.judul_buku}"? Tindakan ini tidak bisa dibatalkan.`)
  if (!confirmed) return

  try {
    await deleteBuku(book.id_buku)
    successMsg.value = 'Buku berhasil dihapus.'
    await loadBooks()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message
  }
}

onMounted(async () => {
  await nextTick()
  if (modalEl.value) {
    modalInstance = new Modal(modalEl.value)
  }
  loadLookups()
  loadBooks()
})
</script>

<template>
  <AdminLayout title="Daftar Buku">
    <div class="pt-4">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <RouterLink to="/admin/dashboard">Dashboard</RouterLink>
          </li>
          <li class="breadcrumb-item active" aria-current="page">Daftar Buku</li>
        </ol>
      </nav>

      <div v-if="successMsg" class="alert alert-success alert-dismissible fade show" role="alert">
        {{ successMsg }}
        <button type="button" class="btn-close" @click="successMsg = ''"></button>
      </div>
      <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ errorMsg }}
        <button type="button" class="btn-close" @click="errorMsg = ''"></button>
      </div>

      <div class="card shadow-soft">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h6 class="mb-0">Data Buku</h6>
            <div class="d-flex gap-2 flex-grow-1">
              <input v-model="searchKeyword" @input="resetPageOnSearch" type="text"
                class="form-control-sm flex-grow-1"
                placeholder="Cari judul, pengarang, kategori..." style="min-width: 240px" />
              <button class="btn btn-sm text-white" style="background-color: var(--lib-green)"
                @click="openCreateModal">
                <i class="bi bi-plus-lg me-1"></i>Tambah Buku
              </button>
            </div>
          </div>

          <div class="rak-pills mb-3">
            <button type="button" class="rak-pill" :class="{ active: selectedRak === '' }"
              :style="selectedRak === '' ? rakPillActiveStyle : null" @click="selectRak('')">
              Semua Rak <span class="rak-pill-count">{{ books.length }}</span>
            </button>
            <button v-for="r in rakList" :key="r.id_rak" type="button" class="rak-pill"
              :class="{ active: selectedRak === r.id_rak }"
              :style="selectedRak === r.id_rak ? rakPillActiveStyle : null"
              @click="selectRak(r.id_rak)">
              {{ r.nama_rak }} <span class="rak-pill-count">{{ rakCounts[r.id_rak] || 0 }}</span>
            </button>
          </div>

          <div v-if="loading" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Memuat data buku...
          </div>

          <div v-else class="table-responsive">
  <table class="table table-striped table-hover align-middle mb-0">
    <thead>
      <tr class="text-muted small text-uppercase">
        <th style="width: 60px;">Cover</th>
        <th>Judul</th>
        <th>Kategori</th>
        <th>Pengarang</th>
        <th>Tahun</th>
        <th>Rak</th>
        <th>Stok</th>
        <th>Status</th>
        <th class="text-end">Aksi</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="pagedBooks.length === 0">
        <td colspan="9" class="text-center text-muted py-4">
          Tidak ada data buku di rak ini.
        </td>
      </tr>
        <tr v-for="book in pagedBooks" :key="book.id_buku">
          <td>
            <img
              v-if="book.image_url"
              :src="book.image_url"
              alt="Cover"
              class="cover-thumb-table rounded border"
            />
            <div v-else class="cover-placeholder rounded bg-light border text-muted d-flex align-items-center justify-content-center">
              <i class="bi bi-book small"></i>
            </div>
          </td>

          <td style="max-width:300px;"  :title="book.judul_buku">
            {{ book.judul_buku }}
          </td>
          <td>{{ book.nama_category ?? '-' }}</td>
          <td>{{ book.pengarang ?? '-' }}</td>
          <td>{{ book.tahun_terbit ?? '-' }}</td>
          <td>{{ book.nama_rak ?? '-' }}</td>
          <td>{{ book.stok_tersedia }} / {{ book.total_buku }}</td>
          <td>
            <span class="badge" :class="statusBadgeClass(book.status_buku)">
              {{ book.status_buku }}
            </span>
          </td>
        <td class="text-end text-nowrap" style="width: 100px; min-width: 100px;">
            <div class="d-inline-flex gap-1 flex-nowrap">
            <button class="btn btn-sm btn-outline-secondary" title="Edit" @click="openEditModal(book)">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" title="Hapus" @click="handleDelete(book)">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
        </tr>
      </tbody>
    </table>
  </div>

          <nav v-if="!loading && totalPages > 1" class="pagination-nav"
            aria-label="Navigasi halaman">
            <button v-if="page > 1" type="button" class="page-arrow" @click="goToPage(page - 1)"
              aria-label="Halaman sebelumnya">
              <i class="bi bi-chevron-left"></i>
            </button>

            <template v-for="(n, index) in pageNumbers" :key="`${n}-${index}`">
              <span v-if="n === '...'" class="page-ellipsis">...</span>
              <button v-else type="button" class="page-number" :class="{ active: n === page }"
                :style="n === page ? pageNumberActiveStyle : null" @click="goToPage(n)">
                {{ n }}
              </button>
            </template>

            <button v-if="page < totalPages" type="button" class="page-arrow"
              @click="goToPage(page + 1)" aria-label="Halaman berikutnya">
              <i class="bi bi-chevron-right"></i>
            </button>
          </nav>
        </div>
      </div>
    </div>

    <div ref="modalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <form @submit.prevent="submitForm">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingId ? 'Edit Buku' : 'Tambah Buku' }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"
                aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div v-if="formError" class="alert alert-danger py-2">{{ formError }}</div>

              <div class="mb-3">
                <label class="form-label">Judul Buku <span class="text-danger">*</span></label>
                <input v-model="form.judul_buku" type="text" class="form-control" required />
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Kategori</label>
                  <select v-model="form.id_category" class="form-select">
                    <option value="">- Pilih kategori -</option>
                    <option v-for="c in categories" :key="c.id_category" :value="c.id_category">
                      {{ c.nama_category }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Pengarang</label>
                  <input v-model="form.pengarang" type="text" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Penerbit</label>
                  <input v-model="form.penerbit" type="text" class="form-control" />
                </div>
                <div class="col-md-3">
                  <label class="form-label">Tahun Terbit</label>
                  <input v-model="form.tahun_terbit" type="number" class="form-control" />
                </div>
                <div class="col-md-3">
                  <label class="form-label">Halaman</label>
                  <input v-model="form.halaman" type="number" class="form-control" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Rak <span class="text-danger">*</span></label>
                  <select v-model="form.id_rak" class="form-select" required>
                    <option value="">- Pilih rak -</option>
                    <option v-for="r in rakList" :key="r.id_rak" :value="r.id_rak">{{ r.nama_rak }}
                    </option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Section</label>
                  <select v-model="form.id_section" class="form-select">
                    <option value="">- Pilih section -</option>
                    <option v-for="s in sectionList" :key="s.id_section" :value="s.id_section">
                      {{ s.nama_section }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Jumlah Eksemplar</label>
                  <input v-model="form.total_buku" type="number" min="1" class="form-control" />
                </div>
                <div v-if="editingId" class="col-md-4">
                  <label class="form-label">Stok Tersedia</label>
                  <input v-model="form.stok_tersedia" type="number" min="0" class="form-control" />
                </div>
                <div class="col-md-8">
                  <label class="form-label">Cover Buku</label>
                  <div class="d-flex align-items-start gap-2">
                    <img v-if="form.image_url" :src="form.image_url" alt="Preview cover"
                      class="cover-thumb" />
                    <div class="flex-grow-1">
                      <input
                        type="file"
                        accept="image/*"
                        class="form-control form-control-sm mb-1"
                        :disabled="uploadingCover"
                        @change="handleCoverFileChange"
                      />
                      <div v-if="uploadingCover" class="small text-muted">
                        <span class="spinner-border spinner-border-sm me-1"></span>Mengunggah cover...
                      </div>
                      <div v-if="uploadError" class="small text-danger">{{ uploadError }}</div>
                      <!-- Hook point untuk Plan 4: tombol "Scan Cover" (CoverScanner) akan ditambahkan di sini -->
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary"
                data-bs-dismiss="modal">Batal</button>
              <button type="submit" class="btn text-white"
                style="background-color: var(--lib-green)" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
  .cover-thumb-table {
    width: 40px;
    height: 55px;
    object-fit: cover;
  }

  .cover-placeholder {
    width: 40px;
    height: 55px;
  }
  .cover-thumb {
    width: 64px;
    height: 88px;
    object-fit: cover;
    border-radius: 0.375rem;
    border: 1px solid #d8dee6;
    flex-shrink: 0;
  }

  /* Pill filter rak */
  .rak-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .rak-pill {
    border: 1px solid #d8dee6;
    background-color: #fff;
    color: #495057;
    border-radius: 30px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    white-space: nowrap;
  }

  .rak-pill:hover {
    border-color: var(--lib-green);
    color: var(--lib-green);
  }

  .rak-pill.active {
    background-color: var(--lib-green);
    border-color: var(--lib-green);
    color: #fff;
  }

  .rak-pill-count {
    opacity: 0.75;
    font-size: 11px;
    margin-left: 2px;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal;
  }

  .pagination-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
    flex-wrap: wrap;
  }

  .page-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid #d8dee6;
    background-color: #fff;
    color: #1e293b;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
  }

  .page-number:hover {
    background-color: #f2f7f5;
    border-color: var(--lib-green);
  }

  .page-number.active {
    background-color: var(--lib-green);
    border-color: var(--lib-green);
    color: #fff;
  }

  .page-ellipsis {
    width: 34px;
    text-align: center;
    color: #64748b;
    font-weight: 600;
  }

  .page-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: none;
    background: none;
    color: var(--lib-green);
    font-size: 15px;
    cursor: pointer;
  }

  .page-arrow:hover {
    color: var(--lib-green-dark);
  }

</style>
```

- [ ] **Step 2: Self-review**

Confirm: no `CoverScanner` import or usage anywhere in this file (grep the file for `CoverScanner` — must be zero matches). The cover field is a plain `<input type="file">` calling `handleCoverFileChange`, not a text input with a scan button. `status_buku` badge check (`'Tersedia'`) matches the real value the backend's `CASE WHEN ... THEN 'Tersedia' ELSE 'Tidak Tersedia'` produces. Not reachable yet — no route renders this file until Task 9.

- [ ] **Step 3: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/views/admin/BooksView.vue
git commit -m "$(cat <<'EOF'
Add BooksView admin page with plain file-upload cover, no scanner

Ported from dashboard_pttun, CoverScanner deliberately left out per
the design spec (Plan 4's job) — the cover field is a plain file
input calling the new uploadCoverAdmin service, with a comment marking
where Plan 4 will add the scan button. Not reachable yet.
EOF
)"
```

---

### Task 7: Loan monitoring view (edit, delete, and new "Tandai Dikembalikan")

**Files:**
- Create: `frontend/src/views/admin/LoanMonitoringView.vue`

**Interfaces:**
- Consumes: `loanAdminService.{getPeminjaman, updatePeminjaman, updateStatusPeminjaman, deletePeminjaman}` (Task 4), `AdminLayout` (Task 3).

- [ ] **Step 1: Create `frontend/src/views/admin/LoanMonitoringView.vue`**

Ported from dashboard_pttun's `src/views/LoanMonitoringView.vue`, with two additions per spec Decision 6: a "Tandai Dikembalikan" button (calling the new `updateStatusPeminjaman`) on any row not already `dikembalikan`, and a `'dikembalikan'` case in the status badge/label helpers (the original never rendered that status — `GET /api/admin/peminjaman` returns every status, unfiltered, confirmed against `PeminjamanModel.getSemuaPeminjaman` this session):

```vue
<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  getPeminjaman,
  updatePeminjaman,
  updateStatusPeminjaman,
  deletePeminjaman,
} from '@/services/loanAdminService.js'

const loans = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const searchKeyword = ref('')
const page = ref(1)
const pageSize = 10

const modalEl = ref(null)
let modalInstance = null
const editingId = ref(null)

const emptyForm = () => ({
  nama_peminjam: '',
  no_telpon: '',
  durasi_hari: 7,
})
const form = reactive(emptyForm())
const formError = ref('')

const pageNumberActiveStyle = {
  backgroundColor: 'var(--lib-green)',
  borderColor: 'var(--lib-green)',
  color: '#fff',
}

function statusBadgeClass(status) {
  if (status === 'terlambat') return 'bg-danger'
  if (status === 'dikembalikan') return 'bg-success'
  return 'bg-warning text-dark'
}

function statusLabel(status) {
  if (status === 'terlambat') return 'Terlambat'
  if (status === 'dikembalikan') return 'Dikembalikan'
  return 'Dipinjam'
}

function formatTanggal(value) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await getPeminjaman()
    loans.value = res.data || []
  } catch (error) {
    errorMsg.value = error.message || 'Gagal memuat data peminjaman.'
  } finally {
    loading.value = false
  }
}

const filteredLoans = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return loans.value
  return loans.value.filter(
    (l) =>
      l.nama_peminjam?.toLowerCase().includes(keyword) ||
      l.judul_buku?.toLowerCase().includes(keyword),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLoans.value.length / pageSize)))

const pagedLoans = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredLoans.value.slice(start, start + pageSize)
})

const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = page.value

  if (total <= 1) return []
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const siblingCount = 1
  const start = Math.max(2, current - siblingCount)
  const end = Math.min(total - 1, current + siblingCount)

  const pages = [1]
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)

  return pages
})

function goToPage(n) {
  if (n < 1 || n > totalPages.value || n === page.value) return
  page.value = n
}

function resetPageOnSearch() {
  page.value = 1
}

function openEditModal(loan) {
  editingId.value = loan.id_peminjaman
  formError.value = ''
  Object.assign(form, {
    nama_peminjam: loan.nama_peminjam ?? '',
    no_telpon: loan.no_telpon ?? '',
    durasi_hari: loan.durasi_hari ?? 7,
  })
  modalInstance?.show()
}

async function submitForm() {
  formError.value = ''

  if (!form.nama_peminjam.trim()) {
    formError.value = 'Nama peminjam wajib diisi.'
    return
  }
  if (!form.no_telpon.trim()) {
    formError.value = 'Nomor telepon wajib diisi.'
    return
  }
  const durasi = Number(form.durasi_hari)
  if (!Number.isInteger(durasi) || durasi < 1 || durasi > 7) {
    formError.value = 'Durasi pinjam harus berupa angka antara 1 dan 7 hari.'
    return
  }

  const payload = {
    nama_peminjam: form.nama_peminjam.trim(),
    no_telpon: form.no_telpon.trim(),
    durasi_hari: durasi,
  }

  saving.value = true
  try {
    await updatePeminjaman(editingId.value, payload)
    successMsg.value = 'Data peminjaman berhasil diperbarui.'
    modalInstance?.hide()
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    formError.value = error.message || 'Gagal menyimpan data.'
  } finally {
    saving.value = false
  }
}

async function handleDelete(loan) {
  const confirmed = window.confirm(
    `Hapus data peminjaman "${loan.judul_buku}" oleh ${loan.nama_peminjam}? Tindakan ini tidak bisa dibatalkan.`,
  )
  if (!confirmed) return

  try {
    await deletePeminjaman(loan.id_peminjaman)
    successMsg.value = 'Data peminjaman berhasil dihapus.'
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message || 'Gagal menghapus data peminjaman.'
  }
}

async function handleMarkReturned(loan) {
  const confirmed = window.confirm(
    `Tandai peminjaman "${loan.judul_buku}" oleh ${loan.nama_peminjam} sebagai dikembalikan?`,
  )
  if (!confirmed) return

  try {
    await updateStatusPeminjaman(loan.id_peminjaman, 'dikembalikan')
    successMsg.value = 'Peminjaman berhasil ditandai sebagai dikembalikan.'
    await loadData()
    setTimeout(() => (successMsg.value = ''), 4000)
  } catch (error) {
    errorMsg.value = error.message || 'Gagal menandai peminjaman sebagai dikembalikan.'
  }
}

onMounted(async () => {
  await nextTick()
  if (modalEl.value) {
    modalInstance = new Modal(modalEl.value)
  }
  loadData()
})
</script>

<template>
  <AdminLayout title="Monitoring Peminjaman">
    <div class="pt-4">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <RouterLink to="/admin/dashboard">Dashboard</RouterLink>
          </li>
          <li class="breadcrumb-item active" aria-current="page">Monitoring Peminjaman</li>
        </ol>
      </nav>

      <div v-if="successMsg" class="alert alert-success alert-dismissible fade show" role="alert">
        {{ successMsg }}
        <button type="button" class="btn-close" @click="successMsg = ''"></button>
      </div>
      <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ errorMsg }}
        <button type="button" class="btn-close" @click="errorMsg = ''"></button>
      </div>

      <div class="card shadow-soft">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h6 class="mb-0 text-nowrap">Monitoring Peminjaman</h6>
            <input
              v-model="searchKeyword"
              @input="resetPageOnSearch"
              type="text"
              class="form-control form-control-sm flex-grow-1"
              placeholder="Cari nama peminjam atau judul buku..."
            />
          </div>

          <div v-if="loading" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Memuat data peminjaman...
          </div>

          <div v-else class="table-responsive">
            <table class="table table-striped table-hover align-middle mb-0">
              <thead>
                <tr class="text-muted small text-uppercase">
                  <th style="width: 50px;">#</th>
                  <th>Peminjam</th>
                  <th>Judul Buku</th>
                  <th>Tanggal Pinjam</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th class="text-end" style="width: 130px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedLoans.length === 0">
                  <td colspan="7" class="text-center text-muted py-4">
                    Tidak ada data peminjaman yang ditemukan.
                  </td>
                </tr>

                <tr
                  v-for="(loan, idx) in pagedLoans"
                  :key="loan.id_peminjaman"
                  :class="{ 'table-danger': loan.status === 'terlambat' }"
                >
                  <td class="text-muted small">{{ (page - 1) * pageSize + idx + 1 }}</td>
                  <td>
                    <div class="fw-semibold text-dark">{{ loan.nama_peminjam }}</div>
                    <div class="small text-muted">{{ loan.no_telpon }}</div>
                  </td>
                  <td style="max-width: 220px" :title="loan.judul_buku">{{ loan.judul_buku }}</td>
                  <td>{{ formatTanggal(loan.tanggal_pinjam) }}</td>
                  <td>{{ formatTanggal(loan.due_date) }}</td>
                  <td>
                    <span class="badge" :class="statusBadgeClass(loan.status)">
                      {{ statusLabel(loan.status) }}
                    </span>
                  </td>
                  <td class="text-end text-nowrap" style="width: 130px; min-width: 130px;">
                    <div class="d-inline-flex gap-1 flex-nowrap">
                      <button
                        v-if="loan.status !== 'dikembalikan'"
                        class="btn btn-sm btn-outline-success"
                        title="Tandai Dikembalikan"
                        @click="handleMarkReturned(loan)"
                      >
                        <i class="bi bi-check-lg"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        title="Edit"
                        @click="openEditModal(loan)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        title="Hapus"
                        @click="handleDelete(loan)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <nav v-if="!loading && totalPages > 1" class="pagination-nav" aria-label="Navigasi halaman">
            <button v-if="page > 1" type="button" class="page-arrow" @click="goToPage(page - 1)">
              <i class="bi bi-chevron-left"></i>
            </button>

            <template v-for="(n, index) in pageNumbers" :key="`${n}-${index}`">
              <span v-if="n === '...'" class="page-ellipsis">...</span>
              <button
                v-else
                type="button"
                class="page-number"
                :class="{ active: n === page }"
                :style="n === page ? pageNumberActiveStyle : null"
                @click="goToPage(n)"
              >
                {{ n }}
              </button>
            </template>

            <button v-if="page < totalPages" type="button" class="page-arrow" @click="goToPage(page + 1)">
              <i class="bi bi-chevron-right"></i>
            </button>
          </nav>
        </div>
      </div>
    </div>

    <!-- Modal Form Edit -->
    <div ref="modalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="submitForm">
            <div class="modal-header">
              <h5 class="modal-title">Edit Peminjaman</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <div v-if="formError" class="alert alert-danger py-2 mb-3">{{ formError }}</div>

              <div class="mb-3">
                <label class="form-label">Nama Peminjam <span class="text-danger">*</span></label>
                <input v-model="form.nama_peminjam" type="text" class="form-control" required />
              </div>

              <div class="mb-3">
                <label class="form-label">Nomor Telepon <span class="text-danger">*</span></label>
                <input v-model="form.no_telpon" type="text" class="form-control" required />
              </div>

              <div class="mb-3">
                <label class="form-label">Durasi Pinjam (hari)</label>
                <input
                  v-model="form.durasi_hari"
                  type="number"
                  min="1"
                  max="7"
                  class="form-control"
                />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
              <button
                type="submit"
                class="btn text-white"
                style="background-color: var(--lib-green)"
                :disabled="saving"
              >
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.pagination-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #d8dee6;
  background-color: #fff;
  color: #1e293b;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.page-number:hover {
  background-color: #f2f7f5;
  border-color: var(--lib-green);
}

.page-number.active {
  background-color: var(--lib-green);
  border-color: var(--lib-green);
  color: #fff;
}

.page-ellipsis {
  width: 34px;
  text-align: center;
  color: #64748b;
  font-weight: 600;
}

.page-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: none;
  color: var(--lib-green);
  font-size: 15px;
  cursor: pointer;
}

.page-arrow:hover {
  color: var(--lib-green-dark);
}
</style>
```

- [ ] **Step 2: Self-review**

Confirm: `handleMarkReturned` calls `updateStatusPeminjaman(loan.id_peminjaman, 'dikembalikan')` — `'dikembalikan'` is a valid member of the backend's `STATUS_VALUES` (confirmed against `PeminjamanController.js` this session). The mark-returned button only renders `v-if="loan.status !== 'dikembalikan'"`. `statusBadgeClass`/`statusLabel` both handle all three real status values (`dipinjam`, `terlambat`, `dikembalikan`) — the original dashboard_pttun code only handled two. Not reachable yet.

- [ ] **Step 3: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/views/admin/LoanMonitoringView.vue
git commit -m "$(cat <<'EOF'
Add LoanMonitoringView with new Tandai Dikembalikan button

Ported edit/delete from dashboard_pttun as-is. New: a status button
using the backend's existing PATCH /:id/status (previously UI-less),
plus a 'dikembalikan' case in the status badge/label helpers that the
original code never needed since it never surfaced already-returned
loans. Not reachable yet.
EOF
)"
```

---

### Task 8: Dashboard view (stats + charts)

**Files:**
- Modify: `frontend/src/views/admin/DashboardView.vue` — currently empty; fill in.

**Interfaces:**
- Consumes: `bookAdminService.{getBuku, getDashboardStats}`, `categoryService.getCategory`, `loanAdminService.getPeminjaman` (Task 4), `chart.js` + `vue-chartjs` (Task 1), `AdminLayout` (Task 3).

- [ ] **Step 1: Replace `frontend/src/views/admin/DashboardView.vue`**

Ported from dashboard_pttun's `src/views/DashboardView.vue`. The original called the **public**, unauthenticated `apiRequest('/buku/dashboard/stats')` for the stat cards — replaced here with the real admin endpoint (`bookAdminService.getDashboardStats`, `GET /api/admin/buku/dashboard/stats`), per spec Decision 5. Category/book/loan lists switch to the admin service equivalents:

```vue
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
```

- [ ] **Step 2: Self-review**

Confirm: the stat cards source from `getDashboardStats()` (`/api/admin/buku/dashboard/stats`), not the public `apiRequest('/buku/dashboard/stats')` dashboard_pttun's original used — re-diff against the original to confirm this is the only functional change beyond import paths and the `/admin/loans/monitoring` link. Not reachable yet.

- [ ] **Step 3: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/views/admin/DashboardView.vue
git commit -m "$(cat <<'EOF'
Add admin DashboardView with stat cards and both charts

Ported from dashboard_pttun, now sourcing stats from the authenticated
GET /api/admin/buku/dashboard/stats instead of the original's public,
unauthenticated call. Line chart (loans/month) and pie chart
(books/category) computed client-side, matching the original exactly.
Not reachable yet.
EOF
)"
```

---

### Task 9: Wire it together — routes, guard, session bootstrap, cleanup, end-to-end verification

**Files:**
- Delete: `frontend/src/views/admin/BookCreateView.vue`, `BookEditView.vue`, `BookListView.vue`, `LoanListView.vue`, `UserListView.vue` — unused stubs superseded by Tasks 5-7's modal-based views (per spec Decision 1).
- Modify: `frontend/src/router/index.js` — add the `/admin/*` route tree and the `beforeEach` guard.
- Modify: `frontend/src/main.js` — call `authStore.checkSession()` before mounting the router.

**Interfaces:**
- Consumes: every component and store built in Tasks 1-8.
- Produces: the full working admin panel, reachable at `/admin/dashboard` (and siblings) when authenticated, redirecting to `/login` otherwise.

- [ ] **Step 1: Delete the five unused stub views**

```bash
git rm frontend/src/views/admin/BookCreateView.vue frontend/src/views/admin/BookEditView.vue frontend/src/views/admin/BookListView.vue frontend/src/views/admin/LoanListView.vue frontend/src/views/admin/UserListView.vue
```

- [ ] **Step 2: Replace `frontend/src/router/index.js`**

```js
import { createRouter, createWebHistory } from 'vue-router'
import GuestLayout from '../layouts/GuestLayout.vue'
import HomeView from '../views/HomeView.vue'
import CatalogView from '../views/CatalogView.vue'
import { useAuthStore } from '../stores/auth.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: GuestLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('../views/AboutView.vue'),
        },
        {
          path: 'katalog',
          name: 'katalog',
          component: CatalogView,
        },
        {
          path: 'buku/:id',
          name: 'book-detail',
          component: () => import('../views/BookDetail.vue'),
        },
        {
          path: 'buku/:id/pinjam',
          name: 'peminjaman-form',
          component: () => import('../views/PeminjamanFormView.vue'),
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/admin',
      redirect: '/admin/dashboard',
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('../views/admin/DashboardView.vue'),
    },
    {
      path: '/admin/categories',
      name: 'admin-categories',
      component: () => import('../views/admin/CategoriesView.vue'),
    },
    {
      path: '/admin/books',
      name: 'admin-books',
      component: () => import('../views/admin/BooksView.vue'),
    },
    {
      path: '/admin/shelves',
      name: 'admin-shelves',
      component: () => import('../views/admin/ShelvesView.vue'),
    },
    {
      path: '/admin/loans/monitoring',
      name: 'admin-loans-monitoring',
      component: () => import('../views/admin/LoanMonitoringView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  if (!to.path.startsWith('/admin')) return true

  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
```

- [ ] **Step 3: Modify `frontend/src/main.js`** — gate the mount behind the initial session check

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router/index.js'
import { useAuthStore } from './stores/auth.js'

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.min.js"
import "bootstrap-icons/font/bootstrap-icons.css"

import "./assets/styles/main.css"
import "./assets/styles/admin.css"

const app = createApp(App)

app.use(createPinia())

const authStore = useAuthStore()
authStore.checkSession().finally(() => {
  app.use(router)
  app.mount('#app')
})
```

- [ ] **Step 4: Start both dev servers**

Use `preview_start` with `{"name": "pttunlibrary"}` (frontend, port 5173) and `{"name": "backend"}` (port 5000) — per the environment gotchas in `docs/superpowers/dashboard-merge-status.md`, always start these via `preview_start`, never ask the user to run `npm run dev` in their own terminal (unreachable from this environment's Bash tool). If either was already running from an earlier task and may be stale, stop and restart it.

- [ ] **Step 5: Confirm both servers boot clean**

Check `preview_logs` for the frontend server for Vite's "ready" message with no build errors (this is the first time `chart.js`/`vue-chartjs` and every new `.vue` file actually get compiled — a real syntax or import-path mistake in Tasks 1-8 will surface here for the first time). Check the backend server log for `Server backend berjalan di http://localhost:5000` with no crash.

- [ ] **Step 6: Unauthenticated redirect check**

In the Browser pane, navigate to `http://localhost:5173/admin/dashboard`. Expected: immediately redirected to `/login` (confirm via `read_page` or the URL bar) — the guard fires because `authStore.isAuthenticated` is `false` after the anonymous `checkSession()` call resolves. Check `read_console_messages` for unexpected errors (a 401 from `GET /api/auth/me` in the Network tab is expected and fine — that's not an application error).

- [ ] **Step 7: Public site still works**

Navigate to `http://localhost:5173/` and `http://localhost:5173/katalog`. Confirm both render as before (unaffected by this plan's changes) — this is the regression check for the fact that `checkSession()` now runs on every single page load, including public ones.

- [ ] **Step 8: STOP — ask the user before logging in for authenticated verification**

The remaining steps need a real authenticated session. Ask the user: "OK to log in with your seeded admin account in the browser preview to verify the new admin panel end-to-end?" Do not proceed without an explicit yes. The user should type the username/password themselves via the Browser pane's `computer` tool (`type` action) rather than you being told the password, consistent with the auth-foundation plan's handling — or if they're comfortable sharing it in chat for this one verification step, that's their call, not something to request.

- [ ] **Step 9: Log in and confirm the redirect + layout**

On `/login`, submit valid credentials. Expected: redirected to `/admin/dashboard`, sidebar shows "Dashboard / Data Master (Kategori Buku, Daftar Buku, Daftar Rak) / Transaksi (Monitoring Peminjaman)", topbar shows the logged-in username and a logout button. Take a screenshot to confirm visually.

- [ ] **Step 10: Dashboard stats and charts render with real data**

Confirm the 5 stat cards show non-placeholder numbers (matching the real ~878-book dataset per `MEMORY.md`'s book-count correction, not the stale 191 in `CLAUDE.md`), and both the line chart (loans per month) and pie chart (books per category) render without console errors.

- [ ] **Step 11: Click through each admin page, confirm lists load**

Visit `/admin/categories`, `/admin/books`, `/admin/shelves`, `/admin/loans/monitoring` via the sidebar links (not by typing the URL — this also confirms the sidebar's `active-class` highlighting). Confirm each table populates with real data and no console errors.

- [ ] **Step 12: Full CRUD cycle — Categories (safe, self-cleaning)**

Via the actual UI: click "Tambah Kategori", create a category named "Kategori Uji Verifikasi", confirm it appears in the table. Click Edit on it, rename to "Kategori Uji Verifikasi (edited)", confirm the table updates. Click Delete, confirm the removal prompt and that it disappears from the table afterward.

- [ ] **Step 13: Loan monitoring — "Tandai Dikembalikan" button**

If a real loan with status `dipinjam` or `terlambat` exists in the data, ask the user for explicit go-ahead before clicking "Tandai Dikembalikan" on it (this is a real, not easily reversible, status change on live data — same caution as any other real-data mutation this session). If approved, click it, confirm the row's badge switches to "Dikembalikan" (green) and the button disappears from that row. If no safe test loan exists, skip this step and note it as unverified rather than inventing one.

- [ ] **Step 14: Cover upload — ask before a real Cloudinary call**

Open "Tambah Buku", ask the user: "OK to upload a small test image to your real Cloudinary account to verify the cover upload field?" Only proceed on yes. If approved, choose a small local image via the file input, confirm the "Mengunggah cover..." spinner appears then a thumbnail preview shows, confirm `form.image_url` got a real Cloudinary URL (visible in the preview `src`). Do not submit the book form — cancel the modal so no test book is created.

- [ ] **Step 15: Logout**

Click the topbar logout button. Confirm redirect to `/login`. Navigate to `/admin/dashboard` again directly — confirm it redirects back to `/login` (session is really gone, not just a client-side flag).

- [ ] **Step 16: Self-review**

Confirm: all five deleted stub files (`BookCreateView.vue`, `BookEditView.vue`, `BookListView.vue`, `LoanListView.vue`, `UserListView.vue`) are gone from `frontend/src/views/admin/` — re-`ls` the directory. `router/index.js`'s guard only intercepts paths starting with `/admin` — public routes are unaffected (confirmed in Step 7). `main.js` awaits `checkSession()` before mounting, so the guard never runs against a stale/unpopulated store. No console errors were left unexplained across Steps 6-15.

- [ ] **Step 17: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/router/index.js frontend/src/main.js
git rm frontend/src/views/admin/BookCreateView.vue frontend/src/views/admin/BookEditView.vue frontend/src/views/admin/BookListView.vue frontend/src/views/admin/LoanListView.vue frontend/src/views/admin/UserListView.vue
git commit -m "$(cat <<'EOF'
Wire admin routes behind an auth guard, mount the working panel

router.beforeEach redirects any unauthenticated /admin/* visit to
/login; main.js awaits one GET /api/auth/me before mounting so the
guard's first decision is never based on a stale store. Deletes the
five unused stub views UserListView/BookCreateView/BookEditView/
BookListView/LoanListView, superseded by the modal-based CRUD views
built in this plan. Verified end-to-end in the browser: unauthenticated
redirect, login, dashboard stats/charts, full CRUD cycle on Categories,
Tandai Dikembalikan, cover upload, and logout.
EOF
)"
```

## Out of scope (deferred to later plans)

- `CoverScanner.vue` and its `opencv`/`jscanify`/`browser-image-compression` dependencies — Plan 4. This plan leaves a comment marking the hook point in `BooksView.vue`.
- Any user-management UI — not planned at all, by design (see spec Decision 1; `seedAdmin.js` remains the only account-creation path).
- Retrofitting the sidebar to be router-meta-driven — deviates from dashboard_pttun's proven hardcoded-array pattern for no functional gain (spec's explicit "Out of scope").
- New backend endpoints of any kind — this plan only consumes what Plan 2 already built.
- `CLAUDE.md`'s stale schema/book-count documentation — still pending from Plans 1-2, not repeated here (tracked in `MEMORY.md`).
- Multi-role/permission granularity, password reset — not decided for this version (carried over from the auth-foundation plan's own out-of-scope list).
