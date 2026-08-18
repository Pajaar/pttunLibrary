const express = require('express')
const router = express.Router()

const categoryController = require('../controllers/CategoryController')
const { adminWriteLimiter } = require('../middleware/rateLimiter')

router.get('/', categoryController.getCategory)
router.get('/search', categoryController.searchCategory)
router.post('/', adminWriteLimiter, categoryController.createCategory)
router.put('/:id', adminWriteLimiter, categoryController.updateCategory)
router.delete('/:id', adminWriteLimiter, categoryController.deleteCategory)

module.exports = router
