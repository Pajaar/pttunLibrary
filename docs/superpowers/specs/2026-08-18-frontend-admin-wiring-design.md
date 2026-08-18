# Frontend Admin Wiring — Design Spec

Date: 2026-08-18

Plan 3 of 4 in the dashboard_pttun merge (see
`docs/superpowers/dashboard-merge-status.md` and
`docs/superpowers/specs/2026-08-18-dashboard-merge-design.md` for full
context). Plans 1-2 (auth foundation, admin backend routes) are done and
pushed — every endpoint this spec's UI calls already exists and is gated by
`requireAuth`.

## Context

pttunLibrary's frontend already has orphaned scaffolding for an admin panel:
`frontend/src/layouts/AdminLayout.vue`, `MemberLayout.vue`, and six files
under `frontend/src/views/admin/` — all **completely empty** (confirmed this
session), none wired into `frontend/src/router/index.js`.

A survey of dashboard_pttun's actual (working, tested) admin frontend found:
- **Modal-based CRUD, not separate routes.** Each resource (`BooksView.vue`,
  `CategoriesView.vue`, `ShelvesView.vue`, `LoanMonitoringView.vue`) is one
  file: a list with client-side search/pagination, and a single Bootstrap
  `Modal` toggled by an `editingId` (`null` = create, set = edit). This
  doesn't map onto pttunLibrary's existing stub names
  (`BookListView`/`BookCreateView`/`BookEditView`) — those three stubs are
  unused by this design and get deleted.
- **`LoginView.vue` is non-functional** — a styled `RouterLink`, no real
  submit handler, no API call. Nothing to port; login logic is built fresh.
- **Sidebar nav is a hardcoded JS array** (`src/data/menu.js`), not driven by
  router `meta` fields.
- **`DashboardView.vue`** (448 lines) uses `chart.js`/`vue-chartjs`: a line
  chart (loans per month) and a pie chart (books per category), both computed
  client-side from full list responses — not from the stats endpoint alone,
  which only feeds 4 counter cards.
- **`LoanMonitoringView.vue`** only has Edit and Delete — no "mark as
  returned" action, even though the backend already supports
  `PATCH /:id/status`.
- **`CoverScanner.vue`** (471 lines, opencv/jscanify) is a large, self-contained
  subsystem — explicitly out of scope for this plan (Plan 4's job).
- Pinia is already installed and initialized (`app.use(createPinia())`) in
  dashboard_pttun, but no store files exist there to port.
- Service-file pattern: a generic `api.js` fetch wrapper + one service file
  per resource (`bookService.js`, `loanService.js`, `uploadService.js`).

## Goal

Wire a real, working admin panel into pttunLibrary's frontend: login, a
route guard, and full CRUD UI for buku/category/rak/peminjaman, all backed
by the endpoints Plan 2 already built. No new backend work.

## Decisions

### 1. Replace unused stubs, don't force-fit them

`BookListView.vue`, `BookCreateView.vue`, `BookEditView.vue`,
`LoanListView.vue`, `UserListView.vue` are deleted. `DashboardView.vue`
keeps its name (content replaced). New files added:
`BooksView.vue`, `CategoriesView.vue`, `ShelvesView.vue`,
`LoanMonitoringView.vue` — matching dashboard_pttun's actual, working
naming and modal-based pattern rather than pttunLibrary's original
(unbuilt, never-tested) list/create/edit split.

**`UserListView.vue` is deleted, not built.** A user-management UI would
need a create-account backend endpoint, which Plan 1 deliberately decided
against — `seedAdmin.js` (run manually, once, by whoever operates the
server) is the only account-creation path, by design. Building this UI now
would either be dead-end (no endpoint to call) or force scope creep into
adding a self-registration-adjacent endpoint, which contradicts an already-
made security decision. Out of scope, not deferred — there is no plan to
add it.

### 2. Auth: Pinia store + router guard

New `frontend/src/stores/auth.js`: `{ username, isAuthenticated, checking }`.
On app load, call `GET /api/auth/me` once to populate it. A
`router.beforeEach` guard checks the store before entering any `/admin/*`
route; redirects to `/login` if not authenticated. `LoginView.vue` gets a
real form (username/password) calling `POST /api/auth/login`, updates the
store on success, redirects to `/admin/dashboard`. This is new code, not a
port — dashboard_pttun's login was never functional.

### 3. Sidebar: ported as a hardcoded array

`frontend/src/data/adminMenu.js` (new) holds the nav item list (label, icon,
route), ported from dashboard's `menu.js`. `AppSidebar.vue`/`AppTopbar.vue`
(new, under `frontend/src/components/admin/`) render from it.
`AdminLayout.vue` (filled in) renders sidebar + topbar + `<router-view>` —
purely presentational, no auth logic (that's the router guard's job,
matching dashboard's own separation).

### 4. Buku/Category/Rak pages: list + modal CRUD, ported pattern

Each new view file: table with client-side search/pagination (ported as-is
from dashboard — no new pagination library), and one Bootstrap `Modal`
instance toggled by `editingId`. Service files
(`frontend/src/services/bookAdminService.js`, `categoryService.js`,
`rakService.js`, `loanAdminService.js`, plus a shared `adminApi.js` fetch
wrapper) point at `/api/admin/*` instead of dashboard's `/buku`,
`/categories` etc.

**Cover upload**: `BooksView.vue`'s form keeps a plain file-input calling
`POST /api/admin/upload/cover` (built in Plan 2), storing the returned URL
in `image_url`. The cover-scanner button dashboard_pttun had next to it is
**not** ported — left out entirely, with a code comment marking the hook
point for Plan 4.

### 5. Dashboard: counters + both charts, ported

4 counter cards from `GET /api/admin/buku/dashboard/stats`. Line chart
(loans/month) and pie chart (books/category) computed client-side from
`GET /api/admin/buku` and `GET /api/admin/peminjaman` full-list responses —
matching dashboard's original approach exactly, no new backend aggregation
endpoints. `chart.js` + `vue-chartjs` added as new frontend dependencies.

### 6. Loan monitoring: Edit + Delete (ported) + new "Tandai Dikembalikan" button

Table shows all loans. Edit opens the modal (`PUT /api/admin/peminjaman/:id`,
same fields dashboard had: nama_peminjam, no_telpon, durasi_hari 1-7).
Delete removes it (`DELETE /api/admin/peminjaman/:id`). **New, not in
dashboard_pttun's original**: a "Tandai Dikembalikan" button on any row not
already `dikembalikan`, calling `PATCH /:id/status`. Decided during
brainstorming — the backend already supports it and leaving it UI-less
would be a real usability gap for staff. `reconcileOverdueLoans` keeps
running automatically as before; this button is a manual/faster path, not
a replacement.

## Out of scope

- `CoverScanner.vue` and its opencv/jscanify/`browser-image-compression`
  dependencies — Plan 4.
- Any user-management UI (see Decision 1) — not planned at all, by design.
- New backend endpoints of any kind — this plan only consumes what Plan 2
  already built.
- Retrofitting the sidebar to be router-meta-driven instead of the
  hardcoded-array pattern — deviates from proven code for no functional
  gain.

## Testing / verification

No automated test framework in this repo (established convention). Manual
verification via the running dev server (both `frontend` — Vite — and
`backend`, per `.claude/launch.json`) in the Browser pane: login flow,
route-guard redirect when logged out, full CRUD cycle on each resource
(buku/category/rak/peminjaman), the new status-button, and dashboard
charts rendering with real data. Any step that would create/modify/delete
real data needs the same going-in caution as prior plans — prefer
throwaway, self-cleaning test records where possible.
