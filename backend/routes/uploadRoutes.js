const express = require('express')
const multer = require('multer')
const uploadController = require('../controllers/UploadController')
const { writeLimiter } = require('../middleware/rateLimiter')

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

router.post('/cover', writeLimiter, upload.single('cover'), uploadController.uploadCover)

module.exports = router
