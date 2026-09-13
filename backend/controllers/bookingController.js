const crypto = require('crypto');
const { getCollection, saveCollection, readDB, writeDB } = require('../config/db');
const { logAudit } = require('../services/auditService');

// @route GET /api/bookings
exports.getBookings = (req, res) => {
  const bookings = getCollection('bookings');

  // Role scoping: Farmers can only access their own bookings
  if (req.user && req.user.role === 'farmer') {
    const userPhoneClean = (req.user.phone || '').replace(/\D/g, '').slice(-10);
    const farmerBookings = bookings.filter(b => {
      const bPhoneClean = (b.farmerPhone || '').replace(/\D/g, '').slice(-10);
      return (b.farmerId && b.farmerId === req.user.id) ||
             (bPhoneClean && bPhoneClean === userPhoneClean) ||
             (b.farmerName && req.user.name && b.farmerName.toLowerCase() === req.user.name.toLowerCase());
    });
    return res.json({
      success: true,
      data: farmerBookings
    });
  }

  // Admins & Gate Agents can access full manifest
  return res.json({
    success: true,
    data: bookings
  });
};

// @route POST /api/bookings
exports.createBooking = (req, res) => {
  const { crop, qty, vehicle, moisture, centerId, date, slot, farmerName } = req.body;

  if (!crop || (centerId === undefined || centerId === null) || !date || !slot) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields (crop, centerId, date, slot)' });
  }

  const db = readDB();
  const centers = db.centers || [];
  const center = centers.find(c => c.id === parseInt(centerId)) || centers[0] || { id: 1, name: 'Ludhiana Mandi Hub' };
  const price = (db.cropPriceMap && db.cropPriceMap[crop]) || 2275;

  // === 1. Atomic Slot Capacity Check & Overbooking Prevention ===
  const slotCapacity = 20; // Maximum allowed bookings per center per time slot
  const bookings = db.bookings || [];

  // Count existing active bookings for the exact center, date, and slot
  const existingBookingsForSlot = bookings.filter(b =>
    b.centerId === center.id &&
    b.date === date &&
    b.slot === slot &&
    b.status !== 'Cancelled'
  );

  if (existingBookingsForSlot.length >= slotCapacity) {
    return res.status(409).json({
      success: false,
      message: `Selected slot is fully booked! (Capacity limit of ${slotCapacity} arrivals reached for ${slot}). Please choose another time slot or center.`,
      capacity: slotCapacity,
      booked: existingBookingsForSlot.length
    });
  }

  // === 2. Generate Cryptographic High-Entropy Secure Token ===
  const rawSecretToken = crypto.randomBytes(20).toString('hex');
  const qrHash = crypto.createHash('sha256').update(rawSecretToken).digest('hex');

  // Compute next sequential gate manifest ID (e.g. A-045)
  const agentQueue = db.agentQueue || [];
  const allTokens = [...bookings.map(b => b.token), ...agentQueue.map(q => q.token)];
  let maxTokenNum = 44;
  for (const t of allTokens) {
    if (typeof t === 'string') {
      const match = t.match(/A-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxTokenNum) {
          maxTokenNum = num;
        }
      }
    }
  }
  const manifestToken = `A-${String(maxTokenNum + 1).padStart(3, '0')}`;

  const bookingId = 'BK-' + Date.now();
  const expectedQty = parseFloat(qty) || 25;
  const estimatedAmount = Math.round(expectedQty * price);

  // Secure QR payload: contains structured scheme, bookingId, and cryptographically random secret token
  const qrPayload = `AGRIQ-V1:${bookingId}:${manifestToken}:${rawSecretToken}`;

  const newBooking = {
    id: bookingId,
    token: manifestToken,
    qrHash,
    qrUsed: false,
    farmerId: (req.user && req.user.id) || 'USR-FARMER',
    farmerName: farmerName || (req.user && req.user.name) || 'Ramesh Kumar',
    farmerPhone: (req.user && req.user.phone) || '+91 98765 43210',
    crop,
    qty: expectedQty,
    expectedQty,
    estimatedAmount,
    actualQty: null,
    actualAmount: null,
    vehicle: vehicle || 'Tractor-Trolley',
    declaredMoisture: parseFloat(moisture) || 12,
    center: center.name,
    centerId: center.id,
    date,
    slot,
    status: 'Confirmed', // Confirmed -> GATE_CLEARED -> QUALITY_ACCEPTED -> PAYMENT_INITIATED -> PAYMENT_PROCESSED
    paymentStatus: 'AWAITING_GATE_ARRIVAL',
    price,
    qrPayload,
    createdAt: new Date().toISOString(),
    gateClearedAt: null,
    weighedAt: null,
    paymentInitiatedAt: null
  };

  bookings.unshift(newBooking);
  db.bookings = bookings;

  // Synchronize with Gate Queue manifest
  agentQueue.push({
    token: manifestToken,
    bookingId: newBooking.id,
    name: newBooking.farmerName,
    crop: crop.split(' ')[0],
    qty: expectedQty,
    status: 'pending',
    date,
    slot
  });
  db.agentQueue = agentQueue;

  writeDB(db);

  logAudit({
    userId: newBooking.farmerId,
    role: 'farmer',
    action: 'SLOT_BOOKED',
    entity: 'booking',
    entityId: newBooking.id,
    details: {
      token: manifestToken,
      center: center.name,
      crop,
      qty: expectedQty,
      date,
      slot
    },
    ip: req.ip
  });

  return res.status(201).json({
    success: true,
    message: 'Mandi slot booked successfully!',
    booking: newBooking
  });
};

// @route GET /api/bookings/:id/tracker
exports.getPaymentTracker = (req, res) => {
  const { id } = req.params;
  const bookings = getCollection('bookings');
  const booking = bookings.find(b => b.id === id || b.token === id.toUpperCase());

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  const weighments = getCollection('weighments') || [];
  const weighment = weighments.find(w => w.bookingId === booking.id || w.token === booking.token);

  // Compute actual state machine progression
  const isGateCleared = booking.status !== 'Confirmed' || Boolean(booking.gateClearedAt);
  const isWeighed = Boolean(weighment || booking.weighedAt);
  const isQualityAccepted = booking.status === 'QUALITY_ACCEPTED' || (weighment && weighment.status === 'ACCEPTED');
  const isQualityRejected = booking.status === 'QUALITY_REJECTED' || (weighment && weighment.status === 'REJECTED');
  const isPaymentInitiated = isQualityAccepted && (booking.paymentStatus === 'PAYMENT_INITIATED' || booking.paymentStatus === 'PAYMENT_PROCESSED');
  const isPaymentCompleted = booking.paymentStatus === 'PAYMENT_PROCESSED';

  const milestones = [
    {
      step: 1,
      title: 'Slot Booking Confirmed',
      desc: `Registered for ${booking.center} (${booking.date}, ${booking.slot})`,
      status: 'done',
      timestamp: booking.createdAt
    },
    {
      step: 2,
      title: 'Gate Pass QR Verified',
      desc: isGateCleared ? `Gate entry authorized at ${booking.center}` : 'Present QR code at center gate scanner',
      status: isGateCleared ? 'done' : 'current',
      timestamp: booking.gateClearedAt
    },
    {
      step: 3,
      title: 'Weighbridge Gross & Tare Weighed',
      desc: isWeighed
        ? `Gross: ${weighment.grossWeight} kg, Tare: ${weighment.tareWeight} kg &rarr; Net: ${weighment.netWeightKg} kg (${weighment.netQuintals} Qtl)`
        : 'Inbound truck queuing for electronic weighbridge',
      status: isWeighed ? 'done' : isGateCleared ? 'current' : 'pending',
      timestamp: booking.weighedAt
    },
    {
      step: 4,
      title: isQualityRejected ? 'Quality Inspection: Rejected' : 'Quality & Moisture Compliance (FAQ)',
      desc: isQualityRejected
        ? `Moisture ${weighment ? weighment.moisture : 15}% exceeds permitted limit`
        : isQualityAccepted
        ? `Moisture: ${weighment ? weighment.moisture : 12}% (Grade: ${weighment ? weighment.qualityGrade : 'Grade-A FAQ'})`
        : 'Awaiting grain moisture meter lab analysis',
      status: isQualityRejected ? 'failed' : isQualityAccepted ? 'done' : isWeighed ? 'current' : 'pending',
      timestamp: booking.weighedAt
    },
    {
      step: 5,
      title: 'PFMS Direct Benefit Transfer Initiated',
      desc: isPaymentInitiated
        ? `Disbursement advice of ₹${(booking.actualAmount || 0).toLocaleString('en-IN')} routed to ${booking.farmerName}'s DBT bank account`
        : 'Triggered automatically after grain acceptance',
      status: isPaymentInitiated ? 'done' : isQualityAccepted ? 'current' : 'pending',
      timestamp: booking.paymentInitiatedAt
    },
    {
      step: 6,
      title: 'Procurement Amount Credited',
      desc: isPaymentCompleted ? 'Amount credited via RBI NEFT/PFMS' : 'Expected within 48-72 hours into verified account',
      status: isPaymentCompleted ? 'done' : 'pending',
      timestamp: isPaymentCompleted ? booking.paymentCompletedAt : null
    }
  ];

  return res.json({
    success: true,
    token: booking.token,
    crop: booking.crop,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    estimatedAmount: booking.estimatedAmount,
    actualAmount: booking.actualAmount,
    actualQty: booking.actualQty,
    milestones
  });
};
