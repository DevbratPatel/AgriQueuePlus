const { getCollection, saveCollection } = require('../config/db');

// @route POST /api/auth/send-otp
exports.sendOTP = (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required' });
  }

  // Demo OTP simulation (fixed 1234 for demo)
  return res.json({
    success: true,
    message: 'OTP sent successfully to ' + phone,
    demoOtp: '1234'
  });
};

// @route POST /api/auth/login
exports.login = (req, res) => {
  const { phone, otp, role = 'farmer' } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  if (otp !== '1234') {
    return res.status(401).json({ success: false, message: 'Invalid OTP. Use demo OTP: 1234' });
  }

  const users = getCollection('users');
  let user = users.find(u => u.phone.includes(phone.slice(-10)));

  if (!user) {
    // Auto-create or default user for smooth onboarding
    user = {
      id: 'USR-' + Date.now(),
      name: role === 'farmer' ? 'Ramesh Kumar' : role === 'admin' ? 'District Officer' : 'Center Agent',
      phone: '+91 ' + phone.slice(0, 5) + ' ' + phone.slice(5),
      role: role,
      avatar: role === 'farmer' ? 'R' : role === 'admin' ? 'A' : 'D',
      aadhaar: '4521',
      state: 'Punjab'
    };
    users.push(user);
    saveCollection('users', users);
  }

  return res.json({
    success: true,
    message: 'Login successful',
    user
  });
};

// @route POST /api/auth/register
exports.register = (req, res) => {
  const { name, phone, aadhaar, state, role = 'farmer' } = req.body;
  if (!name || !phone || phone.length < 10) {
    return res.status(400).json({ success: false, message: 'Full name and valid mobile number are required' });
  }

  const users = getCollection('users');
  const existing = users.find(u => u.phone.includes(phone.slice(-10)));

  if (existing) {
    return res.json({
      success: true,
      message: 'Account already exists. Logged in successfully.',
      user: existing
    });
  }

  const newUser = {
    id: 'USR-' + Date.now(),
    name,
    phone: '+91 ' + phone.slice(0, 5) + ' ' + phone.slice(5),
    role,
    avatar: name[0].toUpperCase(),
    aadhaar: aadhaar || 'XXXX',
    state: state || 'Punjab'
  };

  users.push(newUser);
  saveCollection('users', users);

  return res.status(201).json({
    success: true,
    message: 'Registered successfully!',
    user: newUser
  });
};
