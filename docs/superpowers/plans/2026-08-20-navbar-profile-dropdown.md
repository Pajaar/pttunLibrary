# Navbar Profile Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public navbar's logged-in "Dashboard Admin" link with a profile-icon dropdown (Dashboard/Logout) on desktop, and two stacked links on mobile — logout stays on the current public page instead of redirecting anywhere.

**Architecture:** Single-file template/script change in `GuestLayout.vue`, branching directly on `authStore.isAuthenticated` instead of the removed `loginLabel`/`loginTarget` computed properties (deleted — the two auth states now render structurally different markup, not just different text/target on the same element). One necessary prerequisite: Bootstrap's Dropdown component requires Popper for positioning and currently isn't loaded — `main.js` currently imports the non-bundle `bootstrap.min.js`, which does not include Popper. Verified directly in `node_modules/bootstrap/dist/js/bootstrap.js:1884-1887`: `Dropdown.prototype._createPopper()` unconditionally throws `TypeError: Bootstrap's dropdowns require Popper` if the global `Popper` namespace is undefined — this isn't conditional on navbar/static-display mode (that only changes Popper's *config*, not whether it's required at all). This project has never used a Bootstrap Dropdown before (only Collapse, for the hamburger toggler, which doesn't need Popper), so this gap was never hit until now.

**Tech Stack:** Vue 3 `<script setup>`, vue-router, Bootstrap 5.3.8's own JS Dropdown/Collapse components (`data-bs-toggle` attributes, no new npm dependency — `bootstrap.bundle.min.js` already exists inside the already-installed `bootstrap` package and includes Popper).

## Global Constraints

- No visual restyling of `.btn-login-pill` or the dropdown menu's colors — Bootstrap's default dropdown appearance is used as-is (user confirmed icon-only trigger, no username shown).
- Logout does **not** navigate anywhere (`router.push`) — only `authStore.logout()` is called. This is deliberately different from the admin panel's own `AppTopbar.vue` logout, which does redirect to `/login` (out of scope, unchanged, that file is not touched by this plan).
- No change to `authStore` itself (`login`/`logout`/`checkSession`) — `handleLogout` in `GuestLayout.vue` only calls the existing `authStore.logout()`.
- No new npm dependency — the Popper fix uses `bootstrap.bundle.min.js`, already present inside the installed `bootstrap` package (confirmed: `node_modules/bootstrap/dist/js/bootstrap.bundle.min.js` exists).
- No automated test framework in this codebase — verification is manual via the browser preview tool.
- Full design rationale: `docs/superpowers/specs/2026-08-20-navbar-profile-dropdown-design.md`.

---

### Task 1: Profile dropdown (desktop) + stacked links (mobile), with the Popper prerequisite fix

**Files:**
- Modify: `frontend/src/main.js` (one-line import swap — prerequisite, see Architecture)
- Modify: `frontend/src/layouts/GuestLayout.vue` (template + `<script setup>`)

**Interfaces:**
- Consumes: `authStore.isAuthenticated` (existing, `frontend/src/stores/auth.js`, unchanged) and `authStore.logout()` (existing, unchanged).
- Produces: nothing consumed by other tasks — this is the only task.

- [ ] **Step 1: Swap the Bootstrap JS import in `frontend/src/main.js`**

Current content:

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

Replace with (only line 9 changes):

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router/index.js'
import { useAuthStore } from './stores/auth.js'

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"
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

`bootstrap.bundle.min.js` is a superset of `bootstrap.min.js` (same Collapse/Modal/etc. components the app already uses, plus Popper bundled in for Dropdown/Tooltip/Popover) — this is not expected to change any existing behavior, including the navbar-toggler's existing `data-bs-toggle="collapse"`.

- [ ] **Step 2: Replace the desktop trigger block in `frontend/src/layouts/GuestLayout.vue`**

Current content (inside the `<nav>`, the `d-flex align-items-center gap-2` wrapper):

```html
        <div class="d-flex align-items-center gap-2">
          <router-link :to="loginTarget" class="btn-login-pill d-none d-lg-inline-flex">
            {{ loginLabel }}
          </router-link>
          <button class="navbar-toggler bg-light" type="button" data-bs-toggle="collapse"
            data-bs-target="#mainNav">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
```

Replace with:

```html
        <div class="d-flex align-items-center gap-2">
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
          <button class="navbar-toggler bg-light" type="button" data-bs-toggle="collapse"
            data-bs-target="#mainNav">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
```

- [ ] **Step 3: Replace the mobile block in `frontend/src/layouts/GuestLayout.vue`**

Current content (inside `#mainNav`, after the `<ul class="navbar-nav ...">`):

```html
          <div class="d-lg-none text-center mt-3">
            <router-link :to="loginTarget" class="btn-login-pill d-inline-flex">
              {{ loginLabel }}
            </router-link>
          </div>
```

Replace with:

```html
          <div class="d-lg-none text-center mt-3" v-if="!authStore.isAuthenticated">
            <router-link to="/login" class="btn-login-pill d-inline-flex">Login</router-link>
          </div>
          <div class="d-lg-none text-center mt-3 d-flex flex-column align-items-center gap-2" v-else>
            <router-link to="/admin/dashboard" class="btn-login-pill d-inline-flex">Dashboard Admin</router-link>
            <button type="button" class="btn-login-pill d-inline-flex" @click="handleLogout">Logout</button>
          </div>
```

- [ ] **Step 4: Update `<script setup>` — remove the old computed properties, add `handleLogout`**

Current content:

```js
  import {
    ref,
    computed,
    nextTick
  } from 'vue'
  import {
    useRouter,
    useRoute
  } from 'vue-router'
  import { useAuthStore } from '@/stores/auth.js'

  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()

  const loginLabel = computed(() => (authStore.isAuthenticated ? 'Dashboard Admin' : 'Login'))
  const loginTarget = computed(() => (authStore.isAuthenticated ? '/admin/dashboard' : '/login'))

  const contact = ref({
```

Replace with:

```js
  import {
    ref,
    nextTick
  } from 'vue'
  import {
    useRouter,
    useRoute
  } from 'vue-router'
  import { useAuthStore } from '@/stores/auth.js'

  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()

  async function handleLogout() {
    await authStore.logout()
  }

  const contact = ref({
```

(Note: `computed` is removed from the `vue` import entirely — after this change nothing else in the file uses it. `router` stays, since `handleNavClick` still uses `router.push`.)

- [ ] **Step 5: Start (or confirm) the dev stack is running**

Use `preview_start` with `{"name": "pttunlibrary"}`. If port 5173 is already in use by an untracked process from an earlier session, navigate a browser tab directly to `http://localhost:5173` instead.

- [ ] **Step 6: Verify the logged-out state is unchanged**

Navigate to `http://localhost:5173/`. Desktop width (≥992px): confirm the "Login" pill renders exactly as before (no dropdown, no caret). Click it → navigates to `/login`. Then resize to mobile width (<992px), open the hamburger menu → confirm the single "Login" link still appears in the panel, unchanged.

- [ ] **Step 7: Simulate the logged-in state**

This project has no known seeded admin credentials in this environment. Simulate the session client-side via the Vue devtools hook — the router guard and this component both only read the reactive `authStore.isAuthenticated` flag, not a live backend session:

```js
const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
const appEntry = hook && hook.apps && hook.apps[0];
// Note from a prior session this day: this environment's hook shape was
// `hook.apps[0].config`, not `hook.apps[0].app.config` as some earlier
// plans assumed — check both and use whichever exists.
const globalProps = (appEntry && appEntry.app && appEntry.app.config && appEntry.app.config.globalProperties)
  || (appEntry && appEntry.config && appEntry.config.globalProperties);
const pinia = globalProps && globalProps.$pinia;
if (!pinia) throw new Error('Pinia instance not found via devtools hook');
pinia.state.value.auth.isAuthenticated = true;
pinia.state.value.auth.username = 'test-admin';
'ok';
```

Expected: no error, returns `'ok'`.

- [ ] **Step 8: Verify the desktop dropdown — this is the step that proves the Popper fix worked**

At desktop width (≥992px), confirm via `read_page` that the pill now shows only the `bi-person-circle` icon (no text), with a dropdown caret. Click it. **Check the browser console for errors at this exact moment** (`read_console_messages`) — if Step 1's import swap didn't take effect, this click throws `TypeError: Bootstrap's dropdowns require Popper` and the menu never appears; that would mean Step 1 needs to be redone, not that this step's markup is wrong.

Expected: no console error, and the dropdown menu opens showing two items, "Dashboard" and "Logout". Click "Dashboard" → navigates to `/admin/dashboard`.

- [ ] **Step 9: Verify logout does not navigate**

Navigate back to `/` (re-simulate the logged-in state from Step 7 if it was cleared by navigation — Pinia state is client-side and does not persist across a full page reload, but does survive SPA `router.push` navigation). Open the dropdown again, click "Logout". Expected:
- Via `read_page` or a JS check, confirm `authStore.isAuthenticated` (accessible through the same Pinia state path as Step 7) is now `false`.
- Confirm the browser's URL did **not** change (still on `/`, no navigation happened).
- Confirm the navbar's pill reverted to showing "Login" (not the dropdown) — proving the `v-if`/`v-else` reactivity works without a page reload.

- [ ] **Step 10: Verify the mobile stacked links**

Re-simulate `authStore.isAuthenticated = true` (Step 7's snippet). Resize the browser to a mobile width (<992px). Reload `/`. Open the hamburger menu. Expected: two separate links, "Dashboard Admin" and "Logout" (not a dropdown), stacked vertically. Click "Logout". Expected: same as Step 9 — `isAuthenticated` becomes `false`, no navigation, and (after re-opening the hamburger menu, since it may auto-close on the click) the panel now shows the single "Login" link again.

- [ ] **Step 11: Regression check — existing nav items unaffected**

At desktop width, in either auth state, click each of the 5 existing nav items (Beranda, Katalog Buku, Cek Peminjaman, Layanan, Tentang). Expected: all navigate/scroll exactly as before — this task's diff doesn't touch `navItems`, `isItemActive`, or `handleNavClick`.

- [ ] **Step 12: Self-review**

Confirm: only `frontend/src/main.js` and `frontend/src/layouts/GuestLayout.vue` were modified; `loginLabel`/`loginTarget` and the now-unused `computed` import are fully removed (not left dangling); `handleLogout` contains no `router.push` call; the dropdown's `<li>` items use `router-link`/`button` matching the design spec exactly; no admin files (`AppTopbar.vue`, `authStore`) were touched.

- [ ] **Step 13: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are in the correct working directory and on the branch you were told to commit to.

```bash
git add frontend/src/main.js frontend/src/layouts/GuestLayout.vue
git commit -m "$(cat <<'EOF'
Add profile dropdown to public navbar for logged-in staff

Logged-in state now shows a person-icon dropdown (Dashboard/Logout)
on desktop and two stacked links on mobile, instead of a single
direct link to the dashboard. Logout stays on the current public
page rather than redirecting, unlike the admin panel's own logout.

Also switches main.js to bootstrap.bundle.min.js (was bootstrap.min.js)
since Bootstrap's Dropdown component requires Popper for positioning,
which the non-bundle build doesn't include -- this project had never
used a Dropdown before (only Collapse, which doesn't need it).
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**
