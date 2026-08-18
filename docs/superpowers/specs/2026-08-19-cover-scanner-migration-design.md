# Cover Scanner Migration — Design Spec

Date: 2026-08-19

Plan 4 of 4 in the dashboard_pttun merge — the last one (see
`docs/superpowers/dashboard-merge-status.md`). Plans 1-3 are done, pushed,
and manually verified. This plan ports dashboard_pttun's `CoverScanner.vue`
component into pttunLibrary's `BooksView.vue`, which currently has a plain
file-upload cover field with a code comment marking this exact hook point
(left there deliberately by Plan 3).

## Context

`CoverScanner.vue` (471 lines, in `dashboard_pttun/src/components/`) is a
self-contained Bootstrap-modal component: capture a photo of a physical book
cover (camera or file upload) → auto-detect the document's four corners
using a custom OpenCV-based detector (`documentDetector.js`, tuned to be
more robust than jscanify's stock detection — handles textured backgrounds
and high-resolution photos where jscanify alone fails) → let the user
drag-adjust the four corner handles → `jscanify.extractPaper()` warps/crops
the region into a flat rectangular image → `browser-image-compression`
shrinks the result → upload → emit the resulting URL to the parent.

It depends on three utils, all in `dashboard_pttun/src/utils/`:
- `opencvLoader.js` — lazy-loads `@techstark/opencv-js` (~13MB of WASM) via
  dynamic `import()`, so it's a separate chunk fetched only when the scanner
  modal actually opens, never part of the initial page bundle. Also exposes
  the loaded module as `window.cv`, since jscanify reads a global rather than
  a parameter.
- `opencvModule.js` — a one-line indirection file whose only job is to give
  the dynamic `import()` in `opencvLoader.js` a stable boundary (works around
  a Rolldown/Vite-8 bundler interop bug with CJS packages that default-export
  a Promise).
- `documentDetector.js` — the custom corner-detection algorithm
  (`findDocumentCorners`) plus an unused `drawHighlight` helper (never called
  anywhere in `CoverScanner.vue` — dead code even in the original).

dashboard_pttun's original `BooksView.vue` placed a "Scan / Upload Cover"
button next to a manual URL text input for the cover field. Plan 3 replaced
that URL field with a plain `<input type="file">` that uploads directly via
the new `uploadCoverAdmin` service (`POST /api/admin/upload/cover`,
authenticated) — dashboard_pttun's own scanner uploaded through its public,
unauthenticated `uploadService.js` instead, which doesn't apply here.

## Goal

Give staff a way to photograph a physical book cover and get a cropped,
straightened image out — not just upload an already-clean image file, which
the plain input (kept from Plan 3) already covers.

## Decisions

### 1. Both upload paths coexist — scanner does not replace the plain upload

The plain file input from Plan 3 stays as-is. A new "Scan Cover" button sits
next to it (at the hook-point comment), opening the scanner modal. Both set
`form.image_url` on success via the same field — whichever the user does
last wins, exactly as if there were two ways to fill in one text box. This
matches dashboard_pttun's original intent of offering staff a choice
depending on what they're starting from (a clean image file vs. a physical
book in front of them).

### 2. Both capture modes ported — camera and file-upload-into-scanner

The scanner keeps both its original modes: live camera capture
(`getUserMedia`) and picking an existing photo to then crop/straighten. Camera
mode requires a secure context (HTTPS or `localhost`) per browser security
rules — a known, inherent limitation, not something to design around; it
works today (dev is always `localhost`) and would need HTTPS in any
non-`localhost` production deployment. Camera mode also can't be exercised
through this project's automated browser-verification tooling (no virtual
camera available) — that path gets verified by hand, on a real device, same
as the authenticated-login pass was for Plan 3.

### 3. Verbatim port, one call-site change

`CoverScanner.vue` and its three utils move over unchanged except:
- Import paths adjusted (`@/components/admin/CoverScanner.vue` instead of
  dashboard's bare `@/components/CoverScanner.vue`, to match the
  `components/admin/` convention Plan 3 established for `AppSidebar.vue`/
  `AppTopbar.vue`).
- The one substantive change: `confirmUpload()`'s call to
  `uploadCoverImage` (dashboard's public, unauthenticated service) becomes a
  call to `uploadCoverAdmin` (Plan 4's target — the already-existing,
  authenticated admin service from Plan 3's `uploadAdminService.js`). Same
  backend endpoint either way (`POST /api/admin/upload/cover`), just the
  correctly-credentialed client function.

No other logic changes — the corner-detection algorithm, the drag-adjust
interaction, the compression settings (`maxSizeMB: 0.5`, `maxWidthOrHeight:
2000`), and the capture/adjust/preview step flow all port as-is. The unused
`drawHighlight` export in `documentDetector.js` ports over unchanged too
(dead code in the original; removing it isn't this plan's job and risks
missing some external caller that isn't obvious from a local read).

### 4. `BooksView.vue` wiring

```js
import CoverScanner from '@/components/admin/CoverScanner.vue'

const coverScannerRef = ref(null)
function openCoverScanner() {
  coverScannerRef.value?.open()
}
function handleCoverUploaded(url) {
  form.image_url = url
}
```

A new button next to the existing file input:
```html
<button type="button" class="btn btn-sm btn-outline-success" @click="openCoverScanner">
  <i class="bi bi-camera me-1"></i>Scan Cover
</button>
```
replacing the hook-point comment, and `<CoverScanner ref="coverScannerRef" @uploaded="handleCoverUploaded" />` added once, alongside the existing form modal (same nesting level dashboard_pttun used — inside `AdminLayout`, sibling to the create/edit modal).

### 5. New dependencies

Root `package.json` gains `@techstark/opencv-js`, `jscanify`,
`browser-image-compression` — pinned to the same versions dashboard_pttun
used (`^5.0.0-release.1`, `^1.4.3`, `^2.0.2` respectively). Installed via
`npm install` at the repo root, same as Plan 3's `chart.js`/`vue-chartjs`
(no `frontend/package.json` exists — the Vite root is the repo root).

## Out of scope

- Removing the dead `drawHighlight` export — ports over unchanged (see
  Decision 3).
- Any change to the plain file-upload path Plan 3 built — untouched.
- Any backend change — `POST /api/admin/upload/cover` already exists,
  already works, already accepts whatever image the client sends.
- HTTPS/deployment configuration for camera access in production — noted as
  a known limitation, not solved here.

## Testing / verification

No automated test framework in this repo (established convention, every
plan so far). Manual verification via the running dev server: the
file-upload-into-scanner path (pick a photo → confirm corners
auto-detect or fall back to a default box → drag-adjust → confirm crop
preview renders → confirm upload succeeds and `form.image_url` updates →
confirm the book form still submits normally afterward) is verifiable
through this project's existing browser-automation tooling. Live camera
capture needs a real device with a camera, verified by hand — same pattern
as Plan 3's authenticated-login pass, which also needed a human in the loop
for parts the automated tooling structurally can't reach.
