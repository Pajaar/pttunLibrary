# Katalog Mobile Filter Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Below 992px, replace the Katalog Buku sidebar filter column (which currently stacks full-width above the book listing) with a "Filter" dropdown button placed next to the existing "Cari Buku" button; desktop (≥992px) is unchanged.

**Architecture:** Single-file change. The sidebar column is hidden below `lg` via a Bootstrap display utility. A new Bootstrap dropdown, visible only below `lg`, is added next to the search button, containing a second copy of the same 4 filter groups (Kategori/Ketersediaan/Rak/Tahun Terbit) bound to the exact same reactive refs the sidebar already uses — no new state, no sync code.

**Tech Stack:** Vue 3 `<script setup>` (template-only change, no script edits), Bootstrap 5's Dropdown component (already working project-wide since this session's earlier `bootstrap.bundle.min.js` fix), scoped CSS.

## Global Constraints

- Desktop (≥992px) must look and behave identically to before this change — sidebar unchanged, no Filter button visible.
- The mobile dropdown's inputs must bind to the exact same refs as the desktop sidebar (`selectedCategories`, `selectedStatus`, `selectedRak`, `selectedYear`) and call the exact same `resetKategori()` function — no new `<script setup>` code of any kind.
- The Kategori checkboxes' `id`/`for` pairs in the mobile copy must use a `-mobile` suffix (`kategori-mobile-${kategori}`) to avoid duplicate `id` attributes with the desktop sidebar's copy, which remains `kategori-${kategori}` — both copies exist in the DOM simultaneously (one hidden via CSS depending on viewport), so unprefixed duplicate ids would be invalid HTML and break the `<label for>` association.
- The Filter trigger button reuses the existing `.search-button` class (plus Bootstrap's `dropdown-toggle`) — no new button-specific CSS for its base appearance.
- No automated test framework in this codebase — verification is manual via the browser preview tool.
- Full design rationale: `docs/superpowers/specs/2026-08-20-katalog-mobile-filter-dropdown-design.md`.

---

### Task 1: Hide sidebar below 992px, add mobile Filter dropdown

**Files:**
- Modify: `frontend/src/views/CatalogView.vue`

**Interfaces:**
- Consumes: existing refs/computed/functions from this file's own `<script setup>` — `selectedCategories`, `selectedStatus`, `selectedRak`, `selectedYear`, `kategoriOptions`, `statusOptions`, `rakOptions`, `tahunOptions`, `resetKategori()`. All already exist; none are modified by this task.
- Produces: nothing consumed by other tasks — this is the only task.

- [ ] **Step 1: Hide the sidebar column below `lg`**

Current content (around line 243):

```html
        <!-- Sidebar Filter -->
        <div class="col-lg-3">
```

Replace with:

```html
        <!-- Sidebar Filter -->
        <div class="col-lg-3 d-none d-lg-block">
```

- [ ] **Step 2: Restructure the search bar to add the Filter dropdown**

Current content (the full `.search-container` block, around lines 227-239):

```html
    <div class="container my-4">
      <div class="search-container">
        <div class="search-input-wrapper">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            class="form-control search-input"
            placeholder="Cari berdasarkan judul buku, pengarang, atau penerbit..."
            v-model="searchQuery">
        </div>
        <button class="search-button" type="button"> Cari Buku </button>
      </div>
    </div>
```

Replace with:

```html
    <div class="container my-4">
      <div class="search-container">
        <div class="search-input-wrapper">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            class="form-control search-input"
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
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 3: Add `.search-actions` CSS and the 768px override**

Current content (around lines 460-475):

```css
.search-button {
  height: 48px;
  padding: 0 28px;
  border: none;
  border-radius: 25px;
  background-color: #0B1E3F;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.search-button:hover {
  background-color: #735505;
}

/* Filter Sidebar */
```

Replace with:

```css
.search-button {
  height: 48px;
  padding: 0 28px;
  border: none;
  border-radius: 25px;
  background-color: #0B1E3F;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.search-button:hover {
  background-color: #735505;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-dropdown-menu {
  width: min(320px, 90vw);
  max-height: 70vh;
  overflow-y: auto;
}

/* Filter Sidebar */
```

- [ ] **Step 4: Add the 768px override so "Cari Buku" shares its row with "Filter" instead of forcing full width**

Current content (inside the existing `@media (max-width: 768px)` block, around lines 753-757):

```css
  .search-button {
    width: 100%;
    height: 44px;
    border-radius: 12px;
  }
```

Replace with:

```css
  .search-actions {
    width: 100%;
  }

  .search-actions .search-button {
    width: auto;
    flex: 1;
    height: 44px;
    border-radius: 12px;
  }
```

(Note: this changes the selector from the bare `.search-button` to
`.search-actions .search-button` — the Filter dropdown-toggle button
also carries the `.search-button` class per Step 2, and it must NOT
receive `width: 100%`/`flex: 1` sizing at this breakpoint, only the
literal "Cari Buku" button should. Scoping the selector to
`.search-actions .search-button` matches both buttons equally in this
case since both are actually inside `.search-actions` — re-read this
against Step 5's verification: if the Filter button visually grows to
match "Cari Buku"'s flexed width at ≤768px, that is fine and expected,
since both share `.search-button`; what must NOT happen is either
button reverting to `width: 100%` and pushing the other onto a new
line.)

- [ ] **Step 5: Start (or confirm) the dev stack is running**

Use `preview_start` with `{"name": "pttunlibrary"}`. If port 5173 is already in use by an untracked process, navigate a browser tab directly to `http://localhost:5173` instead.

- [ ] **Step 6: Verify desktop is unchanged**

Resize the browser to ≥992px (e.g. 1280px). Navigate to `/katalog`. Confirm via `read_page`: the sidebar (Kategori/Ketersediaan/Rak/Tahun Terbit) is visible on the left exactly as before, and no "Filter" button/dropdown is present anywhere on the page.

- [ ] **Step 7: Verify mobile — sidebar hidden, buttons side by side**

Resize to a mobile width (375px). Reload `/katalog`. Confirm via `read_page`/`getBoundingClientRect`: the sidebar (Kategori/Ketersediaan/Rak/Tahun Terbit column) is not rendered/visible anywhere on the page, and "Cari Buku" and "Filter" appear in the same horizontal row (compare their `getBoundingClientRect().top` values — should be equal or very close, confirming they're side by side, not stacked).

- [ ] **Step 8: Verify the dropdown opens and stays on-screen**

At the same mobile width, click "Filter". Confirm via `read_page` that a panel opens showing all 4 groups: "Kategori" (with checkboxes), "Ketersediaan", "Rak", "Tahun Terbit" (each a `<select>`). Confirm via `getBoundingClientRect()` on the `.filter-dropdown-menu` element that its `right` edge does not exceed `window.innerWidth` (no horizontal overflow off the right side of the screen).

- [ ] **Step 9: Verify filter state is shared with the desktop sidebar**

Still at mobile width, inside the open dropdown: check one Kategori checkbox, and select a non-default option in the "Rak" dropdown. Confirm the book listing below re-filters (fewer results shown, or a "Tidak ada buku yang cocok dengan filter Anda" message if the combination matches nothing). Then resize the browser to ≥992px (desktop). Confirm via `read_page` that the desktop sidebar's own Kategori checkbox (same category) is now checked, and its own Rak `<select>` shows the same selected value — proving both copies read/write the same underlying refs.

- [ ] **Step 10: Verify the mobile Reset button**

Resize back to mobile width, open the Filter dropdown again. Confirm a "Reset" link is visible next to "Kategori" (since a category is still checked from Step 9). Click it. Confirm the checkbox unchecks and the book listing updates accordingly (matching what `resetKategori()` already does from the desktop sidebar).

- [ ] **Step 11: Verify no duplicate-id issues**

With the mobile dropdown open and at least one Kategori checkbox visible, run `read_console_messages` (or check dev tools) — confirm no browser warning about duplicate `id` attributes. Click directly on a Kategori *label* (not the checkbox itself) inside the mobile dropdown — confirm it correctly toggles that checkbox (proving the `-mobile`-suffixed `id`/`for` pairing works).

- [ ] **Step 12: Regression check — search input and pagination unaffected**

At mobile width, type something into the search input and confirm results still filter by title/author/publisher exactly as before (this task didn't touch `searchQuery` or `filteredBuku`). If there are enough results to paginate, confirm pagination controls at the bottom of the page still work.

- [ ] **Step 13: Self-review**

Confirm: only `frontend/src/views/CatalogView.vue` was modified; no `<script setup>` line was touched (diff should be entirely within `<template>` and `<style scoped>`); the mobile Kategori checkboxes use `kategori-mobile-${kategori}` ids, desktop's remain unprefixed `kategori-${kategori}`; the Filter trigger button has classes `search-button dropdown-toggle` (reusing existing styling, no new button CSS).

- [ ] **Step 14: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are in the correct working directory and on the branch you were told to commit to.

```bash
git add frontend/src/views/CatalogView.vue
git commit -m "$(cat <<'EOF'
Replace Katalog sidebar with a Filter dropdown below 992px

The filter sidebar previously stacked full-width above the book
listing on mobile/tablet, pushing results far down the page. Below
992px it's now hidden, replaced by a Filter dropdown button next to
the existing Cari Buku button, containing the same 4 filter groups
bound to the same refs the desktop sidebar already uses. Desktop
(>=992px) is unchanged.
EOF
)"
```

**Do not add a "Co-Authored-By" trailer of any kind to the commit message.**
