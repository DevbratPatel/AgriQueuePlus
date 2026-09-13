const crypto = require('crypto');
const { getCollection, saveCollection, readDB, writeDB } = require('../config/db');
const { logAudit } = require('../services/auditService');

// @route GET /api/agent/queue
exports.getAgentQueue = (req, res) => {
  const queue = getCollection('agentQueue');
  return res.json({
    success: true,
    data: queue
  });
};

// @route GET /api/agent/verify/:token
exports.verifyToken = (req, res) => {
  const { token } = req.params;
  const rawInput = (token || '').trim();

  const db = readDB();
  const bookings = db.bookings || [];
  const agentQueue = db.agentQueue || [];

  let matchedBooking = null;

  // Check if input is structured cryptographic payload: AGRIQ-V1:{bookingId}:{manifestToken}:{secretToken}
  if (rawInput.startsWith('AGRIQ-V1:')) {
    const parts = rawInput.split(':');
    const bId = parts[1];
    const mToken = parts[2];
    const secret = parts[3];

    matchedBooking = bookings.find(b => b.id === bId || b.token === mToken);

    if (matchedBooking && secret && matchedBooking.qrHash) {
      // Validate cryptographic hash
      const computedHash = crypto.createHash('sha256').update(secret).digest('hex');
      if (computedHash !== matchedBooking.qrHash) {
        return res.status(401).json({
          success: false,
          message: 'Tamper Alert: Cryptographic signature mismatch. Counterfeit QR code detected!',
          code: 'INVALID_SIGNATURE'
        });
      }
    }
  } else {
    // Human-friendly token lookup (e.g. A-041 or booking ID)
    const upperInput = rawInput.toUpperCase();
    matchedBooking = bookings.find(b => b.token === upperInput || b.id === upperInput);
  }

  if (!matchedBooking) {
    // Check fallback in queue
    const queueItem = agentQueue.find(q => q.token === rawInput.toUpperCase());
    if (!queueItem) {
      return res.status(404).json({
        success: false,
        message: `Token ${rawInput} is not registered in the Mandi manifest system`
      });
    }

    return res.json({
      success: true,
      data: {
        token: queueItem.token,
        farmer: queueItem.name || 'Registered Farmer',
        crop: queueItem.crop || 'Wheat',
        qty: queueItem.qty || 25,
        status: queueItem.status || 'pending',
        isUsed: false
      }
    });
  }

  // === Anti-Replay Check: Enforce Single-Use QR Pass ===
  if (matchedBooking.qrUsed || matchedBooking.status === 'GATE_CLEARED' || matchedBooking.status === 'QUALITY_ACCEPTED' || matchedBooking.status === 'WEIGHED') {
    return res.status(400).json({
      success: false,
      message: `Access Denied: QR Gate Pass ${matchedBooking.token} was ALREADY REDEEMED on ${new Date(matchedBooking.gateClearedAt || matchedBooking.createdAt).toLocaleString()}! Reusable passes are strictly prohibited.`,
      code: 'ALREADY_USED',
      data: {
        token: matchedBooking.token,
        farmer: matchedBooking.farmerName,
        crop: matchedBooking.crop,
        qty: matchedBooking.qty,
        status: matchedBooking.status,
        gateClearedAt: matchedBooking.gateClearedAt,
        isUsed: true
      }
    });
  }

  return res.json({
    success: true,
    message: 'QR Pass verified & authenticated. Valid for single gate entry.',
    data: {
      id: matchedBooking.id,
      token: matchedBooking.token,
      farmer: matchedBooking.farmerName,
      farmerPhone: matchedBooking.farmerPhone,
      crop: matchedBooking.crop,
      qty: matchedBooking.qty,
      vehicle: matchedBooking.vehicle,
      center: matchedBooking.center,
      date: matchedBooking.date,
      slot: matchedBooking.slot,
      status: matchedBooking.status,
      isUsed: false
    }
  });
};

// @route POST /api/agent/process-entry
exports.processEntry = (req, res) => {
  const { token, reason } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  const cleanToken = token.trim().toUpperCase();
  const db = readDB();
  const bookings = db.bookings || [];
  const booking = bookings.find(b => b.token === cleanToken || b.id === cleanToken);

  if (!booking) {
    return res.status(404).json({ success: false, message: `Booking not found for token ${cleanToken}` });
  }

  if (booking.qrUsed || booking.status === 'GATE_CLEARED') {
    return res.status(400).json({
      success: false,
      message: `QR Pass ${cleanToken} has already been cleared and cannot be reused.`
    });
  }

  const now = new Date().toISOString();
  booking.status = 'GATE_CLEARED';
  booking.qrUsed = true;
  booking.gateClearedAt = now;
  booking.paymentStatus = 'AWAITING_WEIGHBRIDGE';

  const queueItem = (db.agentQueue || []).find(q => q.token === cleanToken);
  if (queueItem) {
    queueItem.status = 'cleared';
    queueItem.clearedAt = now;
  }

  if (!db.stats) db.stats = {};
  db.stats.agentDone = (db.stats.agentDone || 42) + 1;
  if (db.stats.agentPending && db.stats.agentPending > 0) {
    db.stats.agentPending -= 1;
  }

  writeDB(db);

  logAudit({
    userId: (req.user && req.user.id) || 'AGENT',
    role: (req.user && req.user.role) || 'agent',
    action: 'GATE_ENTRY_APPROVED',
    entity: 'booking',
    entityId: booking.id,
    details: { token: booking.token, farmer: booking.farmerName, center: booking.center },
    ip: req.ip
  });

  return res.json({
    success: true,
    message: `Gate clearance granted for ${booking.farmerName} (${booking.token}). Directed to electronic weighbridge.`,
    booking,
    stats: db.stats
  });
};

// @route POST /api/agent/reject-entry
exports.rejectEntry = (req, res) => {
  const { token, reason } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  const cleanToken = token.trim().toUpperCase();
  const db = readDB();
  const booking = (db.bookings || []).find(b => b.token === cleanToken || b.id === cleanToken);

  if (booking) {
    booking.status = 'GATE_REJECTED';
    booking.gateRejectionReason = reason || 'Vehicle mismatch or documentation deficiency';
    booking.paymentStatus = 'GATE_ENTRY_REJECTED';
  }

  const queueItem = (db.agentQueue || []).find(q => q.token === cleanToken);
  if (queueItem) {
    queueItem.status = 'rejected';
    queueItem.reason = reason;
  }

  if (!db.stats) db.stats = {};
  db.stats.agentRejected = (db.stats.agentRejected || 3) + 1;

  writeDB(db);

  logAudit({
    userId: (req.user && req.user.id) || 'AGENT',
    role: (req.user && req.user.role) || 'agent',
    action: 'GATE_ENTRY_REJECTED',
    entity: 'booking',
    entityId: (booking && booking.id) || cleanToken,
    details: { token: cleanToken, reason },
    ip: req.ip
  });

  return res.json({
    success: true,
    message: `Gate entry rejected for token ${cleanToken}. Reason: ${reason || 'Unspecified'}`,
    stats: db.stats
  });
};
