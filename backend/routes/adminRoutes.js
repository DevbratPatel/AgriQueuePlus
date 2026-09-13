const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

const { optionalAuth, authenticateToken, requireRole } = require('../middleware/auth');

router.get('/overview', optionalAuth, adminController.getOverview);
router.get('/throughput', optionalAuth, adminController.getThroughput);
router.get('/crop-stats', optionalAuth, adminController.getCropStats);
router.get('/audit-logs', optionalAuth, adminController.getAuditTrail);

module.exports = router;
