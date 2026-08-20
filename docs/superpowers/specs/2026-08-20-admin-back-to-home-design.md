# Login + Admin Panel: Back-to-Home Navigation — Design Spec

Date: 2026-08-20

## Context

`LoginView.vue` (`/login`) is currently a dead end: it renders a
standalone card (`login-wrap admin-shell d-flex align-items-center
justify-content-center min-vh-100 bg-lib-green`) with only the
username/password form — no link back to the public site, no header, no
footer. Anyone who lands there (by mistake, via the navbar's new "Login"
button from the previous session's work, or by bookmark) has no way back
to the landing page except editing the URL manually.

Similarly, once inside the admin panel (`AdminLayout.vue` → `AppTopbar.vue`
+ `AppSidebar.vue`, shared across every `/admin/*` route), the only exit is
the existing "Keluar" (logout) button in `AppTopbar.vue` — there's no way
to visit the public site while staying logged in.

User confirmed the scope is navigation only — the existing visual design
of both the login card (green `lib-green` theme, matching the rest of the
admin panel) and the admin topbar/sidebar is not being changed.

**Explicit scope note:** earlier work this session established "don't
touch the admin dashboard" as a standing constraint for unrelated
features. That constraint does not apply here — the user has explicitly
authorized touching `AppTopbar.vue` for this specific addition.

## Goal

1. `LoginView.vue` gets a "← Kembali ke Beranda" link below the submit
   button, navigating to `/` (the public landing page).
2. `AppTopbar.vue` (rendered on every admin page via `AdminLayout.vue`)
   gets a new icon button navigating to `/`, positioned between the
   username text and the existing "Keluar" button. This is pure
   navigation — it does **not** call `authStore.logout()` — the admin
   session stays active, so returning to `/admin/dashboard` afterward
   does not require logging in again.

## Decisions

### 1. Login page link: inside the card, below the submit button

```html
<button type="submit" class="btn btn-lib-green w-100 text-white" :disabled="loading">
  <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
  Masuk
</button>
```

gets one new line added directly after it, inside the same `<form>`:

```html
<div class="text-center mt-3">
  <router-link to="/" class="back-home-link">
    <i class="bi bi-arrow-left me-1"></i>Kembali ke Beranda
  </router-link>
</div>
```

New scoped style (added to `LoginView.vue`'s existing `<style scoped>`
block, which currently only has `.btn-lib-green` rules):

```css
.back-home-link {
  color: #6c757d;
  font-size: 0.875rem;
  text-decoration: none;
}

.back-home-link:hover {
  color: var(--lib-green);
  text-decoration: underline;
}
```

`var(--lib-green)` is already used elsewhere in this file
(`.btn-lib-green`'s background) and is a global custom property (declared
once, inherited everywhere) — same reasoning as the navy/gold tokens used
in the public navbar work: scoped styles still resolve global custom
properties normally.

### 2. Admin topbar button: icon-only, matches the existing "Keluar" button's style

Current right-hand cluster in `AppTopbar.vue`:

```html
<div class="d-flex align-items-center gap-3">
  <span class="text-white-50 small d-none d-md-inline">{{ authStore.username }}</span>
  <button type="button" class="btn btn-sm btn-outline-light" title="Keluar" @click="handleLogout">
    <i class="bi bi-box-arrow-right"></i>
  </button>
  <div class="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0"
    style="width: 40px; height: 40px">
    <i class="bi bi-person-fill text-lib-green fs-5"></i>
  </div>
</div>
```

New button inserted between the username `<span>` and the "Keluar"
button, matching that button's exact classes/sizing so the two read as a
consistent pair of icon actions:

```html
<router-link to="/" class="btn btn-sm btn-outline-light" title="Kembali ke Beranda">
  <i class="bi bi-house-door"></i>
</router-link>
```

`bi-house-door` (Bootstrap Icons, already loaded project-wide via
`main.js`'s `bootstrap-icons/font/bootstrap-icons.css` import) reads
unambiguously as "go to the site," distinct from `bi-box-arrow-right`
("exit/logout"). Using `<router-link>` (not a `<button @click="...">`,
unlike "Keluar" which needs to run `handleLogout()` first) keeps this a
plain, unconditional navigation — no new script logic in `AppTopbar.vue`
beyond the one new template line; `handleLogout` and every other existing
line are untouched.

### 3. No auth-state interaction

Neither addition reads or writes `authStore` state. The login-page link
works identically whether or not a session already exists (if a staff
member is already logged in and somehow lands on `/login` — e.g. via
back-button — clicking "Kembali ke Beranda" just takes them to `/`, same
as the topbar version; no special-casing needed, matching the "navigation
only, no new logic" scope).

## Files touched

- `frontend/src/views/LoginView.vue` — one new `<div>` inside the
  `<form>`, two new CSS rules in the existing `<style scoped>` block.
- `frontend/src/components/admin/AppTopbar.vue` — one new
  `<router-link>` in the existing template. No `<script>` changes.

## Out of scope

- Any visual redesign of the login card or admin topbar/sidebar beyond
  the one new element each — user confirmed this explicitly.
- Any change to `authStore`, the router guard, or logout behavior.
- Any change to `AppSidebar.vue` or other admin views.
- The public navbar's own "Login"/"Dashboard Admin" button (already
  shipped in a prior session) — unrelated, untouched.

## Testing / verification

No automated test framework in this codebase (unchanged from prior
specs). Manual verification via the browser preview tool:

- Navigate to `/login` directly. Confirm "← Kembali ke Beranda" renders
  below the "Masuk" button, inside the card. Click it → navigates to `/`.
- Log in with valid admin credentials (or verify via direct Pinia-state
  mutation for the UI-only claim, same technique used in the prior navbar
  session, if no test credentials are available) → confirm the new house
  icon button appears in the topbar between the username and "Keluar", on
  at least two different admin routes (e.g. `/admin/dashboard` and one
  other) to confirm it's `AdminLayout`-wide, not dashboard-specific.
- Click the new topbar button → navigates to `/`. Confirm the session is
  still active afterward (navigate back to `/admin/dashboard` directly —
  should render without redirecting to `/login`).
- Click "Keluar" separately → confirm it still logs out and redirects to
  `/login` exactly as before (regression check — the new button sits next
  to it but must not interfere with its `@click` handler).
