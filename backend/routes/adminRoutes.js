const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const adminBukuRoutes = require('./adminBukuRoutes')
const categoryRoutes = require('./categoryRoutes')
const rakRoutes = require('./rakRoutes')
const uploadRoutes = require('./uploadRoutes')
const adminPeminjamanRoutes = require('./adminPeminjamanRoutes')

const router = express.Router()

router.use(requireAuth)

router.use('/buku', adminBukuRoutes)
router.use('/category', categoryRoutes)
router.use('/rak', rakRoutes)
router.use('/upload', uploadRoutes)
router.use('/peminjaman', adminPeminjamanRoutes)

module.exports = router
