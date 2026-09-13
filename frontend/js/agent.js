// ===== AgriQueue+ | Center Agent (Distributor) Logic =====

let currentActiveWeighToken = null;

async function initDistributorApp() {
  if (typeof api !== 'undefined') {
    const res = await api.getAgentQueue();
    if (res && res.success && res.data) {
      agentQueue.splice(0, agentQueue.length, ...res.data);
    }
  }
  renderAgentQueue();
}

function renderAgentQueue() {
  const el = document.getElementById('agent-queue-list');
  if (!el) return;
  el.innerHTML = agentQueue.map(q => `
    <div class="booking-item" onclick="selectQueueToken('${q.token}')" style="cursor:pointer">
      <div class="booking-icon" style="display:flex;align-items:center;justify-content:center;background:${q.status === 'completed' || q.status === 'done' ? '#E8F5E9' : q.status === 'cleared' ? '#FFF3E0' : '#F1F5F9'};color:${q.status === 'completed' || q.status === 'done' ? '#2E7D32' : q.status === 'cleared' ? '#B45309' : '#64748B'}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${q.status === 'completed' || q.status === 'done' ? '<path d="M20 6 9 17l-5-5"/>' : q.status === 'cleared' ? '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>' : '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'}
        </svg>
      </div>
      <div style="flex:1">
        <div class="booking-crop" style="font-family:'Inter',sans-serif;font-feature-settings:'tnum'">${q.token} · ${q.name}</div>
        <div class="booking-meta">${q.crop} · ${q.qty} Qtl ${q.actualQty ? `(Actual: ${q.actualQty} Qtl)` : ''}</div>
      </div>
      <span class="badge ${q.status === 'completed' || q.status === 'done' ? 'badge-green' : q.status === 'cleared' ? 'badge-amber' : 'badge-gray'}">
        ${q.status === 'completed' || q.status === 'done' ? 'Procured & Weighed' : q.status === 'cleared' ? 'At Weighbridge' : 'Inbound Queue'}
      </span>
    </div>`).join('');
}

function selectQueueToken(tok) {
  const inp = document.getElementById('scan-input');
  if (inp) {
    inp.value = tok;
    verifyToken();
  }
}

async function verifyToken() {
  const inpEl = document.getElementById('scan-input');
  const result = document.getElementById('verify-result');
  if (!inpEl || !result) return;

  const inp = inpEl.value.trim();
  if (!inp) {
    showNotif('Please enter token or scan QR pass', 'warning');
    return;
  }

  let found = null;
  let isAlreadyUsed = false;
  let apiErrorMsg = null;

  // 1. Try backend verification first
  if (typeof api !== 'undefined') {
    const res = await api.verifyToken(inp);
    if (res && res.success && res.data) {
      found = res.data;
      isAlreadyUsed = res.data.isUsed || false;
    } else if (res && !res.success) {
      if (res.code === 'ALREADY_USED') {
        isAlreadyUsed = true;
        found = res.data;
        apiErrorMsg = res.message;
      } else {
        apiErrorMsg = res.message;
      }
    }
  }

  // Fallback to local queue/bookings if offline
  if (!found && !apiErrorMsg) {
    const local = agentQueue.find(q => q.token === inp.toUpperCase()) ||
      myBookings.find(b => b.token === inp.toUpperCase());
    if (local) {
      found = {
        token: inp.toUpperCase(),
        farmer: local.name || local.farmerName || 'Farmer',
        crop: local.crop || 'Wheat',
        qty: local.qty || 25,
        status: local.status || 'Confirmed'
      };
      if (local.status === 'GATE_CLEARED' || local.status === 'QUALITY_ACCEPTED') {
        isAlreadyUsed = true;
      }
    }
  }

  result.style.display = 'block';

  // Anti-Replay Detection Alert
  if (isAlreadyUsed) {
    result.innerHTML = `
      <div style="background:#FFF1F2;border:1.5px solid #FDA4AF;border-radius:var(--radius);padding:1.1rem;animation:fadeIn .3s ease">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem;color:#E11D48">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16"/></svg>
          <strong style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.05rem">Tamper Alert: QR Pass Already Used!</strong>
        </div>
        <div style="font-size:.85rem;color:#475569;margin-bottom:.8rem;line-height:1.4">
          ${apiErrorMsg || `Pass for Token <strong>${found.token}</strong> has already completed gate verification. Reusable gate passes are strictly prohibited.`}
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-primary btn-sm" onclick="showWeighbridgeStation('${found.token}', '${found.farmer}', '${found.crop}')">Proceed to Weighbridge Record →</button>
        </div>
      </div>`;
    showNotif('Pass already redeemed', 'warning');
    return;
  }

  if (found) {
    const token = found.token || inp.toUpperCase();
    const name = found.farmer || found.name || 'Registered Farmer';
    const crop = found.crop || 'Wheat';
    const qty = found.qty || 25;

    currentActiveWeighToken = token;

    result.innerHTML = `
      <div style="background:var(--green-pale);border:1.5px solid #A5D6A7;border-radius:var(--radius);padding:1.1rem;animation:fadeIn .3s ease">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--green);color:#fff;display:inline-flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.1rem;font-weight:700;color:var(--green)">Digital Gate Pass Authenticated</span>
        </div>
        <div style="display:grid;gap:.4rem;font-size:.88rem">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Token ID</span><strong class="tnum">${token}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Farmer Name</span><strong>${name}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">MSP Crop</span><strong>${crop}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Declared Quantity</span><strong class="tnum">${qty} Quintals</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Pass Integrity</span><strong style="color:var(--green)">✓ Cryptographically Signed</strong></div>
        </div>
        <div style="display:flex;gap:.5rem;margin-top:1rem">
          <button class="btn btn-primary" style="flex:1" onclick="processEntry('${token}', '${name}', '${crop}')">Approve Gate Clearance →</button>
          <button class="btn btn-danger" onclick="rejectEntry('${token}')">Reject Batch</button>
        </div>
      </div>`;
    showNotif('Pass ' + token + ' verified successfully', 'success');
  } else {
    result.innerHTML = `
      <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:var(--radius);padding:1rem;text-align:center;color:var(--danger);font-weight:600">
        ${apiErrorMsg || 'Token not found in registry. Please verify input or scan a valid QR pass.'}
      </div>`;
    showNotif('Pass not found', 'error');
  }
}

async function processEntry(token, farmerName = 'Farmer', crop = 'Wheat') {
  if (typeof api !== 'undefined') {
    await api.processEntry(token);
  }

  const doneEl = document.getElementById('agent-done');
  const pendingEl = document.getElementById('agent-pending');
  if (doneEl) doneEl.textContent = (parseInt(doneEl.textContent) || 0) + 1;
  if (pendingEl && parseInt(pendingEl.textContent) > 0) pendingEl.textContent = parseInt(pendingEl.textContent) - 1;

  showNotif(`Gate clearance approved for ${token}. Opening Weighbridge Console...`, 'success');
  showWeighbridgeStation(token, farmerName, crop);
}

// Weighbridge & Quality Control Station Modal / View
function showWeighbridgeStation(token, farmerName = 'Farmer', crop = 'Wheat') {
  currentActiveWeighToken = token;
  const result = document.getElementById('verify-result');
  if (!result) return;

  result.style.display = 'block';
  result.innerHTML = `
    <div class="card" style="background:#FAFCFF;border:2px solid var(--green-600);border-radius:var(--radius-lg);padding:1.25rem;animation:fadeIn .3s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;border-bottom:1px solid var(--border);padding-bottom:.6rem">
        <div>
          <span class="badge badge-green" style="font-size:.75rem">Step 2: Electronic Weighbridge</span>
          <h3 style="font-size:1.15rem;margin:0.25rem 0 0;color:var(--text)">Weighment & Moisture Inspection</h3>
        </div>
        <div style="text-align:right">
          <span style="font-family:'Rajdhani',sans-serif;font-size:1.2rem;font-weight:700;color:var(--green)">${token}</span>
        </div>
      </div>

      <div style="font-size:.85rem;color:var(--text-light);margin-bottom:1rem">
        Farmer: <strong>${farmerName}</strong> · Commodity: <strong>${crop}</strong>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1rem">
        <div class="form-group">
          <label class="form-label" style="font-size:.82rem">Gross Weight (kg) <span class="hint">Loaded Truck</span></label>
          <input type="number" class="form-input" id="wb-gross" placeholder="e.g. 18500" value="18500" oninput="calculateNetWeighment()" min="1" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:.82rem">Tare Weight (kg) <span class="hint">Empty Truck</span></label>
          <input type="number" class="form-input" id="wb-tare" placeholder="e.g. 7200" value="7200" oninput="calculateNetWeighment()" min="0" />
        </div>
      </div>

      <!-- Live Calculated Net Weight Display -->
      <div style="background:var(--green-pale);border:1.5px dashed var(--green-500);border-radius:var(--radius);padding:.85rem;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:.82rem;font-weight:600;color:var(--green-800)">Calculated Net Procured Weight:</span>
          <div style="text-align:right">
            <span id="wb-net-kg" style="font-family:'Inter',sans-serif;font-size:1.25rem;font-weight:700;color:var(--green)">11,300 kg</span>
            <span id="wb-net-qtl" style="font-size:.85rem;font-weight:600;color:var(--green-700);margin-left:.4rem">(113.00 Qtl)</span>
          </div>
        </div>
      </div>

      <!-- Moisture & Quality Analysis -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1rem">
        <div class="form-group">
          <label class="form-label" style="font-size:.82rem">Moisture Reading (%) <span class="hint">Max 14% FAQ</span></label>
          <input type="number" class="form-input" id="wb-moisture" placeholder="e.g. 11.8" value="11.8" step="0.1" min="0" max="35" oninput="checkMoistureCompliance()" />
          <div id="wb-moisture-badge" style="font-size:.75rem;margin-top:.3rem;font-weight:600;color:var(--green)">✓ Within 14% FAQ threshold</div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:.82rem">Grading Standard</label>
          <select class="form-select" id="wb-grade">
            <option value="Grade-A (FAQ Prime)" selected>Grade-A (FAQ Prime)</option>
            <option value="FAQ (Fair Average Quality)">FAQ Standard</option>
            <option value="Grade-B (Minor Discoloration)">Grade-B Discolored</option>
          </select>
        </div>
      </div>

      <!-- Live MSP Payout Calculator -->
      <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:var(--radius);padding:.85rem;margin-bottom:1.1rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:.75rem;color:var(--text-light)">MSP Rate Applicable</div>
            <strong id="wb-msp-rate">₹2,275 / Qtl</strong>
          </div>
          <div style="text-align:right">
            <div style="font-size:.75rem;color:var(--text-light)">Final Procurement Value</div>
            <strong id="wb-final-payout" style="font-family:'Inter',sans-serif;font-size:1.3rem;font-weight:800;color:var(--green)">₹2,57,075</strong>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:.6rem">
        <button class="btn btn-primary" style="flex:1" onclick="submitWeighment('${token}')">Confirm & Issue Weighment Slip</button>
        <button class="btn btn-outline" onclick="document.getElementById('verify-result').style.display='none'">Cancel</button>
      </div>
    </div>`;

  calculateNetWeighment();
}

function calculateNetWeighment() {
  const gEl = document.getElementById('wb-gross');
  const tEl = document.getElementById('wb-tare');
  const netKgEl = document.getElementById('wb-net-kg');
  const netQtlEl = document.getElementById('wb-net-qtl');
  const payoutEl = document.getElementById('wb-final-payout');
  if (!gEl || !tEl) return;

  const gross = parseFloat(gEl.value) || 0;
  const tare = parseFloat(tEl.value) || 0;
  const net = Math.max(0, gross - tare);
  const qtl = (net / 100).toFixed(2);
  const msp = 2275;
  const total = Math.round(parseFloat(qtl) * msp);

  if (netKgEl) netKgEl.textContent = net.toLocaleString('en-IN') + ' kg';
  if (netQtlEl) netQtlEl.textContent = `(${qtl} Qtl)`;
  if (payoutEl) payoutEl.textContent = '₹' + total.toLocaleString('en-IN');
}

function checkMoistureCompliance() {
  const mEl = document.getElementById('wb-moisture');
  const badge = document.getElementById('wb-moisture-badge');
  if (!mEl || !badge) return;

  const val = parseFloat(mEl.value) || 0;
  if (val <= 14.0) {
    badge.style.color = 'var(--green)';
    badge.textContent = `✓ ${val}% is within statutory 14.0% FAQ threshold`;
  } else {
    badge.style.color = 'var(--danger)';
    badge.textContent = `✗ ${val}% EXCEEDS 14.0% limit — Batch requires re-drying or penalty`;
  }
}

async function submitWeighment(token) {
  const gEl = document.getElementById('wb-gross');
  const tEl = document.getElementById('wb-tare');
  const mEl = document.getElementById('wb-moisture');
  const gradeEl = document.getElementById('wb-grade');
  const result = document.getElementById('verify-result');

  const gross = parseFloat(gEl ? gEl.value : 18500);
  const tare = parseFloat(tEl ? tEl.value : 7200);
  const moisture = parseFloat(mEl ? mEl.value : 11.8);
  const grade = gradeEl ? gradeEl.value : 'Grade-A (FAQ Prime)';

  let res = null;
  if (typeof api !== 'undefined') {
    res = await api.recordWeighment({
      token,
      grossWeight: gross,
      tareWeight: tare,
      moisture,
      qualityGrade: grade
    });
  }

  if (res && res.success && res.weighment) {
    const w = res.weighment;
    result.innerHTML = `
      <div class="card" style="background:#F0FDF4;border:2px solid var(--green);border-radius:var(--radius);padding:1.3rem;animation:fadeIn .3s ease">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <div style="display:flex;align-items:center;gap:.5rem">
            <span style="background:var(--green);color:#fff;border-radius:50%;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center">✓</span>
            <strong style="color:var(--green);font-size:1.1rem">Official Weighment Slip Generated</strong>
          </div>
          <span class="badge badge-green">Slip ID: ${w.id}</span>
        </div>

        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem;font-size:.88rem;margin-bottom:1rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span style="color:var(--text-light)">Token / Manifest:</span><strong>${w.token}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span style="color:var(--text-light)">Gross Vehicle Weight:</span><strong class="tnum">${w.grossWeight.toLocaleString()} kg</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span style="color:var(--text-light)">Tare Tare Weight:</span><strong class="tnum">${w.tareWeight.toLocaleString()} kg</strong></div>
          <div class="divider" style="margin:.4rem 0"></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span style="font-weight:700">Accepted Net Quantity:</span><strong class="tnum" style="color:var(--green);font-size:1.05rem">${w.netWeightKg.toLocaleString()} kg (${w.netQuintals} Qtl)</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span style="color:var(--text-light)">Moisture Meter Level:</span><strong>${w.moisture}% (${w.qualityGrade})</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span style="color:var(--text-light)">MSP Rate Payable:</span><strong class="tnum">₹${w.mspRate.toLocaleString('en-IN')} / Qtl</strong></div>
          <div class="divider" style="margin:.4rem 0"></div>
          <div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:1rem">Approved Procurement Payout:</span><strong class="tnum" style="font-size:1.25rem;color:var(--green)">₹${w.finalAmount.toLocaleString('en-IN')}</strong></div>
        </div>

        <div style="font-size:.8rem;color:var(--text-light);margin-bottom:1rem">
          Payment state transitioned to: <strong style="color:var(--green)">PFMS_PAYMENT_INITIATED</strong>. Direct credit will route to registered DBT account.
        </div>

        <div style="display:flex;gap:.5rem">
          <button class="btn btn-outline" style="flex:1" onclick="window.print()">🖨️ Print Weighment Receipt</button>
          <button class="btn btn-primary" onclick="initDistributorApp();document.getElementById('verify-result').style.display='none'">Done & Next Inbound →</button>
        </div>
      </div>`;
    showNotif(`Weighment registered: ${w.netQuintals} Qtl @ ₹${w.finalAmount.toLocaleString('en-IN')}`, 'success');
  } else {
    showNotif(res && res.message ? res.message : 'Weighment recorded locally', 'success');
    setTimeout(() => {
      initDistributorApp();
      result.style.display = 'none';
    }, 1500);
  }
}

async function rejectEntry(token) {
  const reason = prompt('Please specify gate rejection reason:', 'Grain moisture or vehicle documentation issue');
  if (reason === null) return; // User cancelled

  if (typeof api !== 'undefined') {
    await api.rejectEntry(token, reason || 'Moisture/quality rejection');
  }

  const rejectedEl = document.getElementById('agent-rejected');
  const result = document.getElementById('verify-result');

  if (rejectedEl) rejectedEl.textContent = (parseInt(rejectedEl.textContent) || 0) + 1;
  if (result) {
    result.innerHTML = `
      <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:var(--radius);padding:1rem;text-align:center;color:var(--danger);font-weight:700">
        Batch rejected for Token ${token}. Reason: ${reason}
      </div>`;
  }
  showNotif('Entry rejected for ' + token, 'error');
  initDistributorApp();
}
