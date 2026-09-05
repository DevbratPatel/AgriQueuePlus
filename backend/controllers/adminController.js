const { getCollection, readDB } = require('../config/db');

// @route GET /api/admin/overview
exports.getOverview = (req, res) => {
  const db = readDB();
  const complaints = db.complaints || [];
  const pendingComplaints = complaints.filter(c => c.status !== 'Resolved').length;

  return res.json({
    success: true,
    data: {
      totalFarmersToday: db.stats && db.stats.totalFarmersToday || 1284,
      slotsProcessed: db.stats && db.stats.slotsProcessed || 876,
      mspPaidToday: db.stats && db.stats.mspPaidTodayCr || '₹2.3 Cr',
      pendingComplaints: pendingComplaints
    }
  });
};

// @route GET /api/admin/throughput
exports.getThroughput = (req, res) => {
  return res.json({
    success: true,
    data: {
      labels: ['Mandi Road', 'GT Road', 'Civil Lines', 'Sector 21', 'Khanna', 'Doraha'],
      datasets: [
        {
          label: 'Processed',
          data: [342, 218, 156, 89, 71, 0]
        },
        {
          label: 'Pending',
          data: [58, 32, 44, 11, 29, 85]
        }
      ]
    }
  });
};

// @route GET /api/admin/crop-stats
exports.getCropStats = (req, res) => {
  return res.json({
    success: true,
    data: [
      { crop: 'Wheat', qtyQtl: 15420, amount: '₹1.76 Cr', farmers: 423 },
      { crop: 'Paddy', qtyQtl: 8120, amount: '₹1.78 Cr', farmers: 214 },
      { crop: 'Mustard', qtyQtl: 3200, amount: '₹17.6 L', farmers: 89 },
      { crop: 'Gram', qtyQtl: 1560, amount: '₹8.2 L', farmers: 54 }
    ]
  });
};
