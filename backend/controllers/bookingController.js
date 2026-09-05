const { getCollection, saveCollection, readDB } = require('../config/db');

// @route GET /api/bookings
exports.getBookings = (req, res) => {
  const bookings = getCollection('bookings');
  return res.json({
    success: true,
    data: bookings
  });
};

// @route POST /api/bookings
exports.createBooking = (req, res) => {
  const { crop, qty, vehicle, moisture, centerId, date, slot, farmerName } = req.body;

  if (!crop || !centerId && centerId !== 0 || !date || !slot) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields' });
  }

  const db = readDB();
  const center = db.centers.find(c => c.id === parseInt(centerId)) || db.centers[0];
  const price = db.cropPriceMap[crop] || 2275;

  // Generate next token (e.g. A-042)
  const bookings = db.bookings || [];
  const nextNumber = bookings.length + 42;
  const token = 'A-0' + nextNumber;

  const newBooking = {
    id: 'BK-' + Date.now(),
    token,
    farmerName: farmerName || 'Ramesh Kumar',
    crop,
    qty: qty || '25',
    vehicle: vehicle || 'Tractor-Trolley',
    moisture: moisture || 12,
    center: center.name,
    centerId: center.id,
    date,
    slot,
    status: 'Confirmed',
    price,
    qrPayload: `${token}|${farmerName || 'Ramesh Kumar'}|${crop}|${center.name}|${date}|${slot}`,
    createdAt: new Date().toISOString()
  };

  bookings.unshift(newBooking);
  saveCollection('bookings', bookings);

  // Also add to agent queue for live verification simulation
  const agentQueue = db.agentQueue || [];
  agentQueue.push({
    token,
    name: farmerName || 'Ramesh Kumar',
    crop: crop.split(' ')[0],
    qty: parseFloat(qty) || 25,
    status: 'pending'
  });
  saveCollection('agentQueue', agentQueue);

  return res.status(201).json({
    success: true,
    message: 'Slot booked successfully!',
    booking: newBooking
  });
};

// @route GET /api/bookings/:id/tracker
exports.getPaymentTracker = (req, res) => {
  const { id } = req.params;
  const bookings = getCollection('bookings');
  const booking = bookings.find(b => b.id === id || b.token === id);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  return res.json({
    success: true,
    token: booking.token,
    crop: booking.crop,
    milestones: [
      { step: 1, title: 'Booking Confirmed', status: 'done', timestamp: booking.createdAt },
      { step: 2, title: 'QR Verified at Center', status: booking.status === 'Verified' || booking.status === 'Completed' ? 'done' : 'pending', timestamp: null },
      { step: 3, title: 'Crop Weighed & Accepted', status: booking.status === 'Completed' ? 'done' : 'pending', timestamp: null },
      { step: 4, title: 'Payment Initiated (PFMS)', status: 'pending', timestamp: null },
      { step: 5, title: 'Amount Credited to Bank', status: 'pending', timestamp: null }
    ]
  });
};
