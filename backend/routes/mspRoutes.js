const express = require('express');
const router = express.Router();
const mspController = require('../controllers/mspController');

router.get('/', mspController.getAllMSP);
router.get('/calculate', mspController.calculateCropValue);

module.exports = router;
