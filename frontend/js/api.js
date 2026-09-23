// ===== AgriQueue+ | Frontend API Service Client =====

const API_BASE_URL = 'http://localhost:5000/api';

const api = {
  // Token management
  getToken() {
    try {
      return localStorage.getItem('agri_jwt_token') || null;
    } catch (e) {
      return null;
    }
  },

  setToken(token) {
    try {
      if (token) {
        localStorage.setItem('agri_jwt_token', token);
      } else {
        localStorage.removeItem('agri_jwt_token');
      }
    } catch (e) {}
  },

  clearToken() {
    this.setToken(null);
  },

  // Generic Fetch Helper with JWT Authorization Injection
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
      return await response.json();
    } catch (err) {
      console.warn(`Backend API unreachable at ${endpoint}. Using local fallback.`, err);
      return null; // Graceful fallback to client-side data
    }
  },

  // Auth APIs
  async sendOTP(phone) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  },

  async login(phone, otp, role) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, role })
    });
    if (res && res.success && res.token) {
      this.setToken(res.token);
    }
    return res;
  },

  async register(data) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res && res.success && res.token) {
      this.setToken(res.token);
    }
    return res;
  },

  async firebaseSync(data) {
    const res = await this.request('/auth/firebase-sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res && res.success && res.token) {
      this.setToken(res.token);
    }
    return res;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  // MSP Rates
  async getMSP() {
    return this.request('/msp');
  },

  async calculateCrop(crop, qty) {
    return this.request(`/msp/calculate?crop=${encodeURIComponent(crop)}&qty=${qty}`);
  },

  // Centers & Slots
  async getCenters() {
    return this.request('/centers');
  },

  async getCenterSlots(centerId, date) {
    return this.request(`/centers/${centerId}/slots?date=${date}`);
  },

  // Bookings
  async getBookings() {
    return this.request('/bookings');
  },

  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  },

  async getPaymentTracker(id) {
    return this.request(`/bookings/${encodeURIComponent(id)}/tracker`);
  },

  // Weighbridge & Quality Control
  async recordWeighment(weighmentData) {
    return this.request('/weighments', {
      method: 'POST',
      body: JSON.stringify(weighmentData)
    });
  },

  async getWeighment(bookingId) {
    return this.request(`/weighments/${encodeURIComponent(bookingId)}`);
  },

  async getAllWeighments() {
    return this.request('/weighments');
  },

  // Complaints & Grievances
  async getComplaints() {
    return this.request('/complaints');
  },

  async createComplaint(complaintData) {
    return this.request('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaintData)
    });
  },

  async resolveComplaint(id, status = 'RESOLVED', resolutionNote = '') {
    return this.request(`/complaints/${encodeURIComponent(id)}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNote })
    });
  },

  // Gate Agent
  async getAgentQueue() {
    return this.request('/agent/queue');
  },

  async verifyToken(token) {
    return this.request(`/agent/verify/${encodeURIComponent(token)}`);
  },

  async processEntry(token) {
    return this.request('/agent/process-entry', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async rejectEntry(token, reason) {
    return this.request('/agent/reject-entry', {
      method: 'POST',
      body: JSON.stringify({ token, reason })
    });
  },

  // Admin Analytics & Audit Logs
  async getAdminOverview() {
    return this.request('/admin/overview');
  },

  async getAdminThroughput() {
    return this.request('/admin/throughput');
  },

  async getAdminCropStats() {
    return this.request('/admin/crop-stats');
  },

  async getAuditLogs() {
    return this.request('/admin/audit-logs');
  }
};
