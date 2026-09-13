const { getCollection, saveCollection } = require('../config/db');

function logAudit({ userId = 'SYSTEM', role = 'SYSTEM', action, entity, entityId, details = {}, ip = '127.0.0.1' }) {
  try {
    const logs = getCollection('audit_logs') || [];
    const entry = {
      id: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userId,
      role,
      action,
      entity,
      entityId,
      details,
      ip,
      timestamp: new Date().toISOString()
    };
    logs.unshift(entry);
    // Keep last 1000 logs in storage
    if (logs.length > 1000) logs.pop();
    saveCollection('audit_logs', logs);
    return entry;
  } catch (err) {
    console.error('Audit logging failure:', err.message);
    return null;
  }
}

function getAuditLogs(filter = {}) {
  const logs = getCollection('audit_logs') || [];
  if (filter.entityId) {
    return logs.filter(l => l.entityId === filter.entityId);
  }
  if (filter.userId) {
    return logs.filter(l => l.userId === filter.userId);
  }
  if (filter.role) {
    return logs.filter(l => l.role === filter.role);
  }
  return logs;
}

module.exports = {
  logAudit,
  getAuditLogs
};
