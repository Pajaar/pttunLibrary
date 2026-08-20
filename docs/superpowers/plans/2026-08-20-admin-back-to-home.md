# Login + Admin Back-to-Home Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give staff a way back to the public site from two currently dead-end places: the login form (`/login`) and every admin page (via the shared topbar), without touching logout behavior or any visual redesign.

**Architecture:** Two small, independent, single-file changes. `LoginView.vue` gets a plain `<router-link to="/">` inside its existing form. `AppTopbar.vue` (shared by every `/admin/*` route via `AdminLayout.vue`) gets a second icon button next to the existing "Keluar" (logout) button — same styling, different destination, no new script logic.

**Tech Stack:** Vue 3 `<script setup>`, vue-router (`<router-link>`), Bootstrap Icons (already loaded project-wide).

## Global Constraints

- Navigation only — no visual redesign of the login card or the admin topbar/sidebar beyond the one new element each (user confirmed this explicitly during brainstorming).
- Neither addition touches `authStore` or calls `authStore.logout()` — both are pure `router`/`<router-link>` navigation to `/`. The existing "Keluar" button's `handleLogout()` call is untouched.
- `AppTopbar.vue`'s new button must match the existing "Keluar" button's classes exactly (`btn btn-sm btn-outline-light`, icon-only with a `title` tooltip) so the two read as a consistent pair.
- `LoginView.vue`'s new link uses `var(--lib-green)` on hover — the same custom property already used by `.btn-lib-green` in this file's existing `<style scoped>` block.
- No automated test framework in this codebase — verification is manual via the browser preview tool.
- Full design rationale: `docs/superpowers/specs/2026-08-20-admin-back-to-home-design.md`.

---

### Task 1: "Kembali ke Beranda" link on the login page

**Files:**
- Modify: `frontend/src/views/LoginView.vue`

**Interfaces:**
- Consumes: nothing from other tasks (independent of Task 2).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Add the link inside the form, after the submit button**

Current content:

```html
          <button type="submit" class="btn btn-lib-green w-100 text-white" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
            Masuk
          </button>
        </form>
```

Replace with:

```html
          <button type="submit" class="btn btn-lib-green w-100 text-white" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
            Masuk
          </button>
          <div class="text-center mt-3">
            <router-link to="/" class="back-home-link">
              <i class="bi bi-arrow-left me-1"></i>Kembali ke Beranda
            </router-link>
          </div>
        </form>
```

- [ ] **Step 2: Add the two new CSS rules to the existing `<style scoped>` block**

Current content:

```css
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

Replace with:

```css
<style scoped>
.btn-lib-green {
  background-color: var(--lib-green);
}

.btn-lib-green:hover {
  background-color: var(--lib-green-dark);
  color: #fff;
}

.back-home-link {
  color: #6c757d;
  font-size: 0.875rem;
  text-decoration: none;
}

.back-home-link:hover {
  color: var(--lib-green);
  text-decoration: underline;
}
</style>
```

- [ ] **Step 3: Start (or confirm) the dev stack is running**

Use `preview_start` with `{"name": "pttunlibrary"}`. If port 5173 is already in use by an untracked process from an earlier session, navigate a browser tab directly to `http://localhost:5173` instead.

- [ ] **Step 4: Verify the link renders and navigates**

Navigate to `http://localhost:5173/login`. Confirm via `read_page` that a link reading "Kembali ke Beranda" (with a left-arrow icon) is visible below the "Masuk" button, inside the white card. Click it. Expected: navigates to `/` (the public landing page — confirm the URL changed and the page shows the public site, e.g. the "PTTUN Library" navbar brand).

- [ ] **Step 5: Regression check — existing login form behavior unaffected**

Navigate back to `/login`. Try submitting the form with both fields empty. Expected: the existing validation message "Username dan password wajib diisi." still appears (unchanged — this task didn't touch `handleSubmit` or the script block at all).

- [ ] **Step 6: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are in the correct working directory and on the branch you were told to commit to.

```bash
git add frontend/src/views/LoginView.vue
git commit -m "$(cat <<'EOF'
Add Kembali ke Beranda link to the login page

LoginView.vue was previously a dead end with no way back to the
public site. Adds a plain router-link to / below the submit button,
styled to match the existing card's green theme on hover.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**

---

### Task 2: "Kembali ke Beranda" button in the admin topbar

**Files:**
- Modify: `frontend/src/components/admin/AppTopbar.vue`

**Interfaces:**
- Consumes: nothing from other tasks (independent of Task 1).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Insert the new button between the username and the "Keluar" button**

Current content:

```html
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
```

Replace with:

```html
    <div class="d-flex align-items-center gap-3">
      <span class="text-white-50 small d-none d-md-inline">{{ authStore.username }}</span>
      <router-link to="/" class="btn btn-sm btn-outline-light" title="Kembali ke Beranda">
        <i class="bi bi-house-door"></i>
      </router-link>
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
```

No `<script>` changes — `handleLogout` and every other existing line stay exactly as they are.

- [ ] **Step 2: Start (or confirm) the dev stack is running**

Use `preview_start` with `{"name": "pttunlibrary"}` if not already running from Task 1.

- [ ] **Step 3: Reach an admin page without real credentials — simulate a session via Pinia**

This project has no known seeded admin credentials in this environment (same situation as the prior navbar-login-button session). The router guard (`frontend/src/router/index.js`) only checks the client-side reactive `authStore.isAuthenticated` flag — it doesn't make a live backend call on every navigation — so this flag can be simulated directly:

```js
const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
const appEntry = hook && hook.apps && hook.apps[0];
const pinia = appEntry && appEntry.app.config.globalProperties.$pinia;
if (!pinia) throw new Error('Pinia instance not found via devtools hook');
pinia.state.value.auth.isAuthenticated = true;
pinia.state.value.auth.username = 'test-admin';
'ok';
```

Expected: no error, returns `'ok'`.

- [ ] **Step 4: Navigate to an admin page and verify the new button renders**

Navigate to `http://localhost:5173/admin/dashboard`. Expected: the guard now lets this through (since `isAuthenticated` is `true`), the dashboard renders. Confirm via `read_page` that a house-icon button (`title="Kembali ke Beranda"`) is visible in the topbar, positioned between the username area and the "Keluar" button.

Navigate to a second admin route, `http://localhost:5173/admin/books`. Expected: the same house-icon button is visible there too — confirms it's `AdminLayout`-wide (rendered via the shared `AppTopbar.vue`), not specific to the dashboard page.

- [ ] **Step 5: Click the new button — verify navigation without logout**

From `/admin/books`, click the house-icon button. Expected: navigates to `/` (public landing page).

Now navigate directly back to `http://localhost:5173/admin/dashboard`. Expected: renders normally, does **not** redirect to `/login` — confirms the button only navigated, it never called `authStore.logout()` or cleared `isAuthenticated`.

- [ ] **Step 6: Regression check — "Keluar" still works and is unaffected by the new button**

Still on `/admin/dashboard` (from Step 5), click "Keluar". Expected: this calls the existing `handleLogout()` (which calls `authStore.logout()` then redirects to `/login`) exactly as before — confirms adding the new sibling button didn't interfere with the existing button's `@click` binding.

- [ ] **Step 7: Reset the simulated Pinia state**

```js
const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
const pinia = hook.apps[0].app.config.globalProperties.$pinia;
pinia.state.value.auth.isAuthenticated = false;
pinia.state.value.auth.username = null;
'ok';
```

(This step may be redundant if Step 6's real `handleLogout()` call already reset `isAuthenticated` to `false` — run it anyway to be certain, it's a no-op if already reset.)

- [ ] **Step 8: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are in the correct working directory and on the branch you were told to commit to.

```bash
git add frontend/src/components/admin/AppTopbar.vue
git commit -m "$(cat <<'EOF'
Add Kembali ke Beranda button to the admin topbar

Every /admin/* page (via AdminLayout -> AppTopbar) previously had no
way back to the public site except logging out. Adds a house-icon
button next to the existing Keluar button that navigates to / while
keeping the admin session active.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**
