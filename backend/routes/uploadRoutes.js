const express = require('express')
const multer = require('multer')
const uploadController = require('../controllers/UploadController')
const { adminWriteLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB safety cap
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus berupa gambar'))
    }
    cb(null, true)
  },
})

router.post('/cover', adminWriteLimiter, upload.single('cover'), uploadController.uploadCover)

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file maksimal 8MB' : 'Gagal memproses file yang diunggah',
    })
  }
  if (err) {
    console.error('Gagal memproses upload:', err)
    return res.status(400).json({ message: 'Gagal memproses file yang diunggah' })
  }
  next()
})

module.exports = router
