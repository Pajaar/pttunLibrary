const { cloudinary, isConfigured } = require('../config/cloudinary')

exports.uploadCover = async (req, res) => {
  if (!isConfigured) {
    return res.status(500).json({
      message: 'Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET di backend/.env',
    })
  }

  if (!req.file) {
    return res.status(400).json({ message: 'File cover wajib diunggah' })
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'pttun-library/covers',
          resource_type: 'image',
          quality: 'auto:good',
          fetch_format: 'auto',
        },
        (error, uploadResult) => {
          if (error) reject(error)
          else resolve(uploadResult)
        },
      )
      stream.end(req.file.buffer)
    })

    res.status(201).json({
      message: 'Cover berhasil diunggah',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      },
    })
  } catch (error) {
    console.error('Gagal mengunggah cover ke Cloudinary:', error)
    res.status(500).json({ message: 'Gagal mengunggah cover ke Cloudinary' })
  }
}
