const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

const { optionalAuth, authenticateToken } = require('../middleware/auth');

router.get('/', optionalAuth, bookingController.getBookings);
router.post('/', optionalAuth, bookingController.createBooking);
router.get('/:id/tracker', optionalAuth, bookingController.getPaymentTracker);

module.exports = router;
