# Katalog Buku: Mobile Filter Dropdown — Design Spec

Date: 2026-08-20

## Context

`CatalogView.vue`'s filter controls (Kategori checkboxes, Ketersediaan,
Rak, Tahun Terbit — each a `.filter-box` inside a `col-lg-3` sidebar
column) currently only respond to Bootstrap's `lg` grid breakpoint
(992px): below that, `col-lg-3` becomes a full-width column and stacks
*above* the book listing, pushing all book results far down the page on
mobile/tablet. User wants this replaced, below 992px only, with a
compact "Filter" dropdown button placed next to the existing "Cari Buku"
search button — desktop (≥992px) is unchanged.

Reference: a mockup image showing a search input with a small dark
dropdown button ("Images ▾") immediately to its right, opening a menu of
options below it.

## Goal

1. **Desktop (≥992px):** no visual or behavioral change — sidebar stays
   exactly as it is today.
2. **Mobile/tablet (<992px):** the sidebar column is hidden. A "Filter"
   button appears in the same row as the existing "Cari Buku" button
   (side by side, matching the reference image), opening a dropdown
   panel containing the same 4 filter groups.
3. Filter state stays a single source of truth — the mobile dropdown's
   inputs bind to the exact same reactive refs (`selectedCategories`,
   `selectedStatus`, `selectedRak`, `selectedYear`) the desktop sidebar
   already uses. No new state, no sync logic — both copies of the markup
   just read/write the same refs, matching the pattern already used this
   session for the navbar's duplicated desktop/mobile login controls.

## Decisions

### 1. Hide the sidebar below 992px

`frontend/src/views/CatalogView.vue`'s sidebar column gets `d-none
d-lg-block` added to its existing `col-lg-3` class — hidden by default,
shown only at the `lg` breakpoint and up. No other change to the sidebar
itself.

### 2. Filter button placement: nested flex row inside `.search-container`

`.search-container` is already `display: flex; align-items: center`
with two children (`.search-input-wrapper`, flex:1, and `.search-button`).
A media query at `max-width: 768px` switches it to `flex-direction:
column` (input above button, both full width) — this is *narrower* than
the sidebar's 992px breakpoint, so between 768px and 992px the search bar
is already in its "row" desktop-ish layout while the sidebar has already
switched off. That's intentional, not a conflict: the Filter button's own
visibility is gated on 992px (`d-lg-none`), independent of the search
bar's internal 768px restyling.

To keep "Cari Buku" and the new "Filter" button side by side *even when*
`.search-container` itself goes column at 768px, both buttons are wrapped
in a new `.search-actions` flex row:

```html
<div class="search-container">
  <div class="search-input-wrapper">
    <i class="fas fa-search search-icon"></i>
    <input type="text" class="form-control search-input"
      placeholder="Cari berdasarkan judul buku, pengarang, atau penerbit..."
      v-model="searchQuery">
  </div>
  <div class="search-actions">
    <button class="search-button" type="button"> Cari Buku </button>
    <div class="dropdown d-lg-none">
      <button class="search-button dropdown-toggle" type="button"
        data-bs-toggle="dropdown" aria-expanded="false">
        Filter
      </button>
      <div class="dropdown-menu dropdown-menu-end filter-dropdown-menu p-3">
        <!-- 4 filter-box blocks, see Decision 3 -->
      </div>
    </div>
  </div>
</div>
```

The Filter trigger reuses the existing `.search-button` class directly
(plus Bootstrap's `dropdown-toggle`, which adds the caret via CSS) —
same navy background/white text/rounded shape as "Cari Buku", so the two
read as a matched pair with zero new button-specific CSS.

New CSS:

```css
.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

And inside the existing `@media (max-width: 768px)` block, override the
button's previous `width: 100%` (which assumed it was the only element in
its row) so it shares space with the Filter button instead of forcing
Filter onto a second line:

```css
@media (max-width: 768px) {
  .search-actions {
    width: 100%;
  }
  .search-actions .search-button {
    width: auto;
    flex: 1;
  }
}
```

### 3. Dropdown content: the same 4 filter-box blocks, duplicated

The dropdown-menu contains the identical Kategori/Ketersediaan/Rak/Tahun
Terbit blocks already in the sidebar, reusing the existing `.filter-box`
class for visual consistency (white card, gold border) — verbatim
copies of the existing markup and `v-model` bindings, with one required
change: the Kategori checkboxes' `id`/`for` pairs get a `-mobile` suffix
(`kategori-mobile-${kategori}` instead of `kategori-${kategori}`) so the
two simultaneously-present-in-the-DOM copies (desktop hidden via CSS,
mobile hidden via CSS — both still exist in the DOM, only one visible at
a time per breakpoint) don't produce duplicate `id` attributes, which is
invalid HTML and would break the `<label for>` association for whichever
copy isn't first in the DOM. The `<select>` elements need no such change
(they're associated with their filter by a plain `<h6>` label, not
`for`/`id`).

```html
<div class="dropdown-menu dropdown-menu-end filter-dropdown-menu p-3">
  <div class="filter-box mb-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Kategori</h6>
      <button v-if="selectedCategories.length" type="button" class="btn-reset-filter"
        @click="resetKategori">
        Reset
      </button>
    </div>
    <div class="kategori-checkbox-list">
      <div class="form-check" v-for="kategori in kategoriOptions" :key="kategori">
        <input class="form-check-input" type="checkbox" :id="`kategori-mobile-${kategori}`"
          :value="kategori" v-model="selectedCategories">
        <label class="form-check-label" :for="`kategori-mobile-${kategori}`">
          {{ kategori }}
        </label>
      </div>
    </div>
  </div>

  <div class="filter-box mb-3">
    <h6>Ketersediaan</h6>
    <select class="form-select" v-model="selectedStatus">
      <option value="">Semua Status</option>
      <option v-for="status in statusOptions" :key="status" :value="status">
        {{ status }}
      </option>
    </select>
  </div>

  <div class="filter-box mb-3">
    <h6>Rak</h6>
    <select class="form-select" v-model="selectedRak">
      <option value="">Semua Rak</option>
      <option v-for="rak in rakOptions" :key="rak" :value="rak">
        {{ rak }}
      </option>
    </select>
  </div>

  <div class="filter-box mb-0">
    <h6>Tahun Terbit</h6>
    <select class="form-select" v-model="selectedYear">
      <option value="">Semua Tahun</option>
      <option v-for="tahun in tahunOptions" :key="tahun" :value="tahun">
        {{ tahun }}
      </option>
    </select>
  </div>
</div>
```

Since every input inside this block binds to the exact same refs the
sidebar's copy binds to, checking a category (or changing status/rak/
year) in the mobile dropdown updates `filteredBuku`/`sortedBuku` exactly
as it already does today — no changes to any `computed` property, no new
watcher.

### 4. Dropdown panel sizing

```css
.filter-dropdown-menu {
  width: min(320px, 90vw);
  max-height: 70vh;
  overflow-y: auto;
}
```

`min(320px, 90vw)` keeps the panel a reasonable fixed width on most
phones while never exceeding 90% of the viewport on very narrow screens
(avoiding edge-to-edge overflow). `max-height: 70vh` with `overflow-y:
auto` keeps four stacked filter groups (one of which — Kategori — is
itself a scrollable checkbox list up to 220px tall) from ever pushing the
dropdown panel off-screen vertically; the panel scrolls internally
instead.

## Files touched

- `frontend/src/views/CatalogView.vue` — sidebar column class, new
  `.search-actions` wrapper + Filter dropdown in the template, four new/
  modified CSS rules (`.search-actions`, the `768px` media query
  addition, `.filter-dropdown-menu`). No other file touched — no new
  Vue component, no changes to `<script setup>` (all bindings reuse
  existing refs/computed/functions).

## Out of scope

- Any change to desktop's sidebar appearance or behavior.
- A "reset all filters" action (only the existing per-Kategori reset
  exists today; not expanding that here).
- Persisting whether the mobile dropdown was open across navigation —
  it's a stock Bootstrap dropdown, closes on outside click/selection
  exactly like the navbar profile dropdown built earlier this session.
- Restyling `.filter-box`, the checkbox list, or the selects themselves
  — reused as-is for visual consistency with the desktop sidebar.

## Testing / verification

No automated test framework in this codebase (unchanged from prior
specs). Manual verification via the browser preview tool:

- Desktop (≥992px): confirm the page looks pixel-identical to before —
  sidebar visible on the left, no Filter button visible anywhere.
- Mobile width (<992px, e.g. 375px and 800px to cover both the 768px and
  992px breakpoints): confirm the sidebar is not rendered/visible, and
  "Cari Buku" + "Filter" appear side by side in one row below the search
  input (not stacked).
- Click "Filter": dropdown opens showing all 4 filter groups; panel stays
  within the viewport (no horizontal overflow) and scrolls internally if
  taller than 70vh.
- Check a Kategori checkbox and change the Rak/Status/Tahun selects
  inside the mobile dropdown: confirm the book listing below re-filters
  exactly as it does when using the desktop sidebar's equivalent controls
  (cross-check by resizing to desktop width afterward and confirming the
  sidebar's own controls show the same selected state — proving both
  copies share the same underlying refs).
- Click "Reset" next to Kategori inside the mobile dropdown: confirms
  `resetKategori()` still works from this second copy of the button.
- No duplicate-`id` console warnings, and clicking a mobile Kategori
  label correctly toggles its checkbox (proving the `-mobile` suffixed
  `id`/`for` pairing works).
