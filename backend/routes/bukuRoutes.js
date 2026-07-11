const express = require('express');
const router = express.Router();

const bukuController = require('../controllers/BukuController');

router.get('/', bukuController.getSemuaBuku);
router.get('/search', bukuController.searchBuku);
router.get('/:id', bukuController.getBukuById);

module.exports = router;
