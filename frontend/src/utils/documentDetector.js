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
