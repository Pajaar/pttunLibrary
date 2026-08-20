# Public Navbar: True Centering + Admin Login Button — Design Spec

Date: 2026-08-20

## Context

The public site's navbar (`frontend/src/layouts/GuestLayout.vue`, rendered
on every non-admin page via `GuestLayout`) has two issues:

1. **The nav links aren't visually centered.** Bootstrap's default navbar
   markup is `brand → toggler → collapse(nav-links)`, laid out with
   `justify-content: space-between` on the `.container` (confirmed via
   direct inspection of the running dev server at `localhost:5173`:
   `container` computed style is `display:flex; justify-content:
   space-between`). `.navbar-collapse` currently has `flex-grow: 1`, so it
   fills all space *after* the brand, and `.navbar-nav`'s
   `justify-content-center` centers the links within that remaining box —
   not within the full bar. Measured on a 1280px viewport: container spans
   x=[62.5, 1202.5] (true center ≈632.5), but the nav-links box spans
   x=[231, 1190.5] (its center ≈710.75) — the links render about 78px
   right of the bar's actual center, purely because the brand on the left
   isn't balanced by anything on the right.
2. **No way to reach the admin login from the public site.** The admin
   panel (session-based auth, `frontend/src/stores/auth.js`, route guard
   in `frontend/src/router/index.js`) already exists and is reachable at
   `/login` → `/admin/dashboard`, but nothing on the public-facing pages
   links to it.

Both are fixed together since the login button's placement (top-right)
is also the natural counterweight that keeps the centering fix correct
regardless of button/brand width — see Decision 1.

## Goal

1. Nav links render genuinely centered in the navbar, independent of the
   width of whatever sits to their left (brand) or right (new login
   button).
2. A "Login" / "Dashboard Admin" button appears at the far right of the
   navbar, linking to the existing `/login` page or straight to
   `/admin/dashboard` depending on whether a staff session is already
   active — reusing the existing `authStore`, no new auth logic.

Both changes are confined to `frontend/src/layouts/GuestLayout.vue`. No
other file changes.

## Decisions

### 1. True centering via `position: absolute`, not flex-grow

`flex-grow`-based centering (the current approach) only centers within
whatever space is left after neighboring flex items — it silently breaks
again any time the brand text or the new login button changes width. Fix:
take `.navbar-collapse` out of normal flex flow and center it against the
`.container` directly, at the `lg` breakpoint only (below that, Bootstrap's
default collapse/hamburger behavior — a full-width dropdown panel — must
be untouched):

```css
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
```

With `.navbar-collapse` absolutely positioned, it's removed from the
`.container`'s flex flow — the container's remaining flex children
(brand, and the new right-side wrapper holding the login button + toggler)
are laid out by Bootstrap's existing `justify-content: space-between`,
landing naturally at the two edges. The centered nav floats independently
in the middle, unaffected by either side's width. `992px` matches the
`navbar-expand-lg` class already on the `<nav>` element — same breakpoint,
no new one introduced.

### 2. Login button: session-aware label/target, existing store only

```js
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

const authStore = useAuthStore()

const loginLabel = computed(() => (authStore.isAuthenticated ? 'Dashboard Admin' : 'Login'))
const loginTarget = computed(() => (authStore.isAuthenticated ? '/admin/dashboard' : '/login'))
```

`authStore.isAuthenticated` is already populated at app boot
(`main.js:19-23` calls `authStore.checkSession()` before mounting), so
this is reactive with zero new session-checking logic — if a staff member
already has a valid session cookie and lands on the public site, the
button shows "Dashboard Admin" immediately without an extra round trip
beyond the boot-time check that already happens today. Rendered as
`<router-link :to="loginTarget">{{ loginLabel }}</router-link>` — plain
Vue Router navigation, matching the pattern already used elsewhere
(`PeminjamanFormView.vue`'s "Kembali ke Detail Buku" / "Cek Status
Peminjaman" links).

### 3. Placement: visible on desktop, duplicated inside the mobile panel

Desktop (`≥992px`): the button sits in a small flex wrapper next to the
navbar-toggler button (which Bootstrap already hides at this breakpoint
via its own `.navbar-expand-lg .navbar-toggler { display: none }`), so
only the login button is visible there — always reachable without opening
any menu.

Mobile (`<992px`): the same toggler-adjacent slot would only show the
toggler (login button hidden via `d-none d-lg-inline-flex`), so a second
copy of the same button is rendered *inside* the collapsible
`#mainNav` panel, below the nav links — reachable via the existing
hamburger menu, consistent with how the nav links themselves work on
mobile. Two `<router-link>` elements with the same `loginTarget`/
`loginLabel` bindings, one hidden per breakpoint via Bootstrap's `d-none
d-lg-*` utilities — no JS-level breakpoint detection needed.

### 4. Button style: reuse the existing gold/navy token pair, new small pill class

The codebase already has a gold-background/navy-text pattern (`main.css`
lines 389-394, used for other on-navy accents) and CSS custom properties
`--gold` / `--navy` / `--gold-light` (`main.css` `:root`, lines 182-186).
Rather than reusing `.btn-gold` (a large, outlined hero button, `main.css:
338-346` — the wrong size and visual weight for a navbar slot), this adds
one small scoped class in `GuestLayout.vue` (which currently has no
`<style>` block of its own):

```css
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
```

`var(--gold)` etc. resolve correctly from a scoped style block because
Vue's `scoped` attribute only affects selector matching, not CSS custom
property inheritance — the variables are declared on `:root` in the
globally-imported `main.css` (`main.js:12`) and inherit normally into
every component regardless of scoping.

## Markup change (full picture)

`frontend/src/layouts/GuestLayout.vue`, current nav block (lines 60-78):

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

Becomes:

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

## Files touched

- `frontend/src/layouts/GuestLayout.vue` — markup (above), `<script
  setup>` additions (`computed`, `useAuthStore`, `loginLabel`,
  `loginTarget`), one new `<style scoped>` block. No other file is
  touched — `main.css` is not modified, no admin files are touched, no
  backend changes.

## Out of scope

- Any change to `/login`'s own page or behavior — it already works
  (`LoginView.vue`, unchanged), this spec only adds a link to it.
- Any change to the admin route guard or session logic — reusing
  `authStore.isAuthenticated` exactly as it exists today.
- A logout affordance in the public navbar — the button's job is getting
  staff *into* the admin panel; the admin panel itself already has its
  own logout control inside `AdminLayout.vue` (untouched, out of scope).
- Restyling the rest of the navbar (brand text, nav-link colors, mobile
  hamburger icon) — only the centering mechanism and the new button are
  in scope.

## Testing / verification

No automated test framework in this codebase (unchanged from prior
specs). Manual verification via the browser preview tool, at both a
desktop width (≥992px) and a mobile width (<992px):

- Desktop: nav links (Beranda/Katalog Buku/Cek Peminjaman/Layanan/Tentang)
  render horizontally centered in the navbar bar — measure via
  `getBoundingClientRect()` that the nav-links box's midpoint matches the
  `.container`'s midpoint (within a few px), not offset toward either
  edge, matching the diagnosis in Context.
- Desktop, logged out (no admin session): "Login" pill button visible at
  the far right of the bar; clicking navigates to `/login`.
- Desktop, logged in (visit `/login`, sign in, then navigate back to a
  public page like `/`): button now reads "Dashboard Admin"; clicking
  navigates straight to `/admin/dashboard`.
- Mobile width: toggler button visible top-right (login pill hidden at
  this width); opening the hamburger menu shows the nav links followed by
  the same login/dashboard button, correctly labeled per session state.
- No regressions: brand link, existing nav-link click/scroll behavior
  (`handleNavClick`, including the `targetId` scroll-into-view items),
  and the admin panel's own existing login/logout flow are all unaffected.
