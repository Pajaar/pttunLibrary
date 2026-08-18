# Cover Scanner Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port dashboard_pttun's `CoverScanner.vue` (camera/file capture → OpenCV corner detection → drag-adjust crop → compress → upload) into pttunLibrary's `BooksView.vue`, at the hook point Plan 3 left, per `docs/superpowers/specs/2026-08-19-cover-scanner-migration-design.md`.

**Architecture:** Three plain-JS utils (`opencvLoader.js`, `opencvModule.js`, `documentDetector.js`) and one self-contained modal component (`CoverScanner.vue`) move over from dashboard_pttun essentially unchanged. Two functional fixes land during the port: the final upload call switches from dashboard_pttun's public `uploadService.js` to pttunLibrary's authenticated `uploadAdminService.js` (same pattern Plan 3 used throughout), and a real aspect-ratio bug in the crop step gets fixed (the original passes the raw photo's pixel dimensions to `jscanify.extractPaper()` as the output size instead of dimensions derived from the actual corner-point quadrilateral, producing visibly squashed crops — confirmed against `jscanify`'s own source this session). `BooksView.vue` gets a new "Scan Cover" button next to the existing plain file-upload input (Plan 3's), not replacing it.

**Tech Stack:** Vue 3 (`<script setup>`), `@techstark/opencv-js` (WASM, dynamically imported so it's a separate chunk), `jscanify` (client build, via its `/client` subpath export), `browser-image-compression`, Bootstrap 5 `Modal`.

## Global Constraints

- Indonesian user-facing text and code comments, matching the rest of the app (dashboard_pttun's source already follows this — preserve it).
- **This repo's frontend has no `frontend/package.json`** — the Vite project root is the repo root. `npm install` for the three new dependencies runs at the repo root, not inside `frontend/`.
- New dependency versions, pinned to match what dashboard_pttun already uses successfully: `@techstark/opencv-js@^5.0.0-release.1`, `jscanify@^1.4.3`, `browser-image-compression@^2.0.2`. Do not add `@popperjs/core` — dashboard_pttun lists it, but `CoverScanner.vue` only uses Bootstrap's `Modal`, which doesn't need Popper (confirmed: pttunLibrary's `main.js` already imports the non-bundle `bootstrap/dist/js/bootstrap.min.js`, which has no Popper, and Plan 3's `Modal` usage across 5 admin views already works fine without it).
- Import `jscanify` via its `/client` subpath (`import jscanify from 'jscanify/client'`), never the bare `jscanify` root import — confirmed via `node_modules/jscanify/package.json`'s `exports` map: the root `"."` export resolves to `src/jscanify-node.js`, which depends on the native `canvas` package (a `node-gyp` build dependency this project's Windows dev machine deliberately avoids elsewhere — see the auth-foundation plan's `bcryptjs`-over-`bcrypt` reasoning). `./client` resolves to the browser-only `src/jscanify.js`, with no such dependency.
- `@techstark/opencv-js` must stay behind a dynamic `import()` (never a static top-level import anywhere in the app) — it's ~13MB of WASM, and the whole point of `opencvLoader.js`'s indirection through `opencvModule.js` is to keep it out of the initial page bundle, fetched only when the scanner modal opens.
- Every admin-facing fetch call in this codebase sends `credentials: 'include'` — `uploadAdminService.js`'s `uploadCoverAdmin` (built in Plan 3) already does this; nothing new to add here, just use it instead of the public `uploadService.js`.
- No automated test framework in this repo — verification is manual, via the running dev server in the Browser pane. Live camera capture specifically cannot be exercised through this project's browser-automation tooling (no virtual camera) and needs a real device, verified by hand — same pattern as Plan 3's authenticated-login pass.
- No "Co-Authored-By" trailer on any commit — hard requirement for this repo.
- Do not touch `/backend` — `POST /api/admin/upload/cover` already exists and already works.
- Do not modify Plan 3's plain file-upload path in `BooksView.vue` — the scanner is additive, not a replacement (spec Decision 1).
- Do not remove the unused `drawHighlight` export in `documentDetector.js` — ports over unchanged (spec Decision 3 — dead code in the original, not this plan's job to clean up).

---

### Task 1: Add scanner dependencies

**Files:**
- Modify: `package.json`, `package-lock.json` (repo root) — add `@techstark/opencv-js`, `jscanify`, `browser-image-compression` via `npm install`.

**Interfaces:**
- Produces: the three packages available for import in later tasks.
- Consumes: nothing from earlier tasks (first task).

- [ ] **Step 1: Install the three dependencies at the repo root**

```bash
npm install @techstark/opencv-js@^5.0.0-release.1 jscanify@^1.4.3 browser-image-compression@^2.0.2
```

- [ ] **Step 2: Self-review**

Confirm: `package.json`'s `dependencies` block now lists all three packages (npm-managed, not hand-edited). `@popperjs/core` was NOT added (not needed — see Global Constraints). Re-check `node_modules/jscanify/package.json`'s `exports` field exists and includes a `"./client"` key pointing at `src/jscanify.js` — confirms the `/client` subpath import Task 3 will use is valid.

- [ ] **Step 3: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are inside the correct working directory and branch. If either doesn't match what you were told, STOP and report back — do not commit.

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add cover scanner dependencies (opencv-js, jscanify, image compression)

Pinned to the versions dashboard_pttun already uses successfully.
Not @popperjs/core - the scanner only uses Bootstrap's Modal, which
doesn't need it. Not consumed by any code yet.
EOF
)"
```

---

### Task 2: OpenCV loader and document-corner detector utils

**Files:**
- Create: `frontend/src/utils/opencvLoader.js`
- Create: `frontend/src/utils/opencvModule.js`
- Create: `frontend/src/utils/documentDetector.js`

**Interfaces:**
- Produces: `loadOpenCv() => Promise<cvModule>` from `opencvLoader.js` — resolves once `@techstark/opencv-js` has finished loading and initializing (dynamically imported on first call, cached for subsequent calls).
- Produces: `findDocumentCorners(cv, source) => { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } | null` from `documentDetector.js` — each corner is `{ x, y }` in `source`'s native pixel coordinates.
- Produces: `drawHighlight(cv, source, canvas, corners)` from `documentDetector.js` — unused dead code, ported for parity with the source, not called anywhere in this plan.
- Consumes: `@techstark/opencv-js` (Task 1).

- [ ] **Step 1: Create `frontend/src/utils/opencvModule.js`**

Verbatim port — this is a one-line indirection file that exists only to give `opencvLoader.js`'s dynamic `import()` a stable boundary (works around a Rolldown/Vite-8 bundler interop bug with CJS packages that default-export a Promise):

```js
// File perantara khusus supaya batas code-splitting (dynamic import) ada di sini,
// bukan langsung di paket @techstark/opencv-js - workaround untuk bug interop
// Rolldown (bundler baru Vite 8) saat sebuah paket CJS meng-export Promise sebagai
// default export-nya langsung dari dynamic import().
import cv from '@techstark/opencv-js'

export default cv
```

- [ ] **Step 2: Create `frontend/src/utils/opencvLoader.js`**

Verbatim port:

```js
const INIT_TIMEOUT_MS = 30000

let readyPromise = null

export function loadOpenCv() {
  if (readyPromise) return readyPromise
  readyPromise = doLoad()
  return readyPromise
}

async function doLoad() {
  let timer
  const timeout = new Promise(function (resolve, reject) {
    timer = setTimeout(function () {
      reject(new Error('Mesin scan (OpenCV) terlalu lama dimuat (>30 detik). Coba muat ulang halaman.'))
    }, INIT_TIMEOUT_MS)
  })

  try {
    const cv = await Promise.race([resolveCv(), timeout])
    clearTimeout(timer)
    return cv
  } catch (err) {
    clearTimeout(timer)
    readyPromise = null
    throw err
  }
}

async function resolveCv() {
  // Dynamic import supaya @techstark/opencv-js (~13MB, berisi WASM) jadi chunk
  // terpisah yang cuma di-fetch saat scanner benar-benar dibuka, bukan ikut
  // dimuat di setiap halaman lewat bundle utama.
  const mod = await import('./opencvModule.js')
  let cvModule = mod.default

  if (cvModule && typeof cvModule.then === 'function') {
    cvModule = await cvModule
  }

  if (cvModule && cvModule.Mat) {
    return cvModule
  }

  await new Promise(function (resolve) {
    cvModule.onRuntimeInitialized = function () {
      resolve()
    }
  })
  return cvModule
}
```

- [ ] **Step 3: Create `frontend/src/utils/documentDetector.js`**

Verbatim port, including the unused `drawHighlight` export (see Global Constraints):

```js
// Deteksi kontur dokumen/cover buku yang lebih robust dibanding bawaan jscanify.
//
// jscanify hanya ambil kontur area terbesar dari hasil Canny tanpa validasi bentuk -
// gagal di background bertekstur (meja kayu dll) dan di foto beresolusi tinggi, karena
// tepi Canny gampang terputus jadi ratusan potongan kecil (bukan satu kontur tertutup).
//
// Strategi di sini:
// 1. Downscale ke resolusi kerja kecil (~700px) dulu - membuat operasi morfologi
//    (dilate) jauh lebih efektif menyambung celah tepi secara relatif terhadap ukuran
//    gambar, dan jauh lebih cepat.
// 2. Ambil convex hull dari kontur kandidat (bukan approxPolyDP langsung) - ini
//    menghilangkan gerigi/cekungan kecil dari noise sebelum disederhanakan.
// 3. Coba approxPolyDP dengan epsilon meningkat bertahap sampai persis dapat 4 titik.
// 4. Skala titik yang ditemukan kembali ke resolusi asli untuk hasil akhir tajam.

const WORKING_MAX_DIM = 700
const MIN_AREA_RATIO = 0.15
const MAX_CANDIDATES = 8
const EPSILON_STEPS = [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.12, 0.15]

export function findDocumentCorners(cv, source) {
  const srcWidth = source.videoWidth || source.naturalWidth || source.width
  const srcHeight = source.videoHeight || source.naturalHeight || source.height
  const scale = Math.min(1, WORKING_MAX_DIM / Math.max(srcWidth, srcHeight))
  const workW = Math.round(srcWidth * scale)
  const workH = Math.round(srcHeight * scale)

  const workCanvas = document.createElement('canvas')
  workCanvas.width = workW
  workCanvas.height = workH
  workCanvas.getContext('2d').drawImage(source, 0, 0, workW, workH)

  const img = cv.imread(workCanvas)
  const gray = new cv.Mat()
  const blurred = new cv.Mat()
  const edged = new cv.Mat()
  const kernel = cv.Mat.ones(5, 5, cv.CV_8U)
  const dilated = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  let result = null

  try {
    cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edged, 50, 150)
    cv.dilate(edged, dilated, kernel, new cv.Point(-1, -1), 2)

    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    const imgArea = workW * workH
    const candidates = []
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const area = cv.contourArea(cnt)
      if (area >= imgArea * MIN_AREA_RATIO) {
        candidates.push({ index: i, area })
      } else {
        cnt.delete()
      }
    }
    candidates.sort((a, b) => b.area - a.area)

    for (const { index } of candidates.slice(0, MAX_CANDIDATES)) {
      const cnt = contours.get(index)
      const hull = new cv.Mat()
      cv.convexHull(cnt, hull)
      const peri = cv.arcLength(hull, true)

      for (const epsFactor of EPSILON_STEPS) {
        const approx = new cv.Mat()
        cv.approxPolyDP(hull, approx, epsFactor * peri, true)
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          const pts = []
          for (let i = 0; i < 4; i++) {
            pts.push({
              x: approx.data32S[i * 2] / scale,
              y: approx.data32S[i * 2 + 1] / scale,
            })
          }
          approx.delete()
          result = orderCorners(pts)
          break
        }
        approx.delete()
      }
      hull.delete()
      if (result) break
    }
  } finally {
    img.delete()
    gray.delete()
    blurred.delete()
    edged.delete()
    kernel.delete()
    dilated.delete()
    contours.delete()
    hierarchy.delete()
  }

  return result
}

function orderCorners(pts) {
  // Urutkan berdasarkan sudut terhadap titik pusat (centroid) - lebih tahan
  // terhadap kontur yang berotasi signifikan dibanding heuristik sum/diff,
  // yang bisa menghasilkan 2 titik "sudut" yang sama kalau bentuknya miring.
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
  const sorted = [...pts].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  )
  // `sorted` sekarang urut searah jarum jam mulai dari sudut -180deg (kiri).
  // Titik dengan (x+y) terkecil di antara 4 itu adalah yang paling dekat ke
  // pojok kiri-atas asli - jadikan itu titik awal supaya label konsisten.
  let startIdx = 0
  let minSum = Infinity
  sorted.forEach((p, i) => {
    const s = p.x + p.y
    if (s < minSum) {
      minSum = s
      startIdx = i
    }
  })
  const ordered = [...sorted.slice(startIdx), ...sorted.slice(0, startIdx)]
  return {
    topLeftCorner: ordered[0],
    topRightCorner: ordered[1],
    bottomRightCorner: ordered[2],
    bottomLeftCorner: ordered[3],
  }
}

export function drawHighlight(cv, source, canvas, corners) {
  const img = cv.imread(source)
  const ctx = canvas.getContext('2d')
  canvas.width = img.cols
  canvas.height = img.rows
  cv.imshow(canvas, img)
  img.delete()

  if (!corners) return

  const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = corners
  ctx.strokeStyle = 'orange'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(topLeftCorner.x, topLeftCorner.y)
  ctx.lineTo(topRightCorner.x, topRightCorner.y)
  ctx.lineTo(bottomRightCorner.x, bottomRightCorner.y)
  ctx.lineTo(bottomLeftCorner.x, bottomLeftCorner.y)
  ctx.lineTo(topLeftCorner.x, topLeftCorner.y)
  ctx.stroke()
}
```

- [ ] **Step 4: Syntax check**

```bash
node --check frontend/src/utils/opencvModule.js
node --check frontend/src/utils/opencvLoader.js
node --check frontend/src/utils/documentDetector.js
```
Expected: no output (all pass — `node --check` parses ESM syntax without needing to resolve the `@techstark/opencv-js` import target).

- [ ] **Step 5: Self-review**

Confirm: `opencvLoader.js`'s dynamic `import('./opencvModule.js')` path is a relative import to the sibling file created in Step 1 — both live in `frontend/src/utils/`, so the path needs no adjustment from the original. `documentDetector.js`'s `findDocumentCorners`/`drawHighlight` signatures are unchanged from source. No file in this task is imported anywhere yet — nothing is reachable until Task 3.

- [ ] **Step 6: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/utils/opencvLoader.js frontend/src/utils/opencvModule.js frontend/src/utils/documentDetector.js
git commit -m "$(cat <<'EOF'
Add OpenCV lazy-loader and document-corner detector utils

Verbatim port from dashboard_pttun. opencvModule.js exists solely to
give opencvLoader.js's dynamic import() a stable code-splitting
boundary (works around a Rolldown/Vite-8 CJS-Promise-export interop
bug). documentDetector.js's custom corner detection is more robust
than jscanify's own (handles textured backgrounds and high-res
photos). Not consumed by any component yet.
EOF
)"
```

---

### Task 3: `CoverScanner.vue` component (with the two fixes)

**Files:**
- Create: `frontend/src/components/admin/CoverScanner.vue`

**Interfaces:**
- Produces: a component with `defineExpose({ open })` — a parent calls `coverScannerRef.value.open()` to show the modal, and listens for `@uploaded="handler"` where `handler(url: string)` receives the final uploaded cover's URL.
- Consumes: `loadOpenCv` (Task 2), `findDocumentCorners` (Task 2), `uploadCoverAdmin` from `frontend/src/services/uploadAdminService.js` (already exists, built in Plan 3 — exports `uploadCoverAdmin(file) => Promise<{ url, public_id, bytes, width, height }>`), `jscanify` and `browser-image-compression` (Task 1).

- [ ] **Step 1: Create `frontend/src/components/admin/CoverScanner.vue`**

Ported from dashboard_pttun's `src/components/CoverScanner.vue`. Two changes from the original: (1) the upload call targets the authenticated `uploadCoverAdmin` instead of the public `uploadCoverImage`; (2) `confirmAdjust()` now computes the extraction canvas size from the actual corner-point geometry (a `distance()` helper plus two `Math.max` calls) instead of passing the raw photo's pixel dimensions — this is the aspect-ratio squash fix from spec Decision 3:

```vue
<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue'
import { Modal } from 'bootstrap'
import imageCompression from 'browser-image-compression'
import jscanify from 'jscanify/client'
import { loadOpenCv } from '@/utils/opencvLoader'
import { findDocumentCorners } from '@/utils/documentDetector'
import { uploadCoverAdmin } from '@/services/uploadAdminService'

const emit = defineEmits(['uploaded'])

const modalEl = ref(null)
let modalInstance = null

const loadingEngine = ref(false)
const engineError = ref('')
const errorMsg = ref('')

const step = ref('capture') // 'capture' | 'adjust' | 'preview'
const mode = ref('upload') // 'camera' | 'upload' - default upload supaya tidak langsung minta izin kamera

const videoEl = ref(null)
const fileInputEl = ref(null)

const cameraReady = ref(false)
const cameraError = ref('')
let mediaStream = null

let cv = null
let scanner = null
let resultCanvas = null
let rawSource = null // HTMLImageElement / canvas beresolusi penuh dari hasil foto/upload
let rawWidth = 0
let rawHeight = 0

const adjustImageUrl = ref('')
const adjustImgEl = ref(null)
const adjustBoxEl = ref(null)
const corners = reactive({
  tl: { x: 0, y: 0 },
  tr: { x: 0, y: 0 },
  br: { x: 0, y: 0 },
  bl: { x: 0, y: 0 },
})
let dragCorner = null

const previewUrl = ref('')
const uploading = ref(false)

async function open() {
  step.value = 'capture'
  mode.value = 'upload'
  errorMsg.value = ''
  engineError.value = ''
  previewUrl.value = ''

  if (!modalInstance) modalInstance = new Modal(modalEl.value)
  modalInstance.show()

  loadingEngine.value = true
  try {
    cv = await loadOpenCv()
    // jscanify (dan beberapa util OpenCV) memakai referensi global `cv`, bukan
    // parameter/import - harus di-expose manual karena @techstark/opencv-js tidak
    // otomatis menempel ke window saat di-bundle Vite.
    window.cv = cv
    if (!scanner) scanner = new jscanify()
  } catch (e) {
    engineError.value = e.message
    loadingEngine.value = false
    return
  }
  loadingEngine.value = false
  // Kamera baru diminta kalau user eksplisit klik tombol "Kamera" (lihat switchMode),
  // supaya modal tidak nyangkut di sini sambil menunggu prompt izin kamera dijawab.
}

const CAMERA_TIMEOUT_MS = 15000

async function startCamera() {
  cameraError.value = ''
  cameraReady.value = false
  try {
    const getUserMediaPromise = navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    })
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), CAMERA_TIMEOUT_MS),
    )
    mediaStream = await Promise.race([getUserMediaPromise, timeoutPromise])
    videoEl.value.srcObject = mediaStream
    await videoEl.value.play()
    cameraReady.value = true
  } catch (e) {
    cameraError.value =
      e.message === 'TIMEOUT'
        ? 'Kamera tidak merespons (izin belum dijawab atau tidak ada kamera). Silakan pakai "Upload Foto".'
        : 'Tidak bisa mengakses kamera (izin ditolak atau tidak ada kamera terdeteksi). Silakan pakai "Upload Foto".'
    mode.value = 'upload'
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }
  cameraReady.value = false
}

async function switchMode(m) {
  if (m === mode.value) return
  mode.value = m
  if (m === 'camera' && !mediaStream) {
    await startCamera()
  } else if (m === 'upload') {
    stopCamera()
  }
}

function captureFromCamera() {
  const video = videoEl.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  startAdjust(canvas)
}

function handleFileSelected(e) {
  const file = e.target.files[0]
  if (!file) return
  const img = new Image()
  img.onload = () => {
    startAdjust(img)
    URL.revokeObjectURL(img.src)
  }
  img.src = URL.createObjectURL(file)
  e.target.value = ''
}

function startAdjust(source) {
  rawSource = source
  rawWidth = source.videoWidth || source.naturalWidth || source.width
  rawHeight = source.videoHeight || source.naturalHeight || source.height

  const c = document.createElement('canvas')
  c.width = rawWidth
  c.height = rawHeight
  c.getContext('2d').drawImage(source, 0, 0, rawWidth, rawHeight)
  adjustImageUrl.value = c.toDataURL('image/jpeg', 0.85)

  let detected = null
  try {
    detected = findDocumentCorners(cv, source)
  } catch {
    detected = null
  }

  if (detected) {
    corners.tl = detected.topLeftCorner
    corners.tr = detected.topRightCorner
    corners.br = detected.bottomRightCorner
    corners.bl = detected.bottomLeftCorner
  } else {
    const mx = rawWidth * 0.08
    const my = rawHeight * 0.08
    corners.tl = { x: mx, y: my }
    corners.tr = { x: rawWidth - mx, y: my }
    corners.br = { x: rawWidth - mx, y: rawHeight - my }
    corners.bl = { x: mx, y: rawHeight - my }
  }

  stopCamera()
  step.value = 'adjust'
}

function displayScale() {
  if (!adjustImgEl.value || !rawWidth) return 1
  return adjustImgEl.value.clientWidth / rawWidth
}

function handleStyle(corner) {
  const s = displayScale()
  return { left: corner.x * s + 'px', top: corner.y * s + 'px' }
}

function polygonPoints() {
  const s = displayScale()
  return [corners.tl, corners.tr, corners.br, corners.bl].map((p) => `${p.x * s},${p.y * s}`).join(' ')
}

function startDrag(name, e) {
  dragCorner = name
  e.preventDefault()
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag)
}

function onDrag(e) {
  if (!dragCorner || !adjustBoxEl.value) return
  const rect = adjustBoxEl.value.getBoundingClientRect()
  const s = displayScale()
  const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width) / s
  const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height) / s
  corners[dragCorner] = { x, y }
}

function endDrag() {
  dragCorner = null
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', endDrag)
}

function backToCapture() {
  step.value = 'capture'
  adjustImageUrl.value = ''
  rawSource = null
}

// Jarak Euclidean antar 2 titik {x, y} - dipakai confirmAdjust() untuk menghitung
// ukuran hasil crop dari geometri sudut asli, bukan dari dimensi foto mentah.
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function confirmAdjust() {
  errorMsg.value = ''
  const cornerPoints = {
    topLeftCorner: corners.tl,
    topRightCorner: corners.tr,
    bottomRightCorner: corners.br,
    bottomLeftCorner: corners.bl,
  }

  // Ukuran hasil dihitung dari jarak antar titik sudut yang sebenarnya (teknik
  // "four-point transform" standar), bukan dari rawWidth/rawHeight (dimensi
  // foto mentah) seperti kode asli - itu menyebabkan crop gepeng/melar kalau
  // rasio aspek cover buku beda dari rasio aspek foto sumbernya. Lihat
  // docs/superpowers/specs/2026-08-19-cover-scanner-migration-design.md
  // Decision 3.
  const resultWidth = Math.round(Math.max(
    distance(cornerPoints.topLeftCorner, cornerPoints.topRightCorner),
    distance(cornerPoints.bottomLeftCorner, cornerPoints.bottomRightCorner),
  ))
  const resultHeight = Math.round(Math.max(
    distance(cornerPoints.topLeftCorner, cornerPoints.bottomLeftCorner),
    distance(cornerPoints.topRightCorner, cornerPoints.bottomRightCorner),
  ))

  try {
    resultCanvas = scanner.extractPaper(rawSource, resultWidth, resultHeight, cornerPoints)
  } catch (e) {
    errorMsg.value = 'Gagal memproses potongan gambar: ' + e.message
    return
  }
  if (!resultCanvas) {
    errorMsg.value = 'Gagal memproses potongan gambar.'
    return
  }
  previewUrl.value = resultCanvas.toDataURL('image/jpeg', 0.9)
  step.value = 'preview'
}

function backToAdjust() {
  step.value = 'adjust'
  previewUrl.value = ''
}

async function confirmUpload() {
  uploading.value = true
  errorMsg.value = ''
  try {
    const blob = await new Promise((resolve) => resultCanvas.toBlob(resolve, 'image/jpeg', 0.9))
    const rawFile = new File([blob], 'cover.jpg', { type: 'image/jpeg' })

    const compressedFile = await imageCompression(rawFile, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 2000,
      useWebWorker: true,
      fileType: 'image/jpeg',
    })

    const result = await uploadCoverAdmin(compressedFile)
    emit('uploaded', result.url)
    close()
  } catch (e) {
    errorMsg.value = e.message || 'Gagal memproses/mengunggah cover'
  } finally {
    uploading.value = false
  }
}

function close() {
  stopCamera()
  endDrag()
  modalInstance?.hide()
}

onBeforeUnmount(() => {
  stopCamera()
  endDrag()
})

defineExpose({ open })
</script>

<template>
  <div ref="modalEl" class="modal fade" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Scan Cover Buku</h5>
          <button type="button" class="btn-close" @click="close" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="loadingEngine" class="text-center py-5">
            <div class="spinner-border mb-2" style="color: var(--lib-green)"></div>
            <p class="text-muted mb-0">Memuat mesin scan (OpenCV)...</p>
          </div>

          <div v-else-if="engineError" class="alert alert-danger mb-0">{{ engineError }}</div>

          <template v-else>
            <div v-if="errorMsg" class="alert alert-danger py-2">{{ errorMsg }}</div>

            <div v-if="step === 'capture'">
              <div class="btn-group mb-3 w-100">
                <button
                  type="button"
                  class="btn"
                  :class="mode === 'camera' ? 'text-white' : 'btn-outline-success'"
                  :style="mode === 'camera' ? { backgroundColor: 'var(--lib-green)' } : null"
                  @click="switchMode('camera')"
                >
                  <i class="bi bi-camera me-1"></i>Kamera
                </button>
                <button
                  type="button"
                  class="btn"
                  :class="mode === 'upload' ? 'text-white' : 'btn-outline-success'"
                  :style="mode === 'upload' ? { backgroundColor: 'var(--lib-green)' } : null"
                  @click="switchMode('upload')"
                >
                  <i class="bi bi-upload me-1"></i>Upload Foto
                </button>
              </div>

              <div v-if="mode === 'camera'">
                <div class="scan-stage">
                  <video ref="videoEl" autoplay playsinline muted class="scan-video"></video>
                </div>
                <p v-if="cameraError" class="text-danger small mt-2 mb-2">{{ cameraError }}</p>
                <p v-else class="text-muted small mt-2 mb-2">Arahkan kamera ke cover buku, pastikan seluruh tepinya terlihat.</p>
                <button
                  type="button"
                  class="btn btn-lg w-100 text-white"
                  style="background-color: var(--lib-green)"
                  :disabled="!cameraReady"
                  @click="captureFromCamera"
                >
                  <i class="bi bi-camera-fill me-1"></i>Ambil Foto
                </button>
              </div>

              <div v-else class="text-center py-5 border rounded">
                <input ref="fileInputEl" type="file" accept="image/*" class="d-none" @change="handleFileSelected" />
                <i class="bi bi-file-earmark-image d-block mb-3" style="font-size: 2.5rem; color: var(--lib-green)"></i>
                <button type="button" class="btn btn-outline-success" @click="fileInputEl.click()">
                  Pilih Foto dari Perangkat
                </button>
              </div>
            </div>

            <div v-else-if="step === 'adjust'">
              <p class="text-muted small mb-2">
                Geser 4 titik sudut supaya pas dengan tepi cover buku, lalu klik "Lanjutkan".
              </p>
              <div ref="adjustBoxEl" class="adjust-box">
                <img ref="adjustImgEl" :src="adjustImageUrl" class="adjust-img" alt="Foto cover" draggable="false" />
                <svg class="adjust-svg">
                  <polygon :points="polygonPoints()" fill="rgba(10,138,95,0.2)" stroke="var(--lib-green)" stroke-width="2" />
                </svg>
                <div
                  v-for="name in ['tl', 'tr', 'br', 'bl']"
                  :key="name"
                  class="corner-handle"
                  :style="handleStyle(corners[name])"
                  @pointerdown="startDrag(name, $event)"
                ></div>
              </div>
              <div class="d-flex gap-2 justify-content-center mt-3">
                <button type="button" class="btn btn-outline-secondary" @click="backToCapture">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Ambil Ulang
                </button>
                <button type="button" class="btn text-white" style="background-color: var(--lib-green)" @click="confirmAdjust">
                  Lanjutkan<i class="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
            </div>

            <div v-else-if="step === 'preview'" class="text-center">
              <img :src="previewUrl" class="scan-preview-img mb-3" alt="Preview cover" />
              <div class="d-flex gap-2 justify-content-center">
                <button type="button" class="btn btn-outline-secondary" @click="backToAdjust">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Atur Ulang Titik
                </button>
                <button
                  type="button"
                  class="btn text-white"
                  style="background-color: var(--lib-green)"
                  :disabled="uploading"
                  @click="confirmUpload"
                >
                  <span v-if="uploading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-check-lg me-1"></i>Gunakan Foto Ini
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-stage {
  position: relative;
  width: 100%;
  background-color: #000;
  border-radius: 0.5rem;
  overflow: hidden;
  aspect-ratio: 3 / 4;
}

.scan-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.scan-preview-img {
  max-width: 100%;
  max-height: 420px;
  border-radius: 0.5rem;
  border: 1px solid #d8dee6;
}

.adjust-box {
  position: relative;
  width: 100%;
  line-height: 0;
  user-select: none;
  touch-action: none;
}

.adjust-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 0.5rem;
}

.adjust-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.corner-handle {
  position: absolute;
  width: 26px;
  height: 26px;
  margin-left: -13px;
  margin-top: -13px;
  border-radius: 50%;
  background-color: var(--lib-green);
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  cursor: grab;
  touch-action: none;
}

.corner-handle:active {
  cursor: grabbing;
}
</style>
```

- [ ] **Step 2: Self-review**

Confirm: line-by-line diff the two changed spots against the original — (1) the `import` line reads `import { uploadCoverAdmin } from '@/services/uploadAdminService'` (not `uploadCoverImage`/`uploadService`), and `confirmUpload()`'s call is `await uploadCoverAdmin(compressedFile)`; (2) `confirmAdjust()` no longer references `rawWidth`/`rawHeight` in the `extractPaper()` call — it computes `resultWidth`/`resultHeight` from the `distance()` helper first. Every other function, the full template, and the full `<style>` block are byte-for-byte identical to dashboard_pttun's source. `jscanify` is imported from `'jscanify/client'`, not bare `'jscanify'`. Not reachable yet — no other file imports this component until Task 4.

- [ ] **Step 3: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/components/admin/CoverScanner.vue
git commit -m "$(cat <<'EOF'
Add CoverScanner.vue with auth-service and aspect-ratio fixes

Ported from dashboard_pttun. Two changes from the original: uploads
through the authenticated uploadCoverAdmin instead of the public
uploadService (matches every other Plan 3 admin call), and
confirmAdjust() now computes the crop's output size from the actual
corner-point geometry instead of the raw photo's pixel dimensions -
fixes a real squashed-crop bug when the book cover's aspect ratio
doesn't match the source photo's frame shape. Not reachable yet - no
view imports this component until a later task.
EOF
)"
```

---

### Task 4: Wire into `BooksView.vue`, end-to-end verification

**Files:**
- Modify: `frontend/src/views/admin/BooksView.vue` — add the scanner import, its trigger state/handlers, the "Scan Cover" button, and the component itself, at the existing hook-point comment (line 495 as of this session).

**Interfaces:**
- Consumes: `CoverScanner` (Task 3, default export, exposes `open()`, emits `uploaded`).

- [ ] **Step 1: Modify `frontend/src/views/admin/BooksView.vue`** — add the import, after the existing `uploadAdminService` import

```js
import { uploadCoverAdmin } from '@/services/uploadAdminService.js'
import CoverScanner from '@/components/admin/CoverScanner.vue'
```

- [ ] **Step 2: Add scanner trigger state and handler** — insert right after the existing `handleCoverFileChange` function (the plain-upload handler stays untouched, this is added alongside it)

```js
const coverScannerRef = ref(null)
function openCoverScanner() {
  coverScannerRef.value?.open()
}
function handleCoverScannerUploaded(url) {
  form.image_url = url
}
```

- [ ] **Step 3: Replace the hook-point comment with the "Scan Cover" button**

Find this exact line (currently the last line inside the cover field's `<div class="flex-grow-1">`):

```html
                      <!-- Hook point untuk Plan 4: tombol "Scan Cover" (CoverScanner) akan ditambahkan di sini -->
```

Replace it with:

```html
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-success mt-1"
                        @click="openCoverScanner"
                      >
                        <i class="bi bi-camera me-1"></i>Scan Cover
                      </button>
```

- [ ] **Step 4: Add the `<CoverScanner>` component**, immediately after the closing `</div>` of the create/edit modal (`</div>` that closes the outer `<div ref="modalEl" class="modal fade" ...>` block) and before the closing `</AdminLayout>` tag

```html
    <CoverScanner ref="coverScannerRef" @uploaded="handleCoverScannerUploaded" />
```

- [ ] **Step 5: Self-review**

Confirm: the plain file-upload input, `handleCoverFileChange`, `uploadingCover`, and `uploadError` are all still present and untouched (Task 4 is additive only). The new button and `<CoverScanner>` element both compile as valid Vue template syntax — re-read the surrounding HTML to confirm no unclosed tags were introduced. `coverScannerRef`/`openCoverScanner`/`handleCoverScannerUploaded` names don't collide with any existing identifier in the file (re-grep for `coverScannerRef` and `openCoverScanner` — should be exactly the two new declarations plus their two usages).

- [ ] **Step 6: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. STOP if either doesn't match.

```bash
git add frontend/src/views/admin/BooksView.vue
git commit -m "$(cat <<'EOF'
Wire CoverScanner into BooksView.vue's cover field

Adds a "Scan Cover" button next to the existing plain file-upload
input (Plan 3's) at the hook point it left - additive, not a
replacement. Both paths set form.image_url through the same field.
EOF
)"
```

- [ ] **Step 7: Start the dev server**

Use `preview_start` with `{"name": "pttunlibrary"}` (frontend, port 5173) — restart it if one from an earlier session might be stale (check `preview_logs` for a clean Vite "ready" message with no build errors; this is the first time the three new dependencies and `CoverScanner.vue` actually get compiled).

- [ ] **Step 8: STOP — ask before logging in for authenticated verification**

Verifying this feature needs an authenticated admin session on `/admin/books`. Ask the user: "OK to log in and try the cover scanner (file-upload-into-scanner path) to verify it end-to-end?" Do not type the password yourself under any circumstances — either the user types credentials into a tab you're driving and you verify via `window.location.href`/network checks afterward, or the user drives their own session and reports results back per-step (both patterns were used during Plan 3's verification — pick whichever the user confirms is actually the shared session you can inspect, don't assume). Do not proceed past this point without an explicit yes.

- [ ] **Step 9: Verify the file-upload-into-scanner path**

Once authenticated on `/admin/books`: open "Tambah Buku", click "Scan Cover". Confirm the modal opens and shows "Memuat mesin scan (OpenCV)..." briefly, then the capture screen. Click "Upload Foto", pick any image file. Confirm it advances to the "adjust" step with 4 draggable corner handles positioned somewhere on the image (auto-detected or the default margin box — either is fine). Drag a corner, confirm the highlighted polygon updates live. Click "Lanjutkan". Confirm it advances to "preview" with a cropped image shown. Click "Gunakan Foto Ini". Confirm the modal closes and the book form's cover preview thumbnail now shows the scanned image (i.e. `form.image_url` updated) — check the network tab for a `POST /api/admin/upload/cover` request that succeeded (201).

- [ ] **Step 10: Specifically verify the aspect-ratio fix**

Pick (or ask the user to provide) a test image where the "document" region within the photo has a clearly different aspect ratio than the full photo itself — e.g. a portrait-oriented rectangle drawn/visible within a landscape photo, or vice versa. Run through Step 9 again with it, adjusting the corners to trace that region precisely. Confirm the resulting preview/cropped image preserves the region's actual proportions (not stretched to match the source photo's frame shape) — this is the specific bug from spec Decision 3.

- [ ] **Step 11: Note camera capture as unverified**

Camera mode (`getUserMedia`) cannot be exercised through this project's browser-automation tooling (no virtual camera). Tell the user this remains untested pending a manual check on a real device with a camera — do not attempt to fake or skip past this, just record it as a known gap, same as Plan 3 left cover-upload and the "Tandai Dikembalikan" click itself as gaps pending real preconditions.

- [ ] **Step 12: Self-review**

Confirm: no console errors during the verified flow beyond expected ones (if any 404/500 appeared, investigate before calling this done). The plain file-upload path (Plan 3's) still works — do a quick regression check by uploading through that field as well as the scanner, confirming both correctly set `form.image_url`. If Steps 7-11 surfaced a real bug requiring a code fix, fix it, re-verify the affected step, and commit that fix with a commit message describing the specific bug and fix (same discipline as every other commit in this plan) before calling this task done.

## Out of scope

- Camera capture live verification — needs a real device, left for the user to do by hand (see Task 4 Step 11).
- Removing the dead `drawHighlight` export in `documentDetector.js` — ports over unchanged, not this plan's job.
- Any backend change — `POST /api/admin/upload/cover` already exists and works.
- HTTPS/deployment configuration for camera access in any non-`localhost` production deployment — a known browser-security limitation, not solved here.
- This is the last plan in the dashboard_pttun merge — once it's done and verified, the merge effort itself is complete. `CLAUDE.md`'s stale schema documentation (deferred across Plans 1-3) is still outstanding and worth doing as a wrap-up, but is not part of this plan's scope.
