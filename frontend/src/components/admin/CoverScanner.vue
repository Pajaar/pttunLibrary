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

  if (!modalInstance) {
    modalInstance = new Modal(modalEl.value)
    // Modal Bootstrap bisa ditutup lewat X, ESC, atau klik backdrop - semuanya
    // memanggil hide() Bootstrap secara langsung tanpa lewat close() di bawah,
    // jadi cleanup (stop kamera, lepas listener drag) tidak boleh cuma
    // ditempel di tombol X saja. Event 'hidden.bs.modal' terpicu di semua jalur
    // penutupan (termasuk hide() programatik), jadi ini satu-satunya tempat yang
    // aman untuk cleanup. Didaftarkan sekali saja di sini karena open() bisa
    // dipanggil berkali-kali.
    modalEl.value.addEventListener('hidden.bs.modal', () => {
      stopCamera()
      endDrag()
      // Modal scanner ini sengaja dibuka di atas modal form buku yang masih
      // terbuka (sibling modal, bukan nested). Bootstrap menghapus class
      // 'modal-open' dari <body> tiap modal manapun ditutup, walau modal lain
      // masih tampil - menyebabkan body "lompat" (scrollbar/padding reset) dan
      // focus-trap modal lain jadi tidak aktif. Tambahkan lagi kalau masih ada
      // modal lain yang sedang tampil.
      if (document.querySelector('.modal.show')) {
        document.body.classList.add('modal-open')
      }
    })
  }
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

  // Kalau ke-4 titik sudut digeser jadi (hampir) berhimpit, resultWidth/resultHeight
  // bisa 0 atau mendekati 0 - cv.Size(0, 0) di dalam extractPaper() akan throw
  // exception yang seringkali bukan Error biasa (kadang cuma pointer numerik dari
  // opencv.js), jadi ditangkap lebih awal di sini dengan pesan yang jelas.
  const MIN_RESULT_DIMENSION_PX = 10
  if (resultWidth < MIN_RESULT_DIMENSION_PX || resultHeight < MIN_RESULT_DIMENSION_PX) {
    errorMsg.value = 'Area yang dipilih terlalu kecil. Geser titik sudut agar membentuk area yang lebih besar.'
    return
  }

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
