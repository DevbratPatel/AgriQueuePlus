const { getCollection, saveCollection, readDB, writeDB } = require('../config/db');
const { logAudit } = require('../services/auditService');

// @route POST /api/weighments
exports.recordWeighment = (req, res) => {
  const { bookingId, token, grossWeight, tareWeight, moisture, qualityGrade, notes } = req.body;

  const gWeight = parseFloat(grossWeight);
  const tWeight = parseFloat(tareWeight);
  const moist = parseFloat(moisture);

  if (isNaN(gWeight) || isNaN(tWeight) || isNaN(moist)) {
    return res.status(400).json({
      success: false,
      message: 'Valid Gross Weight (kg), Tare Weight (kg), and Moisture (%) values are required'
    });
  }

  if (gWeight <= 0) {
    return res.status(400).json({ success: false, message: 'Gross weight must be greater than 0 kg' });
  }

  if (tWeight < 0) {
    return res.status(400).json({ success: false, message: 'Tare weight cannot be negative' });
  }

  if (gWeight <= tWeight) {
    return res.status(400).json({ success: false, message: 'Gross weight must exceed Tare vehicle weight' });
  }

  const netWeightKg = Math.round((gWeight - tWeight) * 100) / 100;
  const netQuintals = Math.round((netWeightKg / 100) * 100) / 100; // 1 Quintal = 100 kg

  const db = readDB();
  const bookings = db.bookings || [];
  const booking = bookings.find(b =>
    (bookingId && b.id === bookingId) ||
    (token && b.token === token.toUpperCase().trim())
  );

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found for provided token/bookingId'
    });
  }

  // Verify that the farmer has already entered and cleared the gate
  const validEntryStatuses = ['GATE_CLEARED', 'Verified', 'WEIGHED', 'Confirmed'];
  if (!validEntryStatuses.includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot record weighment. Gate clearance status is '${booking.status}'. Farmer must clear entry gate first.`
    });
  }

  // Moisture threshold check
  // Standard ICAR / FCI MSP thresholds: Wheat = 14%, Paddy = 17%, Mustard = 9%
  const cropLower = (booking.crop || '').toLowerCase();
  let maxPermittedMoisture = 14.0;
  if (cropLower.includes('paddy') || cropLower.includes('rice')) maxPermittedMoisture = 17.0;
  if (cropLower.includes('mustard') || cropLower.includes('oilseed')) maxPermittedMoisture = 9.0;
  if (cropLower.includes('cotton')) maxPermittedMoisture = 12.0;

  const isAccepted = moist <= maxPermittedMoisture;
  const grade = isAccepted
    ? (qualityGrade || (moist <= 12 ? 'Grade-A (FAQ Prime)' : 'FAQ (Fair Average Quality)'))
    : 'Below FAQ (Excess Moisture)';
  const rejectionReason = isAccepted
    ? null
    : `Moisture reading ${moist}% exceeds the statutory threshold of ${maxPermittedMoisture}% for ${booking.crop.split(' ')[0]}`;

  // Retrieve applicable MSP rate
  const cropKey = booking.crop;
  const mspRate = (db.cropPriceMap && db.cropPriceMap[cropKey]) || booking.price || 2275;
  const finalProcurementAmount = isAccepted ? Math.round(netQuintals * mspRate) : 0;

  const weighments = db.weighments || [];
  const weighmentRecord = {
    id: `WGH-${Date.now()}`,
    bookingId: booking.id,
    token: booking.token,
    farmerName: booking.farmerName,
    crop: booking.crop,
    grossWeight: gWeight,
    tareWeight: tWeight,
    netWeightKg,
    netQuintals,
    moisture: moist,
    moistureThreshold: maxPermittedMoisture,
    qualityGrade: grade,
    status: isAccepted ? 'ACCEPTED' : 'REJECTED',
    rejectionReason,
    mspRate,
    finalAmount: finalProcurementAmount,
    notes: notes || '',
    weighedBy: (req.user && req.user.name) || 'Weighbridge Operator',
    timestamp: new Date().toISOString()
  };

  weighments.unshift(weighmentRecord);
  db.weighments = weighments;

  // Advance booking lifecycle and payment state machine
  if (isAccepted) {
    booking.status = 'QUALITY_ACCEPTED';
    booking.netWeightKg = netWeightKg;
    booking.actualQty = netQuintals;
    booking.actualAmount = finalProcurementAmount;
    booking.qualityGrade = grade;
    booking.weighmentId = weighmentRecord.id;
    booking.weighedAt = weighmentRecord.timestamp;
    booking.paymentStatus = 'PAYMENT_INITIATED';
    booking.paymentInitiatedAt = new Date().toISOString();
  } else {
    booking.status = 'QUALITY_REJECTED';
    booking.qualityGrade = grade;
    booking.rejectionReason = rejectionReason;
    booking.paymentStatus = 'PAYMENT_REJECTED';
  }

  // Update Agent queue item if present
  const queueItem = (db.agentQueue || []).find(q => q.token === booking.token);
  if (queueItem) {
    queueItem.status = isAccepted ? 'completed' : 'rejected';
    queueItem.actualQty = netQuintals;
    queueItem.amount = finalProcurementAmount;
  }

  // Increment tonnage metrics
  if (isAccepted) {
    if (!db.stats) db.stats = {};
    const currTonnage = parseFloat(db.stats.dailyTonnage) || 142;
    db.stats.dailyTonnage = Math.round((currTonnage + (netWeightKg / 1000)) * 10) / 10;
  }

  writeDB(db);

  logAudit({
    userId: (req.user && req.user.id) || 'AGENT',
    role: (req.user && req.user.role) || 'agent',
    action: isAccepted ? 'WEIGHMENT_ACCEPTED' : 'WEIGHMENT_REJECTED',
    entity: 'weighment',
    entityId: weighmentRecord.id,
    details: {
      bookingId: booking.id,
      token: booking.token,
      netQuintals,
      moisture: moist,
      amount: finalProcurementAmount
    },
    ip: req.ip
  });

  return res.status(201).json({
    success: true,
    message: isAccepted
      ? `Weighment accepted: ${netQuintals} Qtl @ ₹${mspRate.toLocaleString('en-IN')}/Qtl = ₹${finalProcurementAmount.toLocaleString('en-IN')}`
      : `Weighment rejected: ${rejectionReason}`,
    weighment: weighmentRecord,
    booking
  });
};

// @route GET /api/weighments/:bookingId
exports.getWeighment = (req, res) => {
  const { bookingId } = req.params;
  const weighments = getCollection('weighments') || [];
  const match = weighments.find(w => w.bookingId === bookingId || w.token === bookingId.toUpperCase());

  if (!match) {
    return res.status(404).json({
      success: false,
      message: 'No weighment slip found for this booking'
    });
  }

  return res.json({
    success: true,
    data: match
  });
};

// @route GET /api/weighments
exports.getAllWeighments = (req, res) => {
  const weighments = getCollection('weighments') || [];
  return res.json({
    success: true,
    data: weighments
  });
};
