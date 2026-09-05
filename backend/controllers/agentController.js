const { getCollection, saveCollection, readDB, writeDB } = require('../config/db');

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
  const cleanToken = token.trim().toUpperCase();

  const db = readDB();
  const foundInQueue = (db.agentQueue || []).find(q => q.token === cleanToken);
  const foundInBookings = (db.bookings || []).find(b => b.token === cleanToken);

  if (!foundInQueue && !foundInBookings) {
    return res.status(404).json({
      success: false,
      message: `Token ${cleanToken} not found in system`
    });
  }

  const result = {
    token: cleanToken,
    farmer: (foundInBookings && foundInBookings.farmerName) || (foundInQueue && foundInQueue.name) || 'Farmer',
    crop: (foundInBookings && foundInBookings.crop) || (foundInQueue && foundInQueue.crop) || 'Wheat',
    qty: (foundInBookings && foundInBookings.qty) || (foundInQueue && foundInQueue.qty) || 25,
    status: (foundInQueue && foundInQueue.status) || 'pending'
  };

  return res.json({
    success: true,
    data: result
  });
};

// @route POST /api/agent/process-entry
exports.processEntry = (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  const db = readDB();
  const queueItem = (db.agentQueue || []).find(q => q.token === token.toUpperCase());
  if (queueItem) {
    queueItem.status = 'done';
  }

  // Update booking status
  const booking = (db.bookings || []).find(b => b.token === token.toUpperCase());
  if (booking) {
    booking.status = 'Verified';
  }

  // Update stats
  if (!db.stats) db.stats = {};
  db.stats.agentDone = (db.stats.agentDone || 42) + 1;
  if (db.stats.agentPending && db.stats.agentPending > 0) {
    db.stats.agentPending -= 1;
  }

  writeDB(db);

  return res.json({
    success: true,
    message: `Entry allowed for token ${token}. Farmer may proceed to weighing.`,
    stats: db.stats
  });
};

// @route POST /api/agent/reject-entry
exports.rejectEntry = (req, res) => {
  const { token, reason } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  const db = readDB();
  const queueItem = (db.agentQueue || []).find(q => q.token === token.toUpperCase());
  if (queueItem) {
    queueItem.status = 'rejected';
  }

  if (!db.stats) db.stats = {};
  db.stats.agentRejected = (db.stats.agentRejected || 3) + 1;

  writeDB(db);

  return res.json({
    success: true,
    message: `Entry rejected for token ${token}.`,
    reason: reason || 'Moisture or documentation mismatch',
    stats: db.stats
  });
};
