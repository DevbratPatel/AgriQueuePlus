const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'agriqueue-plus-secure-jwt-secret-key-2026';
const JWT_EXPIRES_IN = '24h';

// Generate signed JWT token
function generateToken(user) {
  const payload = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role || 'farmer',
    kisanId: user.kisanId || null,
    centerId: user.centerId || null
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token is missing.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token. Please log in again.'
    });
  }
}

// Role-based authorization middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userRole = (req.user.role || 'farmer').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    // 'distributor' and 'agent' are synonymous in this system
    const effectiveRoles = [userRole];
    if (userRole === 'distributor') effectiveRoles.push('agent');
    if (userRole === 'agent') effectiveRoles.push('distributor');

    const hasPermission = effectiveRoles.some(r => normalizedAllowed.includes(r));
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${userRole}' does not have permission to perform this action. Required: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

// Optional authentication helper
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Ignore invalid optional token
    }
  }
  next();
}

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  optionalAuth,
  JWT_SECRET
};
