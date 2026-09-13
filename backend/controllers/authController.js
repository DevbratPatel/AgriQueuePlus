const crypto = require('crypto');
const { getCollection, saveCollection } = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// In-memory verification cache for active mobile sessions: cleanPhone -> { hash, expiresAt, salt }
const otpStore = new Map();

// Helper to hash OTP with salt
function hashOtp(otp, salt) {
  return crypto.createHash('sha256').update(otp + ':' + salt).digest('hex');
}

// @route POST /api/auth/send-otp
exports.sendOTP = (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required' });
  }

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  // Generate authentic, non-deterministic 6-digit verification code
  const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
  const salt = crypto.randomBytes(8).toString('hex');
  const hashedOtp = hashOtp(rawOtp, salt);

  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  otpStore.set(cleanPhone, {
    hash: hashedOtp,
    salt,
    expiresAt
  });

  console.log(`\n======================================================`);
  console.log(`🌾 [AUTH GATEWAY] OTP Dispatched for +91 ${cleanPhone}: [ ${rawOtp} ]`);
  console.log(`⏳ Validity: 5 Minutes (Expires: ${new Date(expiresAt).toLocaleTimeString()})`);
  console.log(`======================================================\n`);

  logAudit({
    userId: cleanPhone,
    role: 'anonymous',
    action: 'OTP_REQUESTED',
    entity: 'auth',
    entityId: cleanPhone,
    details: { expiresAt: new Date(expiresAt).toISOString() },
    ip: req.ip
  });

  return res.json({
    success: true,
    message: `Verification code sent to +91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`,
    devOtp: rawOtp // Exposed for local dev / academic demo convenience
  });
};

// @route POST /api/auth/login
exports.login = (req, res) => {
  const { phone, otp, role = 'farmer' } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });
  }

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const session = otpStore.get(cleanPhone);

  if (!session) {
    return res.status(400).json({
      success: false,
      message: 'No OTP session found for this number. Please request a new verification code.'
    });
  }

  if (Date.now() > session.expiresAt) {
    otpStore.delete(cleanPhone);
    return res.status(401).json({
      success: false,
      message: 'Verification code has expired. Please request a new code.'
    });
  }

  const inputHash = hashOtp(String(otp).trim(), session.salt);
  if (inputHash !== session.hash) {
    return res.status(401).json({
      success: false,
      message: 'Invalid verification code. Please enter the exact code generated for your session.'
    });
  }

  // Clear redeemed OTP to prevent replay attacks
  otpStore.delete(cleanPhone);

  const users = getCollection('users');
  let user = users.find(u => u.phone.replace(/\D/g, '').includes(cleanPhone));

  if (!user) {
    // Seed new profile for authenticated phone
    const isFarmer = role === 'farmer';
    const isAdmin = role === 'admin';
    user = {
      id: 'USR-' + Date.now(),
      name: isFarmer ? 'Ramesh Kumar' : isAdmin ? 'District Procurement Officer' : 'Ludhiana Mandi Agent',
      phone: '+91 ' + cleanPhone.slice(0, 5) + ' ' + cleanPhone.slice(5),
      role: role,
      avatar: isFarmer ? 'R' : isAdmin ? 'A' : 'D',
      kisanId: isFarmer ? `KSN-2026-${Math.floor(1000 + Math.random() * 9000)}` : null,
      aadhaarMasked: 'XXXX-XXXX-4521',
      state: 'Punjab',
      bankName: 'Punjab National Bank',
      bankAccount: 'XXXXXXXX4521',
      bankIfsc: 'PUNB0001234',
      landAcreage: '4.5 Acres',
      khasra: '214/2, 215/1',
      village: 'Raipur Kalan, Ludhiana',
      crops: 'Wheat, Paddy, Mustard',
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveCollection('users', users);
  } else {
    // Ensure role matches requested role
    if (role && user.role !== role) {
      user.role = role;
      saveCollection('users', users);
    }
  }

  // Generate cryptographically signed JWT token
  const token = generateToken(user);

  logAudit({
    userId: user.id,
    role: user.role,
    action: 'AUTH_LOGIN_SUCCESS',
    entity: 'user',
    entityId: user.id,
    details: { phone: cleanPhone, role: user.role },
    ip: req.ip
  });

  return res.json({
    success: true,
    message: 'Authentication successful',
    token,
    user
  });
};

// @route POST /api/auth/register
exports.register = (req, res) => {
  const { name, phone, aadhaar, state, role = 'farmer' } = req.body;
  if (!name || !phone || phone.length < 10) {
    return res.status(400).json({ success: false, message: 'Full name and valid mobile number are required' });
  }

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const users = getCollection('users');
  const existing = users.find(u => u.phone.replace(/\D/g, '').includes(cleanPhone));

  if (existing) {
    const token = generateToken(existing);
    return res.json({
      success: true,
      message: 'Account already registered. Logged in successfully.',
      token,
      user: existing
    });
  }

  const isFarmer = role === 'farmer';
  const newUser = {
    id: 'USR-' + Date.now(),
    name: name.trim(),
    phone: '+91 ' + cleanPhone.slice(0, 5) + ' ' + cleanPhone.slice(5),
    role: role,
    avatar: name.trim().charAt(0).toUpperCase() || 'R',
    kisanId: isFarmer ? `KSN-2026-${Math.floor(1000 + Math.random() * 9000)}` : null,
    aadhaarMasked: aadhaar ? `XXXX-XXXX-${aadhaar.slice(-4)}` : 'XXXX-XXXX-4521',
    state: state || 'Punjab',
    bankName: 'Punjab National Bank',
    bankAccount: 'XXXXXXXX4521',
    bankIfsc: 'PUNB0001234',
    landAcreage: '4.5 Acres',
    khasra: '214/2, 215/1',
    village: 'Raipur Kalan, Ludhiana',
    crops: 'Wheat, Paddy, Mustard',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveCollection('users', users);

  const token = generateToken(newUser);

  logAudit({
    userId: newUser.id,
    role: newUser.role,
    action: 'AUTH_REGISTER_SUCCESS',
    entity: 'user',
    entityId: newUser.id,
    details: { phone: cleanPhone, name: newUser.name, role: newUser.role },
    ip: req.ip
  });

  return res.status(201).json({
    success: true,
    message: 'Registered successfully',
    token,
    user: newUser
  });
};

// @route GET /api/auth/me
exports.getMe = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const users = getCollection('users');
  const user = users.find(u => u.id === req.user.id || u.phone.replace(/\D/g, '').includes(req.user.phone.replace(/\D/g, '')));

  if (!user) {
    return res.status(404).json({ success: false, message: 'User profile not found' });
  }

  return res.json({
    success: true,
    user
  });
};
