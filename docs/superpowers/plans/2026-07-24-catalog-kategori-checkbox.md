# Catalog Kategori Filter: Dropdown to Checkboxes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-select Kategori `<select>` dropdown in `CatalogView.vue` with a multi-select checkbox list over the fixed 14 categories.

**Architecture:** Single-file change to `frontend/src/views/CatalogView.vue`. Swap `selectedCategory` (string) for `selectedCategories` (array), swap the data-derived `kategoriOptions` computed for a hardcoded `KATEGORI_LIST` constant, update the `matchesCategory` predicate in the existing `filteredBuku` computed to an OR-over-checked-list check, replace the dropdown markup with a scrollable checkbox list plus a conditional Reset control, and add the small amount of CSS the new markup needs (reusing existing unused `.form-check*` rules already in the file).

**Tech Stack:** Vue 3 `<script setup>`, Bootstrap classes (`.form-check`, `.form-select`, etc.), scoped CSS.

## Global Constraints

- Field/category names are Indonesian and must match the domain exactly — the 14 category strings must be copied verbatim from `CLAUDE.md`: Pidana Materiil, Pidana Khusus, Perdata, Peraturan, Biografi, Monografi Hukum, TUN, Hukum Acara, Hukum Publik, Majalah, Lain-lain, Sejarah, Statistika, Ketentuan.
- No new dependencies, no new components, no build tooling changes.
- `frontend/` has no committed `package.json` / `vite.config.js` / `index.html` (confirmed absent), so the dev server cannot be started to visually test this change in a browser. Verification in this plan is by careful code trace, not a live run. This is a pre-existing gap, not something to fix as part of this task.

---

### Task 1: Replace Kategori dropdown with multi-select checkboxes

**Files:**
- Modify: `frontend/src/views/CatalogView.vue:18` (state), `:43` (remove computed), `:61` (filter predicate), `:121-129` (template), and the `<style>` block (add rules near the existing `.form-check` rules around line 320).

**Interfaces:**
- Produces: `selectedCategories` (`ref<string[]>`, replaces `selectedCategory: ref<string>`), `KATEGORI_LIST` (`string[]`, module-level constant), `resetKategori()` (function, clears `selectedCategories`).
- Consumes: nothing new — reuses existing `daftarBuku`, `filteredBuku` computed structure.

- [ ] **Step 1: Replace `selectedCategory` state and add `KATEGORI_LIST`**

In `frontend/src/views/CatalogView.vue`, find this line (currently line 18):

```js
  const selectedCategory = ref('')
```

Replace it with:

```js
  const selectedCategories = ref([])
```

Then, directly above the `onMounted` block (currently starting at line 25), add the fixed category list as a module-level constant:

```js
  const KATEGORI_LIST = [
    'Pidana Materiil',
    'Pidana Khusus',
    'Perdata',
    'Peraturan',
    'Biografi',
    'Monografi Hukum',
    'TUN',
    'Hukum Acara',
    'Hukum Publik',
    'Majalah',
    'Lain-lain',
    'Sejarah',
    'Statistika',
    'Ketentuan',
  ]
```

- [ ] **Step 2: Remove the now-unused `kategoriOptions` computed**

Find and delete this line (currently line 43):

```js
  const kategoriOptions = computed(() => uniqueSorted(daftarBuku.value, 'nama_category'))
```

Leave `statusOptions`, `rakOptions`, `sectionOptions`, and `tahunOptions` untouched — they still use `uniqueSorted` and remain dropdown-driven.

- [ ] **Step 3: Update the category filter predicate**

Find this line inside `filteredBuku` (currently line 61):

```js
      const matchesCategory = !selectedCategory.value || buku.nama_category === selectedCategory.value
```

Replace it with:

```js
      const matchesCategory =
        selectedCategories.value.length === 0 ||
        selectedCategories.value.includes(buku.nama_category)
```

- [ ] **Step 4: Add the `resetKategori` function**

Directly below the `filteredBuku` computed (after its closing `})`, currently around line 76), add:

```js
  function resetKategori() {
    selectedCategories.value = []
  }
```

- [ ] **Step 5: Replace the Kategori filter-box template**

Find this block in the template (currently lines 121-129):

```html
          <div class="filter-box">
            <h6>Kategori</h6>
            <select class="form-select" v-model="selectedCategory">
              <option value="">Semua Kategori</option>
              <option v-for="kategori in kategoriOptions" :key="kategori" :value="kategori">
                {{ kategori }}
              </option>
            </select>
          </div>
```

Replace it with:

```html
          <div class="filter-box">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0">Kategori</h6>
              <button
                v-if="selectedCategories.length"
                type="button"
                class="btn-reset-filter"
                @click="resetKategori">
                Reset
              </button>
            </div>
            <div class="kategori-checkbox-list">
              <div class="form-check" v-for="kategori in KATEGORI_LIST" :key="kategori">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="`kategori-${kategori}`"
                  :value="kategori"
                  v-model="selectedCategories">
                <label class="form-check-label" :for="`kategori-${kategori}`">
                  {{ kategori }}
                </label>
              </div>
            </div>
          </div>
```

- [ ] **Step 6: Add CSS for the checkbox list and reset button**

In the `<style scoped>` block, directly after the existing `.form-check-input:checked` rule (currently ending around line 336), add:

```css
  .kategori-checkbox-list {
    max-height: 240px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .btn-reset-filter {
    border: none;
    background: none;
    color: #735505;
    font-size: 12px;
    font-weight: 600;
    padding: 0;
    cursor: pointer;
  }

  .btn-reset-filter:hover {
    text-decoration: underline;
  }
```

- [ ] **Step 7: Verify by code trace**

The frontend has no committed build tooling (`package.json`/`vite.config.js`/`index.html` are all absent), so it cannot be started to test live. Verify by reading the edited file end-to-end and confirming:
- No remaining reference to `selectedCategory` or `kategoriOptions` anywhere in the file (search the file for both strings — zero matches expected).
- `selectedCategories` is referenced in exactly three places: its `ref([])` declaration, the `matchesCategory` predicate, and the template (`v-model` + `v-if="selectedCategories.length"`).
- `KATEGORI_LIST` has exactly 14 entries, matching `CLAUDE.md`'s list verbatim (order doesn't need to match, content and count do).
- The `v-model="selectedCategories"` on a `<input type="checkbox">` inside a `v-for` is Vue's documented array-binding pattern (checking a box pushes its `:value` into the array; unchecking splices it out) — confirm each checkbox's `:value` is bound to the loop's `kategori` variable, not a static string.
- `resetKategori` is only reachable from the button that's conditionally rendered via `v-if="selectedCategories.length"`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/CatalogView.vue
git commit -m "$(cat <<'EOF'
Replace kategori filter dropdown with multi-select checkboxes

Staff can now filter the catalog by multiple categories at once
instead of being limited to one at a time.
EOF
)"
```

## Self-Review Notes

- **Spec coverage:** All 5 decisions in the spec map to steps above — multi-select (Step 3), fixed 14-category list (Step 1), reset control (Steps 4–5), scrollable list (Step 6), combine logic unchanged (Step 3 keeps `matchesCategory` ANDed with the other predicates in `filteredBuku`, untouched).
- **Placeholder scan:** none found — every step has literal code.
- **Type consistency:** `selectedCategories` is `ref([])` throughout (Step 1, 3, 4, 5); `KATEGORI_LIST` is a plain array used only for `v-for` iteration (Step 1, 5); `resetKategori` takes no args and returns nothing, referenced identically in Steps 4 and 5.
