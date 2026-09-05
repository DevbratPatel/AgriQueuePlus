const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.get('/', bookingController.getBookings);
router.post('/', bookingController.createBooking);
router.get('/:id/tracker', bookingController.getPaymentTracker);

module.exports = router;
