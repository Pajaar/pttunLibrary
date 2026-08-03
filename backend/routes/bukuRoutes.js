const express = require('express');
const router = express.Router();

const bukuController = require('../controllers/BukuController');

router.get('/', bukuController.getSemuaBuku);
router.get('/search', bukuController.searchBuku);
router.get('/categories', bukuController.getCategory);
router.get('/category/:category', bukuController.getBukuByCategory);
router.get('/:id', bukuController.getBukuById);
router.get('/:id/rekomendasi', bukuController.getBukuRekomendasi);

module.exports = router;
