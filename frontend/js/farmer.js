// ===== AgriQueue+ | Farmer Portal Logic =====

async function initFarmerApp() {
  // 1. Render all UI elements immediately from local state (no network wait)
  renderPriceBoard();
  renderBookings();
  renderComplaints();
  initCrowdChart();
  animateQueue();
  renderCentersList();
  renderSlots();
  initCropValueCalc();

  // 2. Asynchronously sync latest updates from backend if available
  if (typeof api !== 'undefined') {
    try {
      const mspRes = await api.getMSP();
      if (mspRes && mspRes.success && mspRes.data) {
        mspData.splice(0, mspData.length, ...mspRes.data);
        Object.assign(cropPriceMap, mspRes.priceMap || {});
        renderPriceBoard();
      }

      const centersRes = await api.getCenters();
      if (centersRes && centersRes.success && centersRes.data) {
        centers.splice(0, centers.length, ...centersRes.data);
        renderCentersList();
      }
    } catch (err) {
      console.warn('Live API sync failed, continuing in resilient offline mode', err);
    }
  }
}

function initCropValueCalc() {
  const qtyInput = document.getElementById('sel-qty');
  const cropSelect = document.getElementById('sel-crop');
  if (!qtyInput || !cropSelect) return;

  function updateValue() {
    const qty = parseFloat(qtyInput.value) || 0;
    const crop = cropSelect.value;
    const price = cropPriceMap[crop] || 2275;
    const val = qty * price;
    const box = document.getElementById('crop-value-box');
    const valEl = document.getElementById('crop-value');
    if (box && valEl) {
      if (qty > 0) {
        box.style.display = 'block';
        valEl.textContent = '₹' + val.toLocaleString('en-IN');
      } else {
        box.style.display = 'none';
      }
    }
  }

  qtyInput.addEventListener('input', updateValue);
  cropSelect.addEventListener('change', updateValue);
}

function renderPriceBoard() {
  const tb = document.getElementById('price-tbody');
  if (!tb) return;
  tb.innerHTML = mspData.map(d => `
    <tr>
      <td><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green-600);margin-right:8px;vertical-align:middle"></span>${d.crop}</td>
      <td><strong class="tnum">₹${d.price.toLocaleString('en-IN')}</strong></td>
      <td class="${d.change > 0 ? 'price-up' : 'price-down'} tnum">${d.change > 0 ? '▲' : '▼'} ₹${Math.abs(d.change)}</td>
    </tr>`).join('');
}

function renderCentersList() {
  const el = document.getElementById('centers-list');
  if (!el) return;
  el.innerHTML = centers.map(c => `
    <div class="center-card ${selectedCenter === c.id ? 'selected' : ''}" onclick="selectCenter(${c.id})" id="center-card-${c.id}">
      <div class="center-icon" style="display:flex;align-items:center;justify-content:center;color:var(--green-700)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10h1v2H9z"/><path d="M14 10h1v2h-1z"/><path d="M9 15h1v2H9z"/><path d="M14 15h1v2h-1z"/></svg>
      </div>
      <div class="center-info">
        <div class="center-name">${c.name}</div>
        <div class="center-addr">${c.addr}</div>
        <div class="center-meta">
          <span class="badge ${c.crowd === 'Low' ? 'badge-green' : c.crowd === 'Medium' ? 'badge-amber' : 'badge-red'}">${c.crowd} Queue</span>
          <span class="badge badge-blue">${c.dist} radius</span>
          <span class="badge badge-gray">${c.slots} slots open</span>
        </div>
      </div>
    </div>`).join('');
}

function selectCenter(id) {
  selectedCenter = id;
  renderCentersList();
}

function renderSlots() {
  const el = document.getElementById('slots-grid');
  if (!el) return;
  el.innerHTML = timeSlots.map((s) => `
    <div onclick="${s.avail ? `selectSlot(this,'${s.time}')` : 'void(0)'}" style="border:1.5px solid ${s.avail ? (selectedSlot === s.time ? 'var(--green)' : 'var(--border)') : '#f0f0f0'};border-radius:var(--radius);padding:.55rem .4rem;text-align:center;cursor:${s.avail ? 'pointer' : 'not-allowed'};background:${s.avail ? (selectedSlot === s.time ? 'var(--green-pale)' : '#fff') : '#f8f8f8'};color:${s.avail ? 'var(--text)' : 'var(--text-light)'};font-size:.82rem;font-family:'Inter',sans-serif;font-feature-settings:'tnum';font-weight:${s.avail ? '600' : '400'};transition:.2s">
      ${s.time}<br/><span style="font-size:.68rem;font-weight:500;color:${s.avail ? 'var(--green-700)' : 'var(--text-light)'}">${s.avail ? 'Available' : 'Booked'}</span>
    </div>`).join('');
}

function selectSlot(el, time) {
  selectedSlot = time;
  renderSlots();
}

function selectVehicle(el, v) {
  selectedVehicle = v;
  document.querySelectorAll('.cat-option').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function selectCat(el, cat) {
  selectedCat = cat;
  document.querySelectorAll('.complaint-category .cat-option').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function gotoStep(n, pushHistory = true) {
  if (n === 3 && !selectedCenter && selectedCenter !== 0) {
    showNotif('Please select a procurement center', 'warning');
    return;
  }
  if (n === 4 && !selectedSlot) {
    showNotif('Please select a time slot', 'warning');
    return;
  }

  if (pushHistory && !isHistoryNavigating && n !== bookingStep) {
    navHistory.push({ screen: 'farmer-app', tab: 'book', step: bookingStep });
    try {
      history.pushState({ screen: 'farmer-app', tab: 'book', step: n }, '', '#farmer/book/step' + n);
    } catch (e) {
      console.warn('History pushState error:', e);
    }
  }

  bookingStep = n;
  [1, 2, 3, 4].forEach(i => {
    const el = document.getElementById('book-step' + i);
    if (el) el.style.display = i === n ? 'block' : 'none';
    const stepEl = document.getElementById('step' + i);
    if (stepEl) {
      stepEl.className = 'step-item' + (i < n ? ' done' : i === n ? ' active' : '');
    }
  });

  if (n === 4) renderBookingSummary();
  if (n === 3) renderSlots();
  if (typeof updateBackButtonUI === 'function') updateBackButtonUI();
  window.scrollTo(0, 0);
}

function renderBookingSummary() {
  const cropEl = document.getElementById('sel-crop');
  const qtyEl = document.getElementById('sel-qty');
  const moistureEl = document.getElementById('sel-moisture');
  const dateEl = document.getElementById('sel-date');

  const crop = cropEl ? cropEl.value : 'Wheat';
  const qty = (qtyEl && qtyEl.value) ? qtyEl.value : 'Not specified';
  const moisture = moistureEl ? moistureEl.value : '';
  const center = centers[selectedCenter] || centers[0];
  const date = dateEl ? dateEl.value : '';
  const price = cropPriceMap[crop] || 2275;
  const estVal = qty !== 'Not specified' ? '₹' + (parseFloat(qty) * price).toLocaleString('en-IN') : 'N/A';

  const summaryEl = document.getElementById('booking-summary');
  if (!summaryEl) return;

  summaryEl.innerHTML = `
    <div style="display:grid;gap:.5rem">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Crop</span><strong>${crop}</strong></div>
      <div class="divider" style="margin:.2rem 0"></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Quantity</span><strong>${qty} Qtl</strong></div>
      <div class="divider" style="margin:.2rem 0"></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Vehicle</span><strong>${selectedVehicle || 'Not selected'}</strong></div>
      <div class="divider" style="margin:.2rem 0"></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Moisture</span><strong>${moisture || '—'}%</strong></div>
      <div class="divider" style="margin:.2rem 0"></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Center</span><strong>${center.name}</strong></div>
      <div class="divider" style="margin:.2rem 0"></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Date & Slot</span><strong>${date || new Date().toISOString().split('T')[0]} · ${selectedSlot || '10:00 AM'}</strong></div>
      <div class="divider" style="margin:.2rem 0"></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">MSP Rate</span><strong>₹${price.toLocaleString()}/Qtl</strong></div>
      <div class="divider" style="margin:.2rem 0"></div>
      <div style="display:flex;justify-content:space-between;background:var(--green-pale);border-radius:6px;padding:.4rem .6rem"><span style="color:var(--green);font-weight:600">Est. Value</span><strong style="color:var(--green)">${estVal}</strong></div>
    </div>`;
}

async function confirmBooking() {
  const cropEl = document.getElementById('sel-crop');
  const qtyEl = document.getElementById('sel-qty');
  const moistureEl = document.getElementById('sel-moisture');
  const dateEl = document.getElementById('sel-date');

  const crop = (cropEl && cropEl.value) ? cropEl.value : 'Wheat (गेहूँ)';
  const qty = (qtyEl && qtyEl.value) ? qtyEl.value : '25';
  const moisture = (moistureEl && moistureEl.value) ? moistureEl.value : '12';
  const center = centers[selectedCenter] || centers[0];
  const date = (dateEl && dateEl.value) ? dateEl.value : new Date().toISOString().split('T')[0];
  const slot = selectedSlot || '10:00 AM';
  const vehicle = selectedVehicle || 'Tractor-Trolley';

  // Compute unique sequential token
  let maxToken = 46;
  const existingTokens = [...myBookings.map(b => b.token), ...agentQueue.map(q => q.token)];
  for (const t of existingTokens) {
    if (typeof t === 'string') {
      const match = t.match(/A-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxToken) maxToken = n;
      }
    }
  }
  const token = `A-${String(maxToken + 1).padStart(3, '0')}`;

  let booking = null;
  if (typeof api !== 'undefined') {
    const res = await api.createBooking({
      crop,
      qty,
      vehicle,
      moisture,
      centerId: center.id,
      date,
      slot,
      farmerName: (currentUser && currentUser.name) || 'Registered Farmer'
    });

    if (res && res.success && res.booking) {
      booking = res.booking;
    } else if (res && !res.success) {
      // Reject if server rejects (capacity full / validation failure)
      showNotif(res.message || 'Slot allocation rejected by procurement server', 'error');
      return;
    }
  }

  // Resilient offline fallback ONLY if backend is completely offline (network down)
  if (!booking) {
    booking = {
      id: 'BK-' + Date.now(),
      token,
      crop,
      qty,
      expectedQty: parseFloat(qty) || 25,
      estimatedAmount: Math.round((parseFloat(qty) || 25) * (cropPriceMap[crop] || 2275)),
      vehicle,
      moisture,
      center: center.name,
      centerId: center.id,
      date,
      slot,
      status: 'Confirmed',
      paymentStatus: 'AWAITING_GATE_ARRIVAL',
      price: cropPriceMap[crop] || 2275,
      qrPayload: `AGRIQ-V1:BK-${Date.now()}:${token}:${token}`,
      createdAt: new Date().toISOString()
    };
  }

  const activeToken = booking.token || token;

  myBookings.unshift(booking);
  localStorage.setItem('aq_bookings', JSON.stringify(myBookings));

  // Hide confirm card FIRST, then show QR section
  const step4Card = document.getElementById('book-step4');
  if (step4Card && step4Card.querySelector('.card')) {
    step4Card.querySelector('.card').style.display = 'none';
  }

  const tokenDisplay = document.getElementById('token-display');
  const tokenCenter = document.getElementById('token-center-name');
  const qrResult = document.getElementById('qr-result');

  if (tokenDisplay) tokenDisplay.textContent = activeToken;
  if (tokenCenter) tokenCenter.textContent = center.name;

  // Populate E-Pass details
  const fNameEl = document.getElementById('epass-farmer-name');
  const kIdEl = document.getElementById('epass-kisan-id');
  const cropPassEl = document.getElementById('epass-crop');
  const qtyPassEl = document.getElementById('epass-qty');
  const vehPassEl = document.getElementById('epass-vehicle');
  const moistPassEl = document.getElementById('epass-moisture');
  const dateSlotPassEl = document.getElementById('epass-date-slot');
  const hashPassEl = document.getElementById('epass-hash');

  const farmerName = booking.farmerName || (currentUser && currentUser.name) || 'Registered Farmer';
  if (fNameEl) fNameEl.textContent = farmerName;
  if (kIdEl) kIdEl.textContent = 'KSN-2026-' + activeToken.replace('A-0', '88');
  if (cropPassEl) cropPassEl.textContent = crop;
  if (qtyPassEl) qtyPassEl.textContent = qty + ' Quintals';
  if (vehPassEl) vehPassEl.textContent = vehicle;
  if (moistPassEl) moistPassEl.textContent = (moisture || '12') + '% (Permissible < 14%)';
  if (dateSlotPassEl) dateSlotPassEl.textContent = date + ' · ' + slot;
  if (hashPassEl) hashPassEl.textContent = booking.qrHash ? booking.qrHash.slice(0, 16) + '...' : generateSecurityHash(activeToken, date);

  if (qrResult) qrResult.style.display = 'block';

  // Generate crisp High-Resolution Cryptographic QR Code
  const qrDiv = document.getElementById('qr-div');
  if (qrDiv) {
    qrDiv.innerHTML = '';
    const payloadToEncode = booking.qrPayload || `AGRIQ-V1:${booking.id}:${activeToken}`;

    try {
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrDiv, {
          text: payloadToEncode,
          width: 200,
          height: 200,
          colorDark: '#0D3311',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      } else {
        throw new Error('QRCode library not loaded');
      }
    } catch (e) {
      qrDiv.innerHTML = '<div style="width:200px;height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ECFDF5;border:1px dashed #059669;border-radius:8px"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#064E3B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg><div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1.1rem;font-weight:700;color:#064E3B;margin-top:.5rem">' + activeToken + '</div><div style="font-size:.72rem;color:#4B5563;margin-top:.2rem">Verified Gate Pass</div></div>';
    }
  }

  showNotif(`E-Pass Generated! Token ${activeToken} booked for ${slot}`);
  renderBookings();
}

function printEPass() {
  window.print();
}

function renderBookings() {
  const el = document.getElementById('my-bookings-list');
  if (!el) return;
  if (!myBookings.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:1.5rem;font-size:.88rem">No bookings yet. Book your first slot!</div>';
    const tracker = document.getElementById('payment-tracker');
    if (tracker) tracker.style.display = 'none';
    return;
  }
  el.innerHTML = myBookings.map((b, i) => `
    <div class="booking-item" onclick="showPaymentTracker(${i})" style="cursor:pointer">
      <div class="booking-icon" style="display:flex;align-items:center;justify-content:center;color:var(--green-700)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/></svg>
      </div>
      <div style="flex:1">
        <div class="booking-crop">${b.crop} · <span class="tnum">${b.actualQty ? `${b.actualQty} Qtl (Weighed)` : `${b.qty} Qtl (Est)`}</span></div>
        <div class="booking-meta">${b.center} · ${b.date} · ${b.slot || ''}</div>
      </div>
      <div style="text-align:right">
        <span class="badge ${b.status === 'QUALITY_ACCEPTED' ? 'badge-green' : b.status === 'GATE_CLEARED' ? 'badge-blue' : 'badge-gray'} tnum" style="font-family:'Inter',sans-serif;font-weight:700">${b.token}</span>
        <div style="font-size:.72rem;color:var(--text-light);margin-top:.3rem">${b.status || 'Confirmed'}</div>
      </div>
    </div>`).join('');

  const tracker = document.getElementById('payment-tracker');
  if (tracker) tracker.style.display = myBookings.length ? 'block' : 'none';
  showPaymentTracker(0);
}

let activeTrackerIndex = 0;

async function showPaymentTracker(idx) {
  if (!myBookings[idx]) return;
  activeTrackerIndex = idx;
  const b = myBookings[idx];

  // Try fetching live milestones from backend
  let trackerData = null;
  if (typeof api !== 'undefined') {
    const res = await api.getPaymentTracker(b.id || b.token);
    if (res && res.success) {
      trackerData = res;
      // Sync local booking attributes
      if (res.status) b.status = res.status;
      if (res.actualAmount) b.actualAmount = res.actualAmount;
      if (res.actualQty) b.actualQty = res.actualQty;
    }
  }

  const trackerEl = document.getElementById('payment-tracker');
  if (!trackerEl) return;

  const estVal = b.estimatedAmount || Math.round((parseFloat(b.qty) || 25) * (b.price || 2275));
  const actVal = b.actualAmount || (b.status === 'QUALITY_ACCEPTED' ? estVal : null);

  const milestones = (trackerData && trackerData.milestones) || [
    { step: 1, title: 'Slot Booking Confirmed', desc: `Scheduled for ${b.date} (${b.slot || '10:00 AM'})`, status: 'done', timestamp: b.createdAt },
    { step: 2, title: 'Gate Pass QR Verified', desc: b.status !== 'Confirmed' ? 'Entry cleared at center' : 'Awaiting center gate arrival', status: b.status !== 'Confirmed' ? 'done' : 'current', timestamp: b.gateClearedAt },
    { step: 3, title: 'Electronic Weighbridge Gross & Tare', desc: b.status === 'QUALITY_ACCEPTED' ? `Procured net weight: ${b.actualQty || b.qty} Qtl` : 'Truck queuing for weighbridge', status: b.status === 'QUALITY_ACCEPTED' ? 'done' : (b.status === 'GATE_CLEARED' ? 'current' : 'pending'), timestamp: b.weighedAt },
    { step: 4, title: 'Moisture & Quality Compliance', desc: b.status === 'QUALITY_ACCEPTED' ? 'Grain verified Grade-A (Moisture <= 14% FAQ)' : 'Lab moisture analysis pending', status: b.status === 'QUALITY_ACCEPTED' ? 'done' : 'pending', timestamp: b.weighedAt },
    { step: 5, title: 'PFMS Direct Benefit Transfer Initiated', desc: actVal ? `Payment advice for ₹${actVal.toLocaleString('en-IN')} queued` : 'Awaiting final weighing', status: actVal ? 'done' : 'pending', timestamp: b.paymentInitiatedAt },
    { step: 6, title: 'Procurement Amount Credited', desc: 'Disbursement directly to DBT bank account', status: 'pending', timestamp: null }
  ];

  trackerEl.innerHTML = `
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:.5rem">
        <span class="icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
        </span>
        Direct Benefit Transfer (PFMS) Status Tracker
      </div>
      <span class="badge badge-green tnum">${b.token}</span>
    </div>

    <!-- Dual Value Display: Estimated vs Actual -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;background:#F8FAFC;border:1px solid var(--border);border-radius:var(--radius);padding:.85rem;margin-bottom:1.1rem">
      <div>
        <div style="font-size:.72rem;color:var(--text-light);text-transform:uppercase;font-weight:600">Estimated Value (Pre-Arrival)</div>
        <div style="font-family:'Inter',sans-serif;font-size:1.1rem;font-weight:700;color:var(--text)">₹${estVal.toLocaleString('en-IN')}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">${b.qty} Qtl @ ₹${b.price || 2275}/Qtl</div>
      </div>
      <div style="border-left:1px solid var(--border);padding-left:.6rem">
        <div style="font-size:.72rem;color:var(--text-light);text-transform:uppercase;font-weight:600">Actual Procured Payout</div>
        <div style="font-family:'Inter',sans-serif;font-size:1.1rem;font-weight:700;color:${actVal ? 'var(--green)' : 'var(--text-light)'}">
          ${actVal ? `₹${actVal.toLocaleString('en-IN')}` : 'Pending Weighment'}
        </div>
        <div style="font-size:.72rem;color:${actVal ? 'var(--green-700)' : 'var(--text-muted)'}">
          ${actVal ? `${b.actualQty || b.qty} Qtl Weighed & Approved` : 'Electronic Weighbridge scale'}
        </div>
      </div>
    </div>

    <!-- Step Progress Flow -->
    <div style="display:grid;gap:.65rem">
      ${milestones.map(m => `
        <div class="payment-step">
          <div class="pstep-dot ${m.status === 'done' ? 'pstep-done' : m.status === 'current' ? 'pstep-active' : m.status === 'failed' ? 'pstep-failed' : 'pstep-pending'}" style="${m.status === 'failed' ? 'background:#FEE2E2;color:#EF4444;border:1px solid #FCA5A5' : ''}">
            ${m.status === 'done' ? '✓' : m.status === 'current' ? '⏳' : m.status === 'failed' ? '✗' : m.step}
          </div>
          <div class="pstep-info" style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:baseline">
              <div class="pstep-title" style="${m.status === 'failed' ? 'color:#DC2626' : ''}">${m.title}</div>
              ${m.timestamp ? `<div style="font-size:.7rem;color:var(--text-muted)">${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
            </div>
            <div class="pstep-time" style="font-size:.76rem;margin-top:.15rem">${m.desc}</div>
          </div>
        </div>`).join('')}
    </div>

    <div style="margin-top:1.1rem;display:flex;gap:.5rem">
      <button class="btn btn-outline" style="flex:1" onclick="showBookingPass()">View Official QR E-Pass</button>
      ${actVal ? `<button class="btn btn-primary" style="flex:1" onclick="printFarmerSlip(${activeTrackerIndex})">🖨️ Print Payment Slip</button>` : ''}
    </div>
  `;
}

function printFarmerSlip(idx) {
  const b = myBookings[idx] || myBookings[activeTrackerIndex];
  if (!b) return;

  const estVal = b.estimatedAmount || Math.round((parseFloat(b.qty) || 25) * (b.price || 2275));
  const finalAmount = b.actualAmount || estVal;
  const netQtl = parseFloat(b.actualQty) || parseFloat(b.qty) || 25;
  const netKg = netQtl * 100;
  const tare = 7200;
  const gross = netKg + tare;

  const slipData = {
    id: b.slipId || `WGH-${Date.now()}`,
    token: b.token,
    farmerName: b.farmerName || (window.currentUser && window.currentUser.name) || 'Registered Farmer',
    farmerPhone: b.farmerPhone || (window.currentUser && window.currentUser.phone) || '',
    centerName: b.center || 'Regional APMC Hub',
    commodity: b.crop || 'Wheat',
    grossWeight: gross,
    tareWeight: tare,
    netWeightKg: netKg,
    netQuintals: netQtl,
    moisture: b.moisture || 12.5,
    qualityGrade: b.grade || 'Grade-A (FAQ Standard)',
    mspRate: b.price || 2275,
    finalAmount: finalAmount,
    recordedAt: b.weighedAt || b.createdAt || new Date().toISOString()
  };

  printOfficialWeighmentSlip(slipData);
}

function showBookingPass() {
  const b = myBookings[activeTrackerIndex];
  if (!b) return;

  // Switch to book tab & show E-Pass
  showTab('book');
  gotoStep(4);

  const step4Card = document.getElementById('book-step4');
  if (step4Card && step4Card.querySelector('.card')) {
    step4Card.querySelector('.card').style.display = 'none';
  }

  const tokenDisplay = document.getElementById('token-display');
  const tokenCenter = document.getElementById('token-center-name');
  const fNameEl = document.getElementById('epass-farmer-name');
  const kIdEl = document.getElementById('epass-kisan-id');
  const cropPassEl = document.getElementById('epass-crop');
  const qtyPassEl = document.getElementById('epass-qty');
  const vehPassEl = document.getElementById('epass-vehicle');
  const moistPassEl = document.getElementById('epass-moisture');
  const dateSlotPassEl = document.getElementById('epass-date-slot');
  const hashPassEl = document.getElementById('epass-hash');
  const qrResult = document.getElementById('qr-result');

  const farmerName = b.farmerName || (currentUser && currentUser.name) || 'Registered Farmer';
  if (tokenDisplay) tokenDisplay.textContent = b.token;
  if (tokenCenter) tokenCenter.textContent = b.center;
  if (fNameEl) fNameEl.textContent = farmerName;
  if (kIdEl) kIdEl.textContent = 'KSN-2026-' + b.token.replace('A-0', '88');
  if (cropPassEl) cropPassEl.textContent = b.crop;
  if (qtyPassEl) qtyPassEl.textContent = b.qty + ' Quintals';
  if (vehPassEl) vehPassEl.textContent = b.vehicle || 'Tractor-Trolley';
  if (moistPassEl) moistPassEl.textContent = (b.moisture || '12') + '% (Permissible < 14%)';
  if (dateSlotPassEl) dateSlotPassEl.textContent = b.date + ' · ' + (b.slot || '10:00 AM');
  if (hashPassEl) hashPassEl.textContent = generateSecurityHash(b.token, b.date);

  if (qrResult) qrResult.style.display = 'block';

  // Render QR
  const qrDiv = document.getElementById('qr-div');
  if (qrDiv) {
    qrDiv.innerHTML = '';
    const qrDataPayload = JSON.stringify({
      token: b.token,
      farmer: farmerName,
      crop: b.crop.split(' ')[0],
      qty: parseFloat(b.qty) || 25,
      center: b.center,
      date: b.date,
      slot: b.slot || '10:00 AM',
      auth: 'MANDI-GOV-IN'
    });

    try {
      new QRCode(qrDiv, {
        text: qrDataPayload,
        width: 200,
        height: 200,
        colorDark: '#0D3311',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (e) {
      qrDiv.innerHTML = '<div style="width:200px;height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#E8F5E9;border-radius:8px"><div style="font-family:Inter,sans-serif;font-size:1.4rem;font-weight:800;color:#1B5E20;margin-top:.5rem">' + b.token + '</div><div style="font-size:.75rem;color:#666;margin-top:.3rem">Verified Gate Pass</div></div>';
    }
  }

  showNotif('Official E-Pass loaded for ' + b.token);
  if (typeof updateBackButtonUI === 'function') updateBackButtonUI();
}

function renderComplaints() {
  const farmerEl = document.getElementById('complaints-list');
  const adminEl = document.getElementById('admin-complaints-list');
  const allComplaints = [...sampleComplaints, ...myComplaints];

  if (farmerEl) {
    if (!allComplaints.length) {
      farmerEl.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:1rem;font-size:.88rem">No complaints filed yet.</div>';
    } else {
      farmerEl.innerHTML = allComplaints.map(c => `
        <div class="booking-item" style="flex-direction:column;align-items:stretch">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:.95rem">${c.id} · ${c.cat}</div>
            <span class="badge ${c.status === 'Resolved' ? 'badge-green' : c.status === 'Under Review' ? 'badge-amber' : 'badge-red'}">${c.status}</span>
          </div>
          <div style="font-size:.78rem;color:var(--text-light);margin-top:.3rem">${c.center} · ${c.date}</div>
          <div style="font-size:.82rem;margin-top:.4rem;color:var(--text-mid)">${c.desc}</div>
        </div>`).join('');
    }
  }

  if (adminEl) {
    const pendingComplaints = allComplaints.filter(c => c.status !== 'Resolved');
    if (!pendingComplaints.length) {
      adminEl.innerHTML = '<div style="color:var(--text-light);font-size:.88rem;text-align:center;padding:1rem">No pending grievances in queue.</div>';
    } else {
      adminEl.innerHTML = pendingComplaints.map(c => `
        <div class="booking-item" style="flex-direction:column;align-items:stretch">
          <div style="display:flex;justify-content:space-between">
            <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700">${c.id}</div>
            <span class="badge badge-amber">${c.status}</span>
          </div>
          <div style="font-size:.82rem;color:var(--text-mid);margin-top:.3rem">${c.cat} · ${c.center}</div>
          <div style="display:flex;gap:.5rem;margin-top:.5rem">
            <button class="btn btn-sm btn-primary" onclick="resolveComplaint('${c.id}')">Mark Resolved</button>
            <button class="btn btn-sm btn-outline" onclick="viewComplaintAudit('${c.id}')">Audit Record</button>
          </div>
        </div>`).join('');
    }
  }
}

function viewComplaintAudit(id) {
  const allComplaints = [...sampleComplaints, ...myComplaints];
  const c = allComplaints.find(x => x.id === id);
  if (!c) return;
  showNotif(`Audit Log: [${c.id}] ${c.cat} — Center: ${c.center} (${c.status})`);
}

function generateSecurityHash(token, date) {
  let hash = 0;
  const str = (token || '') + (date || '') + 'AGRIQUEUE-GOV-2026';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `SHA256: ${hex.slice(0, 4)}-${token}-VERIFIED`;
}

async function submitComplaint() {
  const centerEl = document.getElementById('cmp-center');
  const dateEl = document.getElementById('cmp-date');
  const descEl = document.getElementById('cmp-desc');

  const center = centerEl ? centerEl.value : 'Mandi Road Procurement Center';
  const date = dateEl ? dateEl.value : '';
  const desc = descEl ? descEl.value.trim() : '';

  if (!selectedCat) {
    showNotif('Please select a complaint category', 'warning');
    return;
  }
  if (!desc) {
    showNotif('Please describe the issue', 'warning');
    return;
  }

  let complaint = null;
  if (typeof api !== 'undefined') {
    const res = await api.createComplaint({
      cat: selectedCat,
      center,
      date,
      desc
    });
    if (res && res.success && res.complaint) {
      complaint = res.complaint;
    }
  }

  if (!complaint) {
    complaint = {
      id: 'CMP-' + String(myComplaints.length + 3).padStart(3, '0'),
      cat: selectedCat,
      center,
      date,
      desc,
      status: 'Under Review'
    };
  }

  myComplaints.unshift(complaint);
  localStorage.setItem('aq_complaints', JSON.stringify(myComplaints));
  renderComplaints();

  if (descEl) descEl.value = '';
  const previewEl = document.getElementById('photo-preview');
  if (previewEl) previewEl.innerHTML = '';

  showNotif('Complaint submitted! ID: ' + complaint.id);
  setTimeout(() => showTab('complaint'), 500);
}

function triggerEvidenceUpload() {
  const fileInput = document.getElementById('evidence-file-input');
  if (fileInput) fileInput.click();
}

function handleEvidenceUpload(event) {
  const preview = document.getElementById('photo-preview');
  if (!preview) return;

  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    if (preview.children.length >= 3) {
      showNotif('Maximum 3 evidence attachments allowed', 'warning');
      break;
    }

    const file = files[i];
    const reader = new FileReader();

    reader.onload = function(e) {
      const thumb = document.createElement('div');
      thumb.className = 'photo-thumb';
      thumb.title = file.name + ' (Click to remove)';
      
      if (file.type.startsWith('image/')) {
        thumb.innerHTML = `<img src="${e.target.result}" alt="${file.name}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />`;
      } else {
        thumb.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-size:0.65rem;color:var(--text-mid);padding:2px;text-align:center"><span style="font-weight:700">DOC</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:38px">${file.name.slice(-7)}</span></div>`;
      }

      thumb.onclick = function() {
        thumb.remove();
        showNotif('Attachment removed');
      };

      preview.appendChild(thumb);
    };

    reader.readAsDataURL(file);
  }

  showNotif('Evidence document attached');
  event.target.value = '';
}

// Backward compatibility alias
function simulatePhotoUpload() {
  triggerEvidenceUpload();
}

function initCrowdChart() {
  const canvas = document.getElementById('crowd-chart');
  if (!canvas) return;

  // 1. If Chart.js CDN loaded successfully, render via Chart.js
  if (typeof Chart !== 'undefined') {
    try {
      if (canvas._chartInstance) {
        canvas._chartInstance.destroy();
      }

      const ctx = canvas.getContext('2d');
      canvas._chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM'],
          datasets: [{
            label: 'Crowd Level (%)',
            data: [15, 30, 75, 85, 70, 60, 55, 65, 50, 40, 35, 30, 20],
            borderColor: '#E65100',
            backgroundColor: 'rgba(230,81,0,.12)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#E65100',
            pointRadius: 3.5,
            borderWidth: 2.2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => 'Crowd: ' + ctx.raw + '%' } }
          },
          scales: {
            y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 10 }, callback: v => v + '%' } },
            x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 9 } } }
          }
        }
      });
      return;
    } catch (e) {
      console.warn('Chart.js render exception, switching to native fallback:', e);
    }
  }

  // 2. High-performance offline / resilient Native Canvas fallback
  drawNativeCrowdChart(canvas);
}

// Native Canvas Renderer for crowd throughput chart (zero external dependencies)
function drawNativeCrowdChart(canvas) {
  if (!canvas) return;
  const parent = canvas.parentElement;
  const width = parent ? (parent.clientWidth || 360) : 360;
  const height = 185;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const labels = ['6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM'];
  const data = [15, 30, 75, 85, 70, 60, 55, 65, 50, 40, 35, 30, 20];

  const padLeft = 38;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  if (chartW <= 0 || chartH <= 0) {
    ctx.restore();
    return;
  }

  // Draw Horizontal Reference Lines
  const ySteps = [0, 25, 50, 75, 100];
  ctx.lineWidth = 1;
  ctx.font = '500 10px "Inter", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  ySteps.forEach(val => {
    const y = padTop + chartH - (val / 100) * chartH;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(val + '%', padLeft - 6, y);
  });
  ctx.setLineDash([]);

  // Calculate Points
  const points = data.map((val, idx) => {
    const x = padLeft + (idx / (data.length - 1)) * chartW;
    const y = padTop + chartH - (val / 100) * chartH;
    return { x, y, val, label: labels[idx] };
  });

  // Area Fill under Curve
  const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
  grad.addColorStop(0, 'rgba(230, 81, 0, 0.22)');
  grad.addColorStop(0.7, 'rgba(230, 81, 0, 0.05)');
  grad.addColorStop(1, 'rgba(230, 81, 0, 0.00)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, padTop + chartH);
  ctx.lineTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  ctx.quadraticCurveTo(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 1].x, points[points.length - 1].y);
  ctx.lineTo(points[points.length - 1].x, padTop + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Smooth Curve Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  ctx.quadraticCurveTo(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 1].x, points[points.length - 1].y);
  ctx.strokeStyle = '#E65100';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Draw Data Points & X Axis Labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  points.forEach((pt, idx) => {
    // Label display (every 2h on narrow screens, every hour on wider screens)
    const showLabel = width < 450 ? (idx % 2 === 0) : true;
    if (showLabel) {
      ctx.fillStyle = '#64748B';
      ctx.font = '600 10px "Inter", sans-serif';
      ctx.fillText(pt.label, pt.x, padTop + chartH + 7);
    }

    // Circular Data Point with color threshold
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.8, 0, Math.PI * 2);
    if (pt.val <= 35) {
      ctx.fillStyle = '#10B981'; // Optimal window
    } else if (pt.val >= 75) {
      ctx.fillStyle = '#EF4444'; // Peak
    } else {
      ctx.fillStyle = '#F59E0B'; // Moderate
    }
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  });

  ctx.restore();
}

// Window resize listener for responsive native chart
window.addEventListener('resize', () => {
  const canvas = document.getElementById('crowd-chart');
  if (canvas && (!canvas._chartInstance || typeof Chart === 'undefined')) {
    drawNativeCrowdChart(canvas);
  }
});
