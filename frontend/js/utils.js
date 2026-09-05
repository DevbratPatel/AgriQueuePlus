// ===== AgriQueue+ | Shared UI Utilities =====

// Toast Notifications
function showNotif(msg, type = 'success') {
  const el = document.getElementById('notif');
  if (!el) return;
  document.getElementById('notif-msg').textContent = msg;
  el.className = 'notif show' + (type !== 'success' ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3200);
}

// Screen Routing
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = document.getElementById(id);
  if (s) s.classList.add('active');
}

// Tab Switching (Farmer App)
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.bnav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('tab-' + tab);
  const nav = document.getElementById('bnav-' + tab);
  if (el) {
    el.style.display = 'block';
    el.className = 'tab-content fade-in';
  }
  if (nav) nav.classList.add('active');
  window.scrollTo(0, 0);
}

// Language Toggle
function setLang(l) {
  currentLang = l;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.includes(l === 'en' ? 'English' : 'हिंदी'));
  });
  if (l === 'hi') {
    showNotif('हिंदी सपोर्ट जल्द आ रहा है 🙏');
  }
}

// Default Date Initializer
function setDate() {
  const today = new Date();
  const inp = document.getElementById('sel-date');
  if (inp) inp.value = today.toISOString().split('T')[0];
  const cmpDate = document.getElementById('cmp-date');
  if (cmpDate) cmpDate.value = today.toISOString().split('T')[0];
}

// Live MSP Marquee Ticker Builder
function buildTicker() {
  const t = document.getElementById('ticker');
  if (!t) return;
  let html = mspData.map(d => `
    <div class="ticker-item">
      ${d.icon} <strong>${d.crop}</strong>: <span>₹${d.price.toLocaleString()}/Qtl</span>
      <span class="${d.change > 0 ? 'ticker-up' : 'ticker-down'}">${d.change > 0 ? '▲' : '▼'}₹${Math.abs(d.change)}</span>
    </div>`).join('');
  t.innerHTML = html + html;
}

// Real-Time Queue Animation Simulator
function animateQueue() {
  setInterval(() => {
    const pct1 = Math.max(30, Math.min(95, 78 + Math.floor(Math.random() * 10 - 5)));
    const pct2 = Math.max(5, Math.min(60, 24 + Math.floor(Math.random() * 8 - 4)));
    const bar1 = document.getElementById('queue-bar-1');
    const bar2 = document.getElementById('queue-bar-2');
    const pctEl1 = document.getElementById('queue-pct-1');
    const pctEl2 = document.getElementById('queue-pct-2');
    if (bar1 && pctEl1) {
      bar1.style.width = pct1 + '%';
      pctEl1.textContent = `High — ${pct1}%`;
    }
    if (bar2 && pctEl2) {
      bar2.style.width = pct2 + '%';
      pctEl2.textContent = `Low — ${pct2}%`;
      pctEl2.style.color = pct2 < 30 ? '#43A047' : pct2 < 60 ? '#FFA000' : '#E53935';
    }
  }, 4000);
}

// Live Dashboard Stats Simulator
function animateStats() {
  setInterval(() => {
    const slots = document.getElementById('stat-slots');
    const wait = document.getElementById('stat-wait');
    if (slots) {
      const v = parseInt(slots.textContent.replace(',', '')) || 847;
      slots.textContent = (v + Math.floor(Math.random() * 4 - 2)).toLocaleString();
    }
    if (wait) {
      const times = ['~14 min', '~18 min', '~22 min', '~16 min', '~20 min', '~12 min'];
      wait.textContent = times[Math.floor(Math.random() * times.length)];
    }
  }, 5000);
}
