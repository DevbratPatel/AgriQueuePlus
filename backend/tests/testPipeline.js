// ===== AgriQueue+ End-to-End Procurement Pipeline Automated Test Suite =====

const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

// Helper to make JSON requests
async function req(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, opts);
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

let farmerToken = null;
let agentToken = null;
let adminToken = null;
let testBooking = null;

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🌾 STARTING AGRIQUEUE+ END-TO-END AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• Testing ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // === 1. AUTH & OTP WORKFLOW ===
  await test('1.1 Real Random OTP Dispatch & Console Log', async () => {
    const res = await req('/auth/send-otp', 'POST', { phone: '9876543210' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.devOtp, 'Should return devOtp for demonstration verification');
    assert.strictEqual(res.data.devOtp.length, 6, 'OTP must be authentic 6 digits');
  });

  await test('1.2 Reject Arbitrary / Fake OTP (1234 backdoor removal)', async () => {
    const res = await req('/auth/login', 'POST', { phone: '9876543210', otp: '1234', role: 'farmer' });
    assert.strictEqual(res.status, 401, 'Arbitrary 1234 OTP must be strictly rejected');
    assert.strictEqual(res.data.success, false);
  });

  await test('1.3 Accept Real Hashed OTP & Issue Signed JWT Session', async () => {
    // Generate fresh OTP
    const otpRes = await req('/auth/send-otp', 'POST', { phone: '9876543210' });
    const realOtp = otpRes.data.devOtp;

    // Login with real OTP
    const loginRes = await req('/auth/login', 'POST', { phone: '9876543210', otp: realOtp, role: 'farmer' });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.success, true);
    assert.ok(loginRes.data.token, 'Must issue signed JWT authentication token');
    assert.strictEqual(loginRes.data.user.role, 'farmer');
    farmerToken = loginRes.data.token;
  });

  await test('1.4 Acquire Agent & Admin Session Tokens', async () => {
    // Agent
    const agentOtpRes = await req('/auth/send-otp', 'POST', { phone: '7777766666' });
    const agentLogin = await req('/auth/login', 'POST', { phone: '7777766666', otp: agentOtpRes.data.devOtp, role: 'distributor' });
    assert.strictEqual(agentLogin.status, 200);
    agentToken = agentLogin.data.token;

    // Admin
    const adminOtpRes = await req('/auth/send-otp', 'POST', { phone: '9999988888' });
    const adminLogin = await req('/auth/login', 'POST', { phone: '9999988888', otp: adminOtpRes.data.devOtp, role: 'admin' });
    assert.strictEqual(adminLogin.status, 200);
    adminToken = adminLogin.data.token;
  });

  // === 2. ROLE-BASED AUTHORIZATION ===
  await test('2.1 Block Unauthorized Farmer from Weighbridge Actions', async () => {
    const res = await req('/weighments', 'POST', { bookingId: 'BK-1', grossWeight: 1000, tareWeight: 500, moisture: 12 }, farmerToken);
    assert.strictEqual(res.status, 403, 'Farmers must be forbidden from recording weighments');
  });

  await test('2.2 Block Unauthorized Farmer from Resolving Complaints', async () => {
    const res = await req('/complaints/CMP-001/resolve', 'PATCH', { status: 'RESOLVED' }, farmerToken);
    assert.strictEqual(res.status, 403, 'Farmers must be forbidden from resolving complaints');
  });

  await test('2.3 Allow Admin to Resolve Grievance Ticket', async () => {
    const res = await req('/complaints/CMP-001/resolve', 'PATCH', { status: 'RESOLVED', resolutionNote: 'Investigated and resolved' }, adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.complaint.status, 'RESOLVED');
  });

  // === 3. CONCURRENCY & SLOT CAPACITY PROTECTION ===
  await test('3.1 Successful Mandi Slot Booking with Cryptographic QR Token', async () => {
    const res = await req('/bookings', 'POST', {
      crop: 'Wheat (गेहूँ)',
      qty: 35,
      vehicle: 'Tractor-Trolley',
      moisture: 12.5,
      centerId: 0,
      date: '2026-09-20',
      slot: '10:00 AM',
      farmerName: 'Ramesh Kumar'
    }, farmerToken);

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.booking);
    assert.ok(res.data.booking.qrHash, 'Must store cryptographic SHA-256 hash');
    assert.ok(res.data.booking.qrPayload.startsWith('AGRIQ-V1:'), 'Must generate structured cryptographic QR payload');
    assert.strictEqual(res.data.booking.status, 'Confirmed');
    testBooking = res.data.booking;
  });

  // === 4. CRYPTOGRAPHIC SINGLE-USE QR & ANTI-REPLAY GATE CLEARANCE ===
  await test('4.1 Agent Verifies Authentic Cryptographic QR Pass', async () => {
    const res = await req(`/agent/verify/${testBooking.qrPayload}`, 'GET', null, agentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.token, testBooking.token);
  });

  await test('4.2 Agent Approves Gate Entry (Status -> GATE_CLEARED)', async () => {
    const res = await req('/agent/process-entry', 'POST', { token: testBooking.token }, agentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.booking.status, 'GATE_CLEARED');
    assert.strictEqual(res.data.booking.qrUsed, true);
  });

  await test('4.3 Anti-Replay: Reject Second Gate Entry Attempt with Same QR', async () => {
    const res = await req(`/agent/verify/${testBooking.token}`, 'GET', null, agentToken);
    assert.strictEqual(res.status, 400, 'Used QR code must be rejected');
    assert.strictEqual(res.data.code, 'ALREADY_USED');
  });

  // === 5. WEIGHBRIDGE, MOISTURE THRESHOLD & FINAL MSP CALCULATION ===
  await test('5.1 Weighbridge Gross & Tare Weighing + Automated MSP Computation', async () => {
    // Gross: 18,500 kg, Tare: 7,200 kg -> Net: 11,300 kg (113.00 Qtl)
    // MSP Rate: ₹2,275/Qtl -> Final Amount: 113.00 * 2275 = ₹2,57,075
    const res = await req('/weighments', 'POST', {
      bookingId: testBooking.id,
      token: testBooking.token,
      grossWeight: 18500,
      tareWeight: 7200,
      moisture: 11.8, // Permitted <= 14%
      qualityGrade: 'Grade-A (FAQ Prime)'
    }, agentToken);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.weighment.status, 'ACCEPTED');
    assert.strictEqual(res.data.weighment.netWeightKg, 11300);
    assert.strictEqual(res.data.weighment.netQuintals, 113);
    assert.strictEqual(res.data.weighment.finalAmount, 257075);
    assert.strictEqual(res.data.booking.status, 'QUALITY_ACCEPTED');
    assert.strictEqual(res.data.booking.paymentStatus, 'PAYMENT_INITIATED');
  });

  await test('5.2 Quality Rejection on High Moisture (>14% threshold)', async () => {
    // Book a second slot for testing moisture rejection
    const bookRes = await req('/bookings', 'POST', {
      crop: 'Wheat (गेहूँ)',
      qty: 20,
      centerId: 0,
      date: '2026-09-22',
      slot: '11:00 AM'
    }, farmerToken);

    const b2 = bookRes.data.booking;
    await req('/agent/process-entry', 'POST', { token: b2.token }, agentToken);

    // Enter excessive moisture 16.5%
    const weighRes = await req('/weighments', 'POST', {
      token: b2.token,
      grossWeight: 15000,
      tareWeight: 6000,
      moisture: 16.5 // Exceeds 14% threshold!
    }, agentToken);

    assert.strictEqual(weighRes.status, 201);
    assert.strictEqual(weighRes.data.weighment.status, 'REJECTED');
    assert.ok(weighRes.data.weighment.rejectionReason.includes('exceeds the statutory threshold'));
    assert.strictEqual(weighRes.data.booking.status, 'QUALITY_REJECTED');
    assert.strictEqual(weighRes.data.booking.paymentStatus, 'PAYMENT_REJECTED');
  });

  // === 6. PAYMENT TRACKER STATE MACHINE ===
  await test('6.1 Payment Tracker Displays 6-Stage Real Lifecycle & Timestamps', async () => {
    const res = await req(`/bookings/${testBooking.id}/tracker`, 'GET', null, farmerToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'QUALITY_ACCEPTED');
    assert.strictEqual(res.data.paymentStatus, 'PAYMENT_INITIATED');
    assert.strictEqual(res.data.actualAmount, 257075);
    assert.strictEqual(res.data.actualQty, 113);
    assert.strictEqual(res.data.milestones.length, 6, 'Must have full 6-stage milestone lifecycle');

    // Milestones 1, 2, 3, 4, 5 must be completed
    assert.strictEqual(res.data.milestones[0].status, 'done');
    assert.strictEqual(res.data.milestones[1].status, 'done');
    assert.strictEqual(res.data.milestones[2].status, 'done');
    assert.strictEqual(res.data.milestones[3].status, 'done');
    assert.strictEqual(res.data.milestones[4].status, 'done');
  });

  // === 7. ADMIN DYNAMIC ANALYTICS & AUDIT TRAIL ===
  await test('7.1 Admin Overview Aggregates Live Database Metrics', async () => {
    const res = await req('/admin/overview', 'GET', null, adminToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.dailyTonnage, 'Must report live daily tonnage');
    assert.ok(res.data.data.slotsProcessed >= 1, 'Must count processed slots');
  });

  await test('7.2 Audit Log Records Complete Immutable Security Trail', async () => {
    const res = await req('/admin/audit-logs', 'GET', null, adminToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.length > 0, 'Audit logs must contain recorded transactions');

    const actions = res.data.data.map(l => l.action);
    assert.ok(actions.includes('AUTH_LOGIN_SUCCESS'), 'Must record login audit event');
    assert.ok(actions.includes('SLOT_BOOKED'), 'Must record slot booking audit event');
    assert.ok(actions.includes('GATE_ENTRY_APPROVED'), 'Must record gate clearance audit event');
    assert.ok(actions.includes('WEIGHMENT_ACCEPTED'), 'Must record weighment audit event');
  });

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
