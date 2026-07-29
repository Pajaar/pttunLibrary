# Catalog Kategori Filter — Dropdown to Checkboxes

Date: 2026-07-24

## Context

`CatalogView.vue` currently filters by Kategori using a single-select
`<select>` dropdown bound to `selectedCategory` (a string), with options
computed dynamically from the loaded book data (see
[2026-07-24-catalog-search-filter-design.md](2026-07-24-catalog-search-filter-design.md),
decision #8, which chose the dropdown originally). This supersedes that
decision for the Kategori filter only — all other filters (Status, Rak,
Section, Tahun Terbit) are unchanged.

The `<style>` block already has unused `.form-check` / `.form-check-label` /
`.form-check-input` rules, left over from an earlier scaffold — this change
puts them to use.

## Goal

Replace the Kategori dropdown with a multi-select checkbox list so staff can
filter by more than one category at once.

## Decisions

1. **Multi-select.** `selectedCategory = ref('')` becomes
   `selectedCategories = ref([])`. A book matches if its `nama_category` is in
   the checked list, OR'd across checked categories. Empty selection = no
   category filter (show all), matching today's "Semua Kategori" behavior.

2. **Fixed 14-category list**, hardcoded to match `CLAUDE.md` (not derived
   from loaded data): Pidana Materiil, Pidana Khusus, Perdata, Peraturan,
   Biografi, Monografi Hukum, TUN, Hukum Acara, Hukum Publik, Majalah,
   Lain-lain, Sejarah, Statistika, Ketentuan. The `kategoriOptions` computed
   property is removed (no longer used by anything).

3. **Reset control.** A small "Reset" link/button appears next to the
   "Kategori" heading only when `selectedCategories.length > 0`, and clears
   the array on click.

4. **Scrollable checkbox list.** 14 checkboxes wrapped in a container with
   `max-height` + `overflow-y: auto` inside the existing `.filter-box`, so the
   sidebar doesn't grow too tall. Styled consistently with the box's existing
   border/rounded aesthetic.

5. **Filter combine logic unchanged otherwise** — category (now OR'd
   internally) still ANDs with search text, status, rak, section, and year,
   same as every other filter.

## Out of scope

- Status/Rak/Section/Tahun Terbit filters — left as dropdowns, untouched.
- Any change to the backend or data model.

## Files touched

- `frontend/src/views/CatalogView.vue` — state, filter logic, template, and
  styles for the Kategori filter only.

## Verification

No automated test framework exists (per the prior spec). Verify manually: no
categories checked shows all books; checking one narrows correctly; checking
multiple shows the OR'd union; Reset clears back to all books; combining a
category check with search/status/rak/section/year filters ANDs correctly.
