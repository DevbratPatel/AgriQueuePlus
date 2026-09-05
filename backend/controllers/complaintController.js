const { getCollection, saveCollection } = require('../config/db');

// @route GET /api/complaints
exports.getComplaints = (req, res) => {
  const complaints = getCollection('complaints');
  return res.json({
    success: true,
    data: complaints
  });
};

// @route POST /api/complaints
exports.createComplaint = (req, res) => {
  const { cat, center, date, desc } = req.body;
  if (!cat || !desc) {
    return res.status(400).json({ success: false, message: 'Category and description are required' });
  }

  const complaints = getCollection('complaints');
  const nextId = 'CMP-' + String(complaints.length + 1).padStart(3, '0');

  const newComplaint = {
    id: nextId,
    cat,
    center: center || 'Mandi Road Procurement Center',
    date: date || new Date().toISOString().split('T')[0],
    desc,
    status: 'Under Review',
    createdAt: new Date().toISOString()
  };

  complaints.unshift(newComplaint);
  saveCollection('complaints', complaints);

  return res.status(201).json({
    success: true,
    message: 'Complaint submitted successfully!',
    complaint: newComplaint
  });
};

// @route PATCH /api/complaints/:id/resolve
exports.resolveComplaint = (req, res) => {
  const { id } = req.params;
  const complaints = getCollection('complaints');
  const complaint = complaints.find(c => c.id === id);

  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  complaint.status = 'Resolved';
  complaint.resolvedAt = new Date().toISOString();
  saveCollection('complaints', complaints);

  return res.json({
    success: true,
    message: `Complaint ${id} marked as resolved`,
    complaint
  });
};
