const { getCollection, readDB } = require('../config/db');

exports.getAllMSP = (req, res) => {
  const db = readDB();
  return res.json({
    success: true,
    data: db.mspData || [],
    priceMap: db.cropPriceMap || {}
  });
};

exports.calculateCropValue = (req, res) => {
  const { crop, qty } = req.query;
  if (!crop || !qty) {
    return res.status(400).json({ success: false, message: 'Crop and quantity parameters are required' });
  }

  const db = readDB();
  const priceMap = db.cropPriceMap || {};
  let price = priceMap[crop];

  if (!price) {
    const cleanCrop = crop.toLowerCase().trim();
    for (const [k, v] of Object.entries(priceMap)) {
      if (k.toLowerCase().includes(cleanCrop) || cleanCrop.includes(k.toLowerCase().split(' ')[0])) {
        price = v;
        break;
      }
    }
  }
  price = price || 2275;

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
