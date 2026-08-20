# Navbar Centering + Admin Login Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** True-center the public navbar's nav links (currently skewed right because the left-side brand isn't balanced by anything on the right) and add a session-aware "Login"/"Dashboard Admin" button at the far right, reusing the existing auth store.

**Architecture:** Single-file change. `.navbar-collapse` is pulled out of the `.container`'s flex flow via `position: absolute` (centered against the container itself, at the `lg` breakpoint only) so it centers independent of sibling widths. A new right-side wrapper holds a `<router-link>` whose label/target are `computed()` from the already-existing `authStore.isAuthenticated` — visible on desktop, duplicated inside the mobile collapse panel for reachability there too.

**Tech Stack:** Vue 3 `<script setup>`, vue-router, Pinia (`useAuthStore`, already implemented), Bootstrap 5 utility classes, one new scoped `<style>` block.

## Global Constraints

- Only `frontend/src/layouts/GuestLayout.vue` is touched. No changes to `main.css`, no admin files (`AdminLayout.vue`, anything under `frontend/src/views/admin/`), no backend files, no route-guard changes.
- Centering fix applies at `min-width: 992px` — matches the `navbar-expand-lg` class already on the `<nav>` element. Below that width, Bootstrap's existing collapse/hamburger behavior must be unchanged.
- Login button label/target: `authStore.isAuthenticated === false` → label `"Login"`, target `/login`; `authStore.isAuthenticated === true` → label `"Dashboard Admin"`, target `/admin/dashboard`. No new auth/session logic — `authStore` (`frontend/src/stores/auth.js`) is used exactly as it exists today, already populated at boot by `main.js`.
- Button style: solid `var(--gold)` background, `var(--navy)` text, pill shape (`border-radius: 999px`) — these CSS custom properties are already declared globally in `frontend/src/assets/styles/main.css`'s `:root` and are available in any scoped style block via normal CSS inheritance.
- No automated test framework in this codebase — verification is manual via the browser preview tool.
- Full design rationale: `docs/superpowers/specs/2026-08-20-navbar-center-login-design.md`.

---

### Task 1: Center the navbar, add the login button

**Files:**
- Modify: `frontend/src/layouts/GuestLayout.vue:60-78` (nav markup)
- Modify: `frontend/src/layouts/GuestLayout.vue` (`<script setup>` block — add imports/computed)
- Modify: `frontend/src/layouts/GuestLayout.vue` (add a new `<style scoped>` block — file currently has none)

**Interfaces:**
- Consumes: `useAuthStore` from `frontend/src/stores/auth.js` (existing, exports `isAuthenticated: boolean`, already populated by the time any page renders since `main.js` awaits `checkSession()` before mounting).
- Produces: nothing consumed by other tasks — this is the only task.

- [ ] **Step 1: Replace the nav markup at `frontend/src/layouts/GuestLayout.vue:60-78`**

Current content:

```html
    <nav class="navbar navbar-expand-lg navbar-main w-100">
      <div class="container">
        <a class="navbar-brand brand" href="#">PTTUN Library</a>
        <button class="navbar-toggler bg-light" type="button" data-bs-toggle="collapse"
          data-bs-target="#mainNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav justify-content-center w-100 gap-3 gap-lg-0">
            <li class="nav-item" v-for="(item, i) in navItems" :key="i">
              <a href="#" class="nav-link" :class="{ active: isItemActive(item) }"
                @click.prevent="handleNavClick(item)">
                {{ item.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
```

Replace with:

```html
    <nav class="navbar navbar-expand-lg navbar-main w-100">
      <div class="container">
        <a class="navbar-brand brand" href="#">PTTUN Library</a>

        <div class="d-flex align-items-center gap-2">
          <router-link :to="loginTarget" class="btn-login-pill d-none d-lg-inline-flex">
            {{ loginLabel }}
          </router-link>
          <button class="navbar-toggler bg-light" type="button" data-bs-toggle="collapse"
            data-bs-target="#mainNav">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>

        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav justify-content-center w-100 gap-3 gap-lg-0">
            <li class="nav-item" v-for="(item, i) in navItems" :key="i">
              <a href="#" class="nav-link" :class="{ active: isItemActive(item) }"
                @click.prevent="handleNavClick(item)">
                {{ item.label }}
              </a>
            </li>
          </ul>
          <router-link :to="loginTarget" class="btn-login-pill d-lg-none mt-3 align-self-center">
            {{ loginLabel }}
          </router-link>
        </div>
      </div>
    </nav>
```

- [ ] **Step 2: Add the `computed` imports and auth-derived properties in `<script setup>`**

Current content (top of the `<script setup>` block):

```js
  import {
    ref,
    nextTick
  } from 'vue'
  import {
    useRouter,
    useRoute
  } from 'vue-router'

  const router = useRouter()
  const route = useRoute()
```

Replace with:

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
```

- [ ] **Step 3: Add the new `<style scoped>` block**

`GuestLayout.vue` currently has no `<style>` block at all — its very last lines are the closing `</script>` tag, immediately followed by end of file. Append this new block at the end of the file, after `</script>`:

```html

<style scoped>
.navbar-main .container {
  position: relative;
}

@media (min-width: 992px) {
  .navbar-main .navbar-collapse {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    flex-grow: 0;
  }
}

.btn-login-pill {
  background-color: var(--gold);
  color: var(--navy);
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.4rem 1.1rem;
  border-radius: 999px;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.btn-login-pill:hover {
  background-color: var(--gold-light);
  color: var(--navy);
}
</style>
```

- [ ] **Step 4: Start (or confirm) the dev stack is running**

Use the preview tool for the `pttunlibrary` launch config (frontend, port 5173). If port 5173 is already in use by an untracked process from an earlier session, navigate the browser tab directly to `http://localhost:5173` instead of restarting it.

- [ ] **Step 5: Verify centering at desktop width**

Resize the browser viewport to at least 1280px wide (desktop). Navigate to `/`. Run this in the page's JS context to measure the actual rendered positions:

```js
const container = document.querySelector('.navbar-main .container');
const collapse = document.querySelector('.navbar-main .navbar-collapse');
const c = container.getBoundingClientRect();
const n = collapse.getBoundingClientRect();
JSON.stringify({
  containerMid: (c.left + c.right) / 2,
  navMid: (n.left + n.right) / 2,
  diff: Math.abs(((c.left + c.right) / 2) - ((n.left + n.right) / 2)),
});
```

Expected: `diff` is a small number (a few px, from padding/rounding) — not the ~78px offset measured before this change. The nav-links block is now centered against the full container, not just the space after the brand.

- [ ] **Step 6: Verify the login button, logged-out state**

With no admin session active (default state on a fresh page load — `authStore.isAuthenticated` starts `false` and stays `false` unless a valid session cookie exists), confirm via `read_page` that a button/link labeled exactly **"Login"** is visible in the navbar's top-right area. Click it. Expected: navigates to `/login`.

- [ ] **Step 7: Verify the login button, logged-in state — via direct Pinia state (no real credentials needed)**

Navigate back to `/`. This project has no known seeded admin credentials available in this environment, so verify the session-aware branch by mutating the Pinia store's reactive state directly in the browser's JS context (Vite dev builds always expose the Vue devtools hook, and Pinia's plugin registers itself on `app.config.globalProperties.$pinia` when installed):

```js
const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
const appEntry = hook && hook.apps && hook.apps[0];
const pinia = appEntry && appEntry.app.config.globalProperties.$pinia;
if (!pinia) throw new Error('Pinia instance not found via devtools hook');
pinia.state.value.auth.isAuthenticated = true;
pinia.state.value.auth.username = 'test-admin';
'ok';
```

Expected: no error, returns `'ok'`. Then confirm via `read_page` that the button now reads exactly **"Dashboard Admin"**. Click it. Expected: navigates to `/admin/dashboard` (this route itself is guarded and may redirect back to `/login` since there's no *real* backend session — that's fine and expected; the thing being verified here is only that the navbar button's label and `:to` target respond correctly to `authStore.isAuthenticated`, not the admin route guard itself, which is pre-existing and out of scope).

Afterward, reset the mutated state so it doesn't leak into later verification steps:

```js
pinia.state.value.auth.isAuthenticated = false;
pinia.state.value.auth.username = null;
'ok';
```

- [ ] **Step 8: Verify mobile behavior**

Resize the browser viewport to below 992px wide (e.g. 375px, mobile preset). Reload `/`. Expected: the desktop login button is hidden; only the hamburger toggler is visible top-right. Click the toggler to open the collapse panel. Expected: nav links appear, followed by a "Login" button/link (reading "Login" since the Step-7 state reset ran before this step) at the bottom of the panel. Click it. Expected: navigates to `/login`.

- [ ] **Step 9: Regression check — existing nav behavior unaffected**

At desktop width again: click each of the existing nav items (Beranda, Katalog Buku, Cek Peminjaman, Layanan, Tentang). Expected: all still navigate/scroll exactly as before (Layanan/Tentang scroll-into-view on the home page, Beranda/Katalog Buku/Cek Peminjaman route-navigate) — this markup change only added a sibling wrapper and a `<style>` block, it didn't touch `navItems`, `isItemActive`, or `handleNavClick`.

- [ ] **Step 10: Self-review**

Confirm: only `frontend/src/layouts/GuestLayout.vue` was modified (`git status` / `git diff --stat`); `main.css` untouched; no admin files touched; the two `<router-link>` login buttons (desktop + mobile) both bind to the same `loginLabel`/`loginTarget` computed properties, not duplicated/diverging logic; the `992px` media query breakpoint matches `navbar-expand-lg`.

- [ ] **Step 11: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are in the correct working directory and on the branch you were told to commit to.

```bash
git add frontend/src/layouts/GuestLayout.vue
git commit -m "$(cat <<'EOF'
Center public navbar and add session-aware admin login button

Nav links now center against the full navbar bar via absolute
positioning instead of flex-grow, so they stay centered regardless of
sibling widths. Adds a Login/Dashboard Admin pill button at the right,
driven by the existing authStore.isAuthenticated.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**
