const express = require('express');
const penggunaController = require('../controllers/PenggunaController');

const router = express.Router();

router.get('/', penggunaController.getPengguna);

module.exports = router;
