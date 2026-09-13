const { getCollection, saveCollection } = require('../config/db');
const { logAudit } = require('../services/auditService');

// @route GET /api/complaints
exports.getComplaints = (req, res) => {
  const complaints = getCollection('complaints') || [];

  // Scoping: Farmers can only see their own complaints
  if (req.user && req.user.role === 'farmer') {
    const userPhoneClean = (req.user.phone || '').replace(/\D/g, '').slice(-10);
    const farmerComplaints = complaints.filter(c => {
      const cPhoneClean = (c.farmerPhone || '').replace(/\D/g, '').slice(-10);
      return (c.farmerId && c.farmerId === req.user.id) ||
             (cPhoneClean && cPhoneClean === userPhoneClean) ||
             (c.farmerName && req.user.name && c.farmerName.toLowerCase() === req.user.name.toLowerCase());
    });
    return res.json({
      success: true,
      data: farmerComplaints
    });
  }

  // Admins & Agents can see all grievances
  return res.json({
    success: true,
    data: complaints
  });
};

// @route POST /api/complaints
exports.createComplaint = (req, res) => {
  const { cat, center, date, desc, bookingId, evidence } = req.body;
  if (!cat || !desc) {
    return res.status(400).json({ success: false, message: 'Category and description are required' });
  }

  const complaints = getCollection('complaints') || [];
  const nextId = 'CMP-' + String(complaints.length + 1).padStart(3, '0');

  const newComplaint = {
    id: nextId,
    farmerId: (req.user && req.user.id) || 'USR-FARMER',
    farmerName: (req.user && req.user.name) || 'Ramesh Kumar',
    farmerPhone: (req.user && req.user.phone) || '+91 98765 43210',
    bookingId: bookingId || null,
    cat,
    center: center || 'Mandi Road Procurement Center',
    date: date || new Date().toISOString().split('T')[0],
    desc: desc.trim(),
    evidence: evidence || null,
    status: 'OPEN', // OPEN -> IN_PROGRESS -> RESOLVED
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null
  };

  complaints.unshift(newComplaint);
  saveCollection('complaints', complaints);

  logAudit({
    userId: newComplaint.farmerId,
    role: 'farmer',
    action: 'COMPLAINT_SUBMITTED',
    entity: 'complaint',
    entityId: newComplaint.id,
    details: { cat, center: newComplaint.center },
    ip: req.ip
  });

  return res.status(201).json({
    success: true,
    message: `Mandi grievance ticket #${newComplaint.id} submitted successfully!`,
    complaint: newComplaint
  });
};

// @route PATCH /api/complaints/:id/resolve
exports.resolveComplaint = (req, res) => {
  const { id } = req.params;
  const { status = 'RESOLVED', resolutionNote } = req.body;

  // Enforce role authorization: Only Admins/Officers can resolve complaints
  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only authorized District Procurement Officers can resolve grievances.'
    });
  }

  const complaints = getCollection('complaints') || [];
  const complaint = complaints.find(c => c.id === id);

  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  const targetStatus = status.toUpperCase() === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'RESOLVED';
  complaint.status = targetStatus;
  complaint.resolvedAt = targetStatus === 'RESOLVED' ? new Date().toISOString() : null;
  complaint.resolvedBy = (req.user && req.user.name) || 'District Grievance Officer';
  complaint.resolutionNote = resolutionNote || (targetStatus === 'RESOLVED' ? 'Issue investigated with center weighbridge log and resolved.' : 'Inquiry initiated with Mandi superintendent.');

  saveCollection('complaints', complaints);

  logAudit({
    userId: (req.user && req.user.id) || 'ADMIN',
    role: 'admin',
    action: targetStatus === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : 'COMPLAINT_UPDATED',
    entity: 'complaint',
    entityId: complaint.id,
    details: { status: targetStatus, resolutionNote: complaint.resolutionNote },
    ip: req.ip
  });

  return res.json({
    success: true,
    message: `Grievance ticket ${id} updated to '${targetStatus}'`,
    complaint
  });
};
