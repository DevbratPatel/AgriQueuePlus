const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

const { optionalAuth, authenticateToken } = require('../middleware/auth');

router.get('/', optionalAuth, complaintController.getComplaints);
router.post('/', optionalAuth, complaintController.createComplaint);
router.patch('/:id/resolve', optionalAuth, complaintController.resolveComplaint);

module.exports = router;
