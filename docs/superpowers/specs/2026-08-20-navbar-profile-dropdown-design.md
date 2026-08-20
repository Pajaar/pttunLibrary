# Public Navbar: Profile Dropdown Instead of Direct Dashboard Link — Design Spec

Date: 2026-08-20

## Context

An earlier session this day added a session-aware button to the public
navbar (`frontend/src/layouts/GuestLayout.vue`): logged out shows "Login"
→ `/login`; logged in shows "Dashboard Admin" → `/admin/dashboard`
directly (`loginLabel`/`loginTarget` computed properties,
`GuestLayout.vue:247-248`). That session also added a "Kembali ke
Beranda" button inside the admin panel's own topbar, but there was still
no way to log out from the *public* site — a staff member browsing the
public pages while logged in had to go into the admin panel first just to
sign out.

User's request: turn the logged-in state into a profile-style trigger
with a dropdown offering **Dashboard** and **Logout**, rather than a
single link that only ever goes to the dashboard.

## Goal

1. Logged out (`authStore.isAuthenticated === false`): navbar shows
   exactly what it shows today — a "Login" pill linking to `/login`. No
   change to this state.
2. Logged in: the pill becomes a dropdown trigger (profile icon only, no
   username text). Opening it shows two items: **Dashboard** (navigates
   to `/admin/dashboard`) and **Logout** (ends the session, no
   navigation — see Decision 3).
3. Mobile (collapsed hamburger panel): logged-in state shows two
   separate stacked links, "Dashboard Admin" and "Logout" — no nested
   dropdown inside the already-open mobile menu.

## Decisions

### 1. Desktop trigger: icon-only pill, Bootstrap's own dropdown component

```html
<div class="dropdown d-none d-lg-block" v-if="authStore.isAuthenticated">
  <button class="btn-login-pill dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
    <i class="bi bi-person-circle"></i>
  </button>
  <ul class="dropdown-menu dropdown-menu-end">
    <li><router-link class="dropdown-item" to="/admin/dashboard">Dashboard</router-link></li>
    <li><button class="dropdown-item" type="button" @click="handleLogout">Logout</button></li>
  </ul>
</div>
<router-link v-else to="/login" class="btn-login-pill d-none d-lg-inline-flex">
  Login
</router-link>
```

`data-bs-toggle="dropdown"` uses Bootstrap's own JS dropdown component,
already loaded globally (`main.js` imports
`bootstrap/dist/js/bootstrap.min.js`) — same mechanism the existing
`navbar-toggler` button already relies on (`data-bs-toggle="collapse"`).
No new JS library, no Vue-managed open/closed state. `.dropdown-toggle`
gets Bootstrap's caret automatically via CSS, satisfying "icon + caret"
without adding a caret element by hand. `dropdown-menu-end` right-aligns
the menu under the trigger (the trigger sits at the navbar's right edge,
so a left-aligned menu would overflow past the viewport).

The dropdown menu itself (`.dropdown-menu`, `.dropdown-item`) keeps
Bootstrap's default light/white styling — it's a floating overlay that
can appear over any part of the page, not part of the dark navy navbar
bar, so it doesn't need the site's navy/gold theme applied to it. Only
the trigger button keeps the existing `.btn-login-pill` gold styling.

### 2. Mobile: two stacked links, no nested dropdown

Current mobile block (inside `#mainNav`, single pill regardless of auth
state):

```html
<div class="d-lg-none text-center mt-3">
  <router-link :to="loginTarget" class="btn-login-pill d-inline-flex">
    {{ loginLabel }}
  </router-link>
</div>
```

Becomes two branches:

```html
<div class="d-lg-none text-center mt-3" v-if="!authStore.isAuthenticated">
  <router-link to="/login" class="btn-login-pill d-inline-flex">Login</router-link>
</div>
<div class="d-lg-none text-center mt-3 d-flex flex-column align-items-center gap-2" v-else>
  <router-link to="/admin/dashboard" class="btn-login-pill d-inline-flex">Dashboard Admin</router-link>
  <button type="button" class="btn-login-pill d-inline-flex" @click="handleLogout">Logout</button>
</div>
```

Reusing `.btn-login-pill` for both mobile links (including the `<button>`
for Logout) keeps them visually consistent with each other and with the
existing mobile "Login" pill's look — no new mobile-specific styling
needed.

### 3. Logout does not navigate

```js
async function handleLogout() {
  await authStore.logout()
}
```

No `router.push(...)` after logout — unlike the admin panel's own
`AppTopbar.vue` logout (which redirects to `/login` because it's leaving
a *protected* area the user can no longer be in). Here, the user is
already on a public page; logging out just needs to update what the
navbar shows, which happens automatically because `authStore.isAuthenticated`
is reactive — the moment it flips to `false`, the `v-if`/`v-else` blocks
in Decisions 1 and 2 re-render to the logged-out "Login" state on the
same page, no navigation required. Confirmed with the user during
brainstorming as the intended behavior (explicitly different from the
admin panel's own logout).

### 4. `loginLabel`/`loginTarget` computed properties are removed

These existed only because both auth states used to render the *same*
element shape (one link, differing label/target). Now the two states
render structurally different markup (a link vs. a dropdown on desktop;
one link vs. two on mobile), so branching directly on
`authStore.isAuthenticated` in the template (`v-if`/`v-else`) is clearer
than computed indirection that no longer carries enough information
(target alone can't express "render a dropdown"). Delete both computed
properties from `<script setup>`; nothing else in the file references
them.

## Files touched

- `frontend/src/layouts/GuestLayout.vue` — template (desktop trigger
  block, mobile block), `<script setup>` (remove `loginLabel`/
  `loginTarget`, add `handleLogout`). No new file, no other file touched.

## Out of scope

- Any change to `AppTopbar.vue`'s own logout button/behavior (admin
  panel, unrelated, shipped in an earlier session) — stays exactly as is.
- Any change to `authStore` itself (`login`/`logout`/`checkSession`) —
  `handleLogout` in `GuestLayout.vue` just calls the existing
  `authStore.logout()`, no new store logic.
- Showing the username anywhere in this trigger — user confirmed
  icon-only.
- Any visual restyling of `.btn-login-pill` itself, or of the dropdown
  menu's colors — Bootstrap's default dropdown appearance is used as-is.

## Testing / verification

No automated test framework in this codebase (unchanged from prior
specs). Manual verification via the browser preview tool. Since this
project has no known seeded admin credentials in this environment, the
logged-in state is verified by simulating `authStore.isAuthenticated`
directly via the Vue devtools hook (same technique used in the two prior
sessions this day) rather than a real login.

- Logged out, desktop (≥992px): navbar shows the "Login" pill, unchanged
  from before this change. Click it → navigates to `/login`.
- Logged out, mobile (<992px): hamburger panel shows the single "Login"
  link, unchanged.
- Simulate `authStore.isAuthenticated = true`, desktop: the pill becomes
  an icon-only dropdown trigger (`bi-person-circle` + caret). Click it →
  menu opens showing "Dashboard" and "Logout". Click "Dashboard" → 
  navigates to `/admin/dashboard`. Reset simulated state, re-simulate
  logged-in, re-open the dropdown, click "Logout" → confirm
  `authStore.isAuthenticated` becomes `false` (via the same devtools
  inspection), the page does **not** navigate away, and the navbar
  reverts to showing the "Login" pill in place, without a page reload.
- Simulate logged-in, mobile: open the hamburger menu → confirm two
  separate links "Dashboard Admin" and "Logout" appear (not a dropdown).
  Click "Logout" → confirm same no-navigation, reverts-to-Login behavior
  as desktop.
- Regression: existing nav items (Beranda, Katalog Buku, Cek Peminjaman,
  Layanan, Tentang) still work exactly as before at both logged-out and
  logged-in states — this change only touches the login/profile area of
  the markup, not `navItems`/`handleNavClick`/`isItemActive`.
