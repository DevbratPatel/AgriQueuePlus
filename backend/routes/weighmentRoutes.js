const express = require('express');
const router = express.Router();
const weighmentController = require('../controllers/weighmentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/', authenticateToken, requireRole('agent', 'distributor', 'admin'), weighmentController.recordWeighment);
router.get('/', authenticateToken, requireRole('agent', 'distributor', 'admin'), weighmentController.getAllWeighments);
router.get('/:bookingId', authenticateToken, weighmentController.getWeighment);

module.exports = router;
