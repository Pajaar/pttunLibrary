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
