const { getCollection, readDB } = require('../config/db');

// @route GET /api/msp
exports.getAllMSP = (req, res) => {
  const db = readDB();
  return res.json({
    success: true,
    data: db.mspData || [],
    priceMap: db.cropPriceMap || {}
  });
};

// @route GET /api/msp/calculate
exports.calculateCropValue = (req, res) => {
  const { crop, qty } = req.query;
  if (!crop || !qty) {
    return res.status(400).json({ success: false, message: 'Crop and quantity parameters are required' });
  }

  const db = readDB();
  const price = db.cropPriceMap[crop] || 2275;
  const quantity = parseFloat(qty) || 0;
  const totalValue = quantity * price;

  return res.json({
    success: true,
    crop,
    qty: quantity,
    ratePerQuintal: price,
    totalEstimatedValue: totalValue,
    formattedValue: '₹' + totalValue.toLocaleString('en-IN')
  });
};
