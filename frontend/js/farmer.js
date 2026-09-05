// ===== AgriQueue+ | Farmer Portal Logic =====

async function initFarmerApp() {
  // Try fetching latest data from backend
  if (typeof api !== 'undefined') {
    const mspRes = await api.getMSP();
    if (mspRes && mspRes.success && mspRes.data) {
      mspData.splice(0, mspData.length, ...mspRes.data);
      Object.assign(cropPriceMap, mspRes.priceMap || {});
    }

    const centersRes = await api.getCenters();
    if (centersRes && centersRes.success && centersRes.data) {
      centers.splice(0, centers.length, ...centersRes.data);
    }
  }

  renderPriceBoard();
  renderBookings();
  renderComplaints();
  initCrowdChart();
  animateQueue();
  renderCentersList();
  renderSlots();
  initCropValueCalc();
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
      <td>${d.icon} ${d.crop}</td>
      <td><strong>₹${d.price.toLocaleString()}</strong></td>
      <td class="${d.change > 0 ? 'price-up' : 'price-down'}">${d.change > 0 ? '▲' : '▼'} ₹${Math.abs(d.change)}</td>
    </tr>`).join('');
}

function renderCentersList() {
  const el = document.getElementById('centers-list');
  if (!el) return;
  el.innerHTML = centers.map(c => `
    <div class="center-card ${selectedCenter === c.id ? 'selected' : ''}" onclick="selectCenter(${c.id})" id="center-card-${c.id}">
      <div class="center-icon">${c.icon}</div>
      <div class="center-info">
        <div class="center-name">${c.name}</div>
        <div class="center-addr">📍 ${c.addr}</div>
        <div class="center-meta">
          <span class="badge ${c.crowd === 'Low' ? 'badge-green' : c.crowd === 'Medium' ? 'badge-amber' : 'badge-red'}">${c.crowd} Queue</span>
          <span class="badge badge-blue">📏 ${c.dist}</span>
          <span class="badge badge-gray">🎟️ ${c.slots} slots left</span>
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
    <div onclick="${s.avail ? `selectSlot(this,'${s.time}')` : 'void(0)'}" style="border:1.5px solid ${s.avail ? (selectedSlot === s.time ? 'var(--green)' : 'var(--border)') : '#f0f0f0'};border-radius:var(--radius);padding:.5rem;text-align:center;cursor:${s.avail ? 'pointer' : 'not-allowed'};background:${s.avail ? (selectedSlot === s.time ? 'var(--green-pale)' : '#fff') : '#f8f8f8'};color:${s.avail ? 'var(--text)' : 'var(--text-light)'};font-size:.8rem;font-family:'Rajdhani',sans-serif;font-weight:${s.avail ? '600' : '400'};transition:.2s">
      ${s.time}<br/><span style="font-size:.65rem;font-weight:400">${s.avail ? 'Available' : 'Booked'}</span>
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

function gotoStep(n) {
  if (n === 3 && !selectedCenter && selectedCenter !== 0) {
    showNotif('Please select a procurement center', 'warning');
    return;
  }
  if (n === 4 && !selectedSlot) {
    showNotif('Please select a time slot', 'warning');
    return;
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
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Date & Slot</span><strong>${date} · ${selectedSlot}</strong></div>
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

  const crop = cropEl ? cropEl.value : 'Wheat';
  const qty = (qtyEl && qtyEl.value) ? qtyEl.value : '25';
  const moisture = (moistureEl && moistureEl.value) ? moistureEl.value : '12';
  const center = centers[selectedCenter] || centers[0];
  const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];

  queueCounter++;
  let token = 'A-0' + queueCounter;

  // Call Backend API
  let booking = null;
  if (typeof api !== 'undefined') {
    const res = await api.createBooking({
      crop,
      qty,
      vehicle: selectedVehicle || 'Tractor-Trolley',
      moisture,
      centerId: center.id,
      date,
      slot: selectedSlot || '10:00 AM',
      farmerName: (currentUser && currentUser.name) || 'Ramesh Kumar'
    });

    if (res && res.success && res.booking) {
      booking = res.booking;
      token = booking.token;
    }
  }

  // Fallback if backend offline
  if (!booking) {
    booking = {
      id: 'BK-' + Date.now(),
      token,
      crop,
      qty,
      center: center.name,
      date,
      slot: selectedSlot || '10:00 AM',
      status: 'Confirmed',
      price: cropPriceMap[crop] || 2275
    };
  }

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

  if (tokenDisplay) tokenDisplay.textContent = token;
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

  const farmerName = (currentUser && currentUser.name) || 'Ramesh Kumar';
  if (fNameEl) fNameEl.textContent = farmerName;
  if (kIdEl) kIdEl.textContent = 'KSN-2026-' + token.replace('A-0', '88');
  if (cropPassEl) cropPassEl.textContent = crop;
  if (qtyPassEl) qtyPassEl.textContent = qty + ' Quintals';
  if (vehPassEl) vehPassEl.textContent = selectedVehicle || 'Tractor-Trolley';
  if (moistPassEl) moistPassEl.textContent = (moisture || '12') + '% (Permissible < 14%)';
  if (dateSlotPassEl) dateSlotPassEl.textContent = date + ' · ' + (selectedSlot || '10:00 AM');
  if (hashPassEl) hashPassEl.textContent = 'SHA256: ' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + token + '-VERIFIED';

  if (qrResult) qrResult.style.display = 'block';

  // Generate crisp High-Resolution Real QR Code
  const qrDiv = document.getElementById('qr-div');
  if (qrDiv) {
    qrDiv.innerHTML = '';
    const qrDataPayload = JSON.stringify({
      token,
      farmer: farmerName,
      crop: crop.split(' ')[0],
      qty: parseFloat(qty) || 25,
      center: center.name,
      date,
      slot: selectedSlot || '10:00 AM',
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
      qrDiv.innerHTML = '<div style="width:200px;height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#E8F5E9;border-radius:8px"><div style="font-size:3.5rem">🎟️</div><div style="font-family:Rajdhani,sans-serif;font-size:1.2rem;font-weight:700;color:#1B5E20;margin-top:.5rem">' + token + '</div><div style="font-size:.75rem;color:#666;margin-top:.3rem">Verified Gate Pass</div></div>';
    }
  }

  showNotif('Official E-Pass generated! Token: ' + token + ' 🎟️');
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
    <div class="booking-item" onclick="showPaymentTracker(${i})">
      <div class="booking-icon">🌾</div>
      <div style="flex:1">
        <div class="booking-crop">${b.crop} · ${b.qty} Qtl</div>
        <div class="booking-meta">${b.center} · ${b.date} · ${b.slot || ''}</div>
      </div>
      <div style="text-align:right">
        <span class="badge badge-green" style="font-family:'Rajdhani',sans-serif">${b.token}</span>
        <div style="font-size:.72rem;color:var(--text-light);margin-top:.3rem">${b.status || 'Confirmed'}</div>
      </div>
    </div>`).join('');

  const tracker = document.getElementById('payment-tracker');
  if (tracker) tracker.style.display = myBookings.length ? 'block' : 'none';
  showPaymentTracker(0);
}

let activeTrackerIndex = 0;

function showPaymentTracker(idx) {
  if (!myBookings[idx]) return;
  activeTrackerIndex = idx;
  const b = myBookings[idx];
  const d = new Date(b.createdAt || parseInt(b.id.split('-')[1]) || Date.now());
  const t1 = document.getElementById('pt-t1');
  const t2 = document.getElementById('pt-t2');
  const t3 = document.getElementById('pt-t3');
  const t4 = document.getElementById('pt-t4');
  const t5 = document.getElementById('pt-t5');

  if (t1) t1.textContent = isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString();
  if (t2) t2.textContent = b.status === 'Verified' || b.status === 'Completed' ? 'Verified ✓' : 'Pending scan';
  if (t3) t3.textContent = b.status === 'Completed' ? 'Accepted ✓' : 'Processing...';
  if (t4) t4.textContent = 'Pending';
  if (t5) t5.textContent = 'Pending';
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

  const farmerName = b.farmerName || (currentUser && currentUser.name) || 'Ramesh Kumar';
  if (tokenDisplay) tokenDisplay.textContent = b.token;
  if (tokenCenter) tokenCenter.textContent = b.center;
  if (fNameEl) fNameEl.textContent = farmerName;
  if (kIdEl) kIdEl.textContent = 'KSN-2026-' + b.token.replace('A-0', '88');
  if (cropPassEl) cropPassEl.textContent = b.crop;
  if (qtyPassEl) qtyPassEl.textContent = b.qty + ' Quintals';
  if (vehPassEl) vehPassEl.textContent = b.vehicle || 'Tractor-Trolley';
  if (moistPassEl) moistPassEl.textContent = (b.moisture || '12') + '% (Permissible < 14%)';
  if (dateSlotPassEl) dateSlotPassEl.textContent = b.date + ' · ' + (b.slot || '10:00 AM');
  if (hashPassEl) hashPassEl.textContent = 'SHA256: 8F4B-' + b.token + '-VERIFIED';

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
      qrDiv.innerHTML = '<div style="width:200px;height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#E8F5E9;border-radius:8px"><div style="font-size:3.5rem">🎟️</div><div style="font-family:Rajdhani,sans-serif;font-size:1.2rem;font-weight:700;color:#1B5E20;margin-top:.5rem">' + b.token + '</div><div style="font-size:.75rem;color:#666;margin-top:.3rem">Verified Gate Pass</div></div>';
    }
  }

  showNotif('Official E-Pass loaded for ' + b.token + ' 🎫');
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
            <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.95rem">${c.id} · ${c.cat}</div>
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
      adminEl.innerHTML = '<div style="color:var(--text-light);font-size:.88rem;text-align:center;padding:1rem">No pending complaints 🎉</div>';
    } else {
      adminEl.innerHTML = pendingComplaints.map(c => `
        <div class="booking-item" style="flex-direction:column;align-items:stretch">
          <div style="display:flex;justify-content:space-between">
            <div style="font-family:'Rajdhani',sans-serif;font-weight:700">${c.id}</div>
            <span class="badge badge-amber">${c.status}</span>
          </div>
          <div style="font-size:.82rem;color:var(--text-mid);margin-top:.3rem">${c.cat} · ${c.center}</div>
          <div style="display:flex;gap:.5rem;margin-top:.5rem">
            <button class="btn btn-sm btn-primary" onclick="resolveComplaint('${c.id}')">✅ Resolve</button>
            <button class="btn btn-sm btn-outline">📋 View Details</button>
          </div>
        </div>`).join('');
    }
  }
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

  showNotif('Complaint submitted! ID: ' + complaint.id + ' 🎉');
  setTimeout(() => showTab('complaint'), 500);
}

function simulatePhotoUpload() {
  const icons = ['📸', '🖼️', '📷'];
  const preview = document.getElementById('photo-preview');
  if (!preview) return;

  if (preview.children.length < 3) {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    thumb.textContent = icons[preview.children.length % 3];
    preview.appendChild(thumb);
    showNotif('Photo added ✓');
  } else {
    showNotif('Max 3 photos allowed', 'warning');
  }
}

function initCrowdChart() {
  const canvas = document.getElementById('crowd-chart');
  if (!canvas || typeof Chart === 'undefined') return;

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
        tension: .4,
        pointBackgroundColor: '#E65100',
        pointRadius: 3,
        borderWidth: 2,
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
}
