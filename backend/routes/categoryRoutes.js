const express = require('express')
const router = express.Router()

const categoryController = require('../controllers/CategoryController')
const { writeLimiter } = require('../middleware/rateLimiter')

router.get('/', categoryController.getCategory)
router.get('/search', categoryController.searchCategory)
router.post('/', writeLimiter, categoryController.createCategory)
router.put('/:id', writeLimiter, categoryController.updateCategory)
router.delete('/:id', writeLimiter, categoryController.deleteCategory)

module.exports = router
