const express = require('express');
const router = express.Router();

const bukuController = require('../controllers/BukuController');

router.get('/', bukuController.getSemuaBuku);

module.exports = router;
