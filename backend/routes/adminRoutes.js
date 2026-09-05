const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/overview', adminController.getOverview);
router.get('/throughput', adminController.getThroughput);
router.get('/crop-stats', adminController.getCropStats);

module.exports = router;
