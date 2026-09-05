// ===== AgriQueue+ | Center Agent (Distributor) Logic =====

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
    <div class="booking-item">
      <div class="booking-icon" style="background:${q.status === 'done' ? '#E8F5E9' : q.status === 'current' ? '#FFF3E0' : '#fff'}">
        ${q.status === 'done' ? '✅' : q.status === 'current' ? '🔄' : '⏳'}
      </div>
      <div style="flex:1">
        <div class="booking-crop">${q.token} · ${q.name}</div>
        <div class="booking-meta">${q.crop} · ${q.qty} Qtl</div>
      </div>
      <span class="badge ${q.status === 'done' ? 'badge-green' : q.status === 'current' ? 'badge-amber' : 'badge-gray'}">
        ${q.status === 'done' ? 'Done' : q.status === 'current' ? 'Current' : 'Waiting'}
      </span>
    </div>`).join('');
}

async function verifyToken() {
  const inpEl = document.getElementById('scan-input');
  const result = document.getElementById('verify-result');
  if (!inpEl || !result) return;

  const inp = inpEl.value.trim().toUpperCase();
  if (!inp) {
    showNotif('Enter a token number', 'warning');
    return;
  }

  let found = null;

  // Try backend verification first
  if (typeof api !== 'undefined') {
    const res = await api.verifyToken(inp);
    if (res && res.success && res.data) {
      found = res.data;
    }
  }

  // Fallback to local queue/bookings
  if (!found) {
    const local = agentQueue.find(q => q.token === inp) ||
      myBookings.find(b => b.token === inp);
    if (local) {
      found = {
        token: inp,
        farmer: local.name || local.farmerName || currentUser.name || 'Farmer',
        crop: local.crop || 'Wheat',
        qty: local.qty || 25
      };
    }
  }

  if (found) {
    const name = found.farmer || found.name || currentUser.name || 'Farmer';
    const crop = found.crop;
    const qty = found.qty;
    result.style.display = 'block';
    result.innerHTML = `
      <div style="background:var(--green-pale);border:1.5px solid #A5D6A7;border-radius:var(--radius);padding:1rem;animation:fadeIn .3s ease">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem">
          <span style="font-size:1.5rem">✅</span>
          <span style="font-family:'Rajdhani',sans-serif;font-size:1.2rem;font-weight:700;color:var(--green)">Token Verified!</span>
        </div>
        <div style="display:grid;gap:.4rem;font-size:.88rem">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Token</span><strong>${inp}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Farmer</span><strong>${name}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Crop</span><strong>${crop || 'Wheat'}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-light)">Qty</span><strong>${qty || '—'} Qtl</strong></div>
        </div>
        <div style="display:flex;gap:.5rem;margin-top:.8rem">
          <button class="btn btn-primary" style="flex:1" onclick="processEntry('${inp}')">✅ Allow Entry</button>
          <button class="btn btn-danger" onclick="rejectEntry('${inp}')">❌ Reject</button>
        </div>
      </div>`;
    showNotif('Token ' + inp + ' found ✓');
  } else {
    result.style.display = 'block';
    result.innerHTML = `<div style="background:#FFEBEE;border:1.5px solid #FFCDD2;border-radius:var(--radius);padding:1rem;text-align:center;color:var(--danger);font-weight:600">❌ Token not found. Check and try again.</div>`;
    showNotif('Token not found in system', 'error');
  }
}

async function processEntry(token) {
  if (typeof api !== 'undefined') {
    await api.processEntry(token);
  }

  const doneEl = document.getElementById('agent-done');
  const pendingEl = document.getElementById('agent-pending');
  const scanInput = document.getElementById('scan-input');
  const result = document.getElementById('verify-result');

  if (doneEl) {
    const n = parseInt(doneEl.textContent) || 0;
    doneEl.textContent = n + 1;
  }
  if (pendingEl) {
    const p = parseInt(pendingEl.textContent) || 0;
    if (p > 0) pendingEl.textContent = p - 1;
  }
  if (result) {
    result.innerHTML = `<div style="background:var(--green-pale);border-radius:var(--radius);padding:.8rem;text-align:center;color:var(--green);font-weight:700">🎉 Entry processed! Farmer may proceed to weighing.</div>`;
  }
  if (scanInput) scanInput.value = '';
  showNotif('Entry allowed for ' + token + ' ✅');
}

async function rejectEntry(token) {
  if (typeof api !== 'undefined') {
    await api.rejectEntry(token, 'Moisture/quality rejection');
  }

  const rejectedEl = document.getElementById('agent-rejected');
  const scanInput = document.getElementById('scan-input');
  const result = document.getElementById('verify-result');

  if (rejectedEl) {
    const r = parseInt(rejectedEl.textContent) || 0;
    rejectedEl.textContent = r + 1;
  }
  if (result) {
    result.innerHTML = `<div style="background:#FFEBEE;border-radius:var(--radius);padding:.8rem;text-align:center;color:var(--danger);font-weight:700">❌ Entry rejected for ${token}.</div>`;
  }
  if (scanInput) scanInput.value = '';
  showNotif('Entry rejected for ' + token, 'error');
}
