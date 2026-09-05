const { getCollection } = require('../config/db');

// @route GET /api/centers
exports.getAllCenters = (req, res) => {
  const centers = getCollection('centers');
  return res.json({
    success: true,
    data: centers
  });
};

// @route GET /api/centers/:id/slots
exports.getCenterSlots = (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  const centers = getCollection('centers');
  const center = centers.find(c => c.id === parseInt(id));

  if (!center) {
    return res.status(404).json({ success: false, message: 'Procurement center not found' });
  }

  const timeSlots = getCollection('timeSlots');

  return res.json({
    success: true,
    centerId: center.id,
    centerName: center.name,
    date: date || new Date().toISOString().split('T')[0],
    slots: timeSlots
  });
};
