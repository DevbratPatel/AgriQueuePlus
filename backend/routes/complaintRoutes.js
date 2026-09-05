const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

router.get('/', complaintController.getComplaints);
router.post('/', complaintController.createComplaint);
router.patch('/:id/resolve', complaintController.resolveComplaint);

module.exports = router;
