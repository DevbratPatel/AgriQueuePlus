// ===== AgriQueue+ | Frontend API Service Client =====

const API_BASE_URL = 'http://localhost:5000/api';

const api = {
  // Generic Fetch Helper
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
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
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, role })
    });
  },

  async register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
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
    return this.request(`/bookings/${id}/tracker`);
  },

  // Complaints
  async getComplaints() {
    return this.request('/complaints');
  },

  async createComplaint(complaintData) {
    return this.request('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaintData)
    });
  },

  async resolveComplaint(id) {
    return this.request(`/complaints/${id}/resolve`, {
      method: 'PATCH'
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

  // Admin Analytics
  async getAdminOverview() {
    return this.request('/admin/overview');
  },

  async getAdminThroughput() {
    return this.request('/admin/throughput');
  },

  async getAdminCropStats() {
    return this.request('/admin/crop-stats');
  }
};
