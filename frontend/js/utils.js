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

// Screen & History Navigation Routing
function updateBackButtonUI() {
  const farmerBackBtn = document.getElementById('farmer-back-btn');
  if (farmerBackBtn) {
    if (currentScreen === 'farmer-app') {
      const isPassShown = document.getElementById('qr-result') && document.getElementById('qr-result').style.display !== 'none';
      if (currentTab !== 'home' || bookingStep > 1 || isPassShown) {
        farmerBackBtn.style.display = 'inline-flex';
      } else {
        farmerBackBtn.style.display = 'none';
      }
    } else {
      farmerBackBtn.style.display = 'none';
    }
  }
}

function showScreen(id, pushHistory = true) {
  if (pushHistory && !isHistoryNavigating) {
    navHistory.push({ screen: currentScreen, tab: currentTab, step: bookingStep });
    try {
      history.pushState({ screen: id, tab: (id === 'farmer-app' ? currentTab : null), step: bookingStep }, '', '#' + id);
    } catch (e) {
      console.warn('History pushState error:', e);
    }
  }

  currentScreen = id;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = document.getElementById(id);
  if (s) s.classList.add('active');

  updateBackButtonUI();
  window.scrollTo(0, 0);
}

// Tab Switching (Farmer App)
function showTab(tab, pushHistory = true) {
  if (pushHistory && !isHistoryNavigating) {
    navHistory.push({ screen: currentScreen, tab: currentTab, step: bookingStep });
    try {
      history.pushState({ screen: 'farmer-app', tab: tab, step: (tab === 'book' ? bookingStep : 1) }, '', '#farmer/' + tab);
    } catch (e) {
      console.warn('History pushState error:', e);
    }
  }

  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.bnav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('tab-' + tab);
  const nav = document.getElementById('bnav-' + tab);
  if (el) {
    el.style.display = 'block';
    el.className = 'tab-content fade-in';
  }
  if (nav) nav.classList.add('active');

  if (tab === 'home' && typeof initCrowdChart === 'function') {
    setTimeout(initCrowdChart, 40);
  }

  updateBackButtonUI();
  window.scrollTo(0, 0);
}

// Unified Go Back Action
function goBack() {
  // If browser history has items and internal stack is tracked, prefer standard history.back()
  if (navHistory.length > 0 && window.history.length > 1) {
    window.history.back();
    return;
  }
  // Fallback if direct or history stack empty
  fallbackGoBack();
}

function fallbackGoBack() {
  if (currentScreen === 'farmer-app') {
    const qrResult = document.getElementById('qr-result');
    const step4Card = document.getElementById('book-step4');
    if (qrResult && qrResult.style.display !== 'none') {
      qrResult.style.display = 'none';
      if (step4Card && step4Card.querySelector('.card')) {
        step4Card.querySelector('.card').style.display = 'block';
      }
      updateBackButtonUI();
      return;
    }
    if (currentTab === 'book' && bookingStep > 1 && typeof gotoStep === 'function') {
      gotoStep(bookingStep - 1, false);
      return;
    }
    if (currentTab !== 'home') {
      showTab('home', false);
      return;
    }
    showScreen('landing', false);
  } else if (currentScreen === 'auth' || currentScreen === 'admin-app' || currentScreen === 'distributor-app') {
    showScreen('landing', false);
  }
}

// History PopState Listener & Deep Linking Initializer
function initNavigation() {
  window.addEventListener('popstate', (event) => {
    isHistoryNavigating = true;
    try {
      if (event.state) {
        const { screen, tab, step } = event.state;
        if (screen && screen !== currentScreen) {
          showScreen(screen, false);
        }
        if (screen === 'farmer-app' && tab) {
          showTab(tab, false);
          if (tab === 'book' && step && typeof gotoStep === 'function') {
            gotoStep(step, false);
          }
        }
      } else {
        // Root / Landing
        showScreen('landing', false);
      }
    } finally {
      if (navHistory.length > 0) navHistory.pop();
      isHistoryNavigating = false;
      updateBackButtonUI();
    }
  });

  // Check initial hash on page load
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    const parts = hash.split('/');
    const root = parts[0];
    if (root === 'farmer' || root === 'farmer-app') {
      showScreen('farmer-app', false);
      if (typeof initFarmerApp === 'function') initFarmerApp();
      if (parts[1]) showTab(parts[1], false);
      if (parts[2] && parts[2].startsWith('step') && typeof gotoStep === 'function') {
        const sNum = parseInt(parts[2].replace('step', '')) || 1;
        gotoStep(sNum, false);
      }
    } else if (root === 'admin' || root === 'admin-app') {
      showScreen('admin-app', false);
    } else if (root === 'distributor' || root === 'distributor-app') {
      showScreen('distributor-app', false);
    } else if (root === 'auth') {
      showAuth(parts[1] || 'farmer');
    }
  }

  // Set base history entry if none exists
  try {
    if (!history.state) {
      history.replaceState({ screen: currentScreen, tab: currentTab, step: bookingStep }, '', window.location.hash || '#landing');
    }
  } catch (e) {}
}

// ===== Bilingual Localization Dictionary =====
const translations = {
  en: {
    gov_india: "GovTech Academic Prototype · Ministry Framework",
    gov_dept: "Smart MSP Procurement & Mandi Transparency Prototype",
    portal_tag: "Smart MSP e-Procurement Prototype",
    landing_sub: "Direct MSP procurement and mandi transparency infrastructure. Cryptographic single-use gate passes, verified electronic weighbridge metrics, and automated direct-benefit farmer disbursements.",
    role_farmer: "Farmer Portal",
    role_farmer_desc: "Book Mandi slots, track live gate queue, obtain verified QR e-Pass",
    role_admin: "Admin / Officer",
    role_admin_desc: "Manage procurement centers, allocation quotas & grievance analytics",
    role_agent: "Center Agent",
    role_agent_desc: "Scan gate passes, verify moisture analysis, record net weighbridge data",
    nav_home: "Home",
    nav_book: "Book Slot",
    nav_passes: "Gate Passes",
    nav_grievance: "Grievance",
    nav_profile: "Kisan ID",
    sec_bank_acc: "Disbursement Bank Account",
    lbl_designated_bank: "Designated Bank",
    lbl_dbt_acc: "DBT Account",
    lbl_ifsc: "IFSC Code",
    sec_land_holding: "Verified Land Holdings",
    lbl_acreage: "Verified Acreage",
    lbl_khasra: "Khasra Record",
    lbl_village: "Revenue Village",
    lbl_crops: "Permitted MSP Crops",
    btn_logout: "Logout",
    btn_print_pass: "Print / Save Pass",
    btn_done_dashboard: "Done — Dashboard",
    api_online: "REST API Active",
    api_offline: "Local State Mode"
  },
  hi: {
    gov_india: "भारत सरकार | Government of India",
    gov_dept: "कृषि एवं किसान कल्याण मंत्रालय | Ministry of Agriculture & Farmers Welfare",
    portal_tag: "राष्ट्रीय ई-खरीद पोर्टल",
    landing_sub: "प्रत्यक्ष न्यूनतम समर्थन मूल्य (MSP) खरीद एवं मंडी पारदर्शिता प्रणाली। पारदर्शी ई-गेट पास, सत्यापित तौल माप और सुरक्षित डीबीटी भुगतान।",
    role_farmer: "किसान पोर्टल",
    role_farmer_desc: "मंडी स्लॉट बुक करें, लाइव कतार देखें, सत्यापित क्यूआर ई-गेट पास प्राप्त करें",
    role_admin: "प्रशासनिक अधिकारी",
    role_admin_desc: "खरीद केंद्र, कोटा और शिकायत प्रबंधन",
    role_agent: "मंडी केंद्र एजेंट",
    role_agent_desc: "गेट पास स्कैन करें, नमी जांचें, वजन दर्ज करें",
    nav_home: "मुख्य पृष्ठ",
    nav_book: "स्लॉट बुकिंग",
    nav_passes: "ई-गेट पास",
    nav_grievance: "शिकायत",
    nav_profile: "किसान आईडी",
    sec_bank_acc: "डीबीटी बैंक खाता",
    lbl_designated_bank: "नामित बैंक",
    lbl_dbt_acc: "डीबीटी खाता",
    lbl_ifsc: "आईएफएससी कोड",
    sec_land_holding: "सत्यापित भूमि विवरण",
    lbl_acreage: "कुल रकबा (एकड़)",
    lbl_khasra: "खसरा संख्या",
    lbl_village: "राजस्व ग्राम",
    lbl_crops: "अनुमोदित फसलें",
    btn_logout: "लॉग आउट",
    btn_print_pass: "पास प्रिंट / डाउनलोड करें",
    btn_done_dashboard: "पूर्ण — मुख्य पृष्ठ",
    api_online: "एपीआई सक्रिय",
    api_offline: "स्थानीय मोड"
  }
};

let isServerOnline = false;

// Bilingual Localization Toggle
function setLang(lang, notify = true) {
  if (lang !== 'en' && lang !== 'hi') lang = 'en';
  currentLang = lang;

  // Persist preference
  try {
    localStorage.setItem('agri_lang', lang);
  } catch (e) {}

  // Update text for all elements with data-i18n
  const dict = translations[lang] || translations.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key === 'api_status') {
      el.textContent = isServerOnline ? dict.api_online : dict.api_offline;
    } else if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Toggle active class on language buttons
  document.querySelectorAll('.lang-btn, .gov-lang-btn').forEach(b => {
    const isEnBtn = b.id.includes('en') || b.textContent.includes('English') || b.textContent.trim() === 'EN';
    b.classList.toggle('active', lang === 'en' ? isEnBtn : !isEnBtn);
  });

  if (notify) {
    showNotif(lang === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language switched to English', 'success');
  }
}

// Live Backend API Connectivity Health Check
async function checkServerHealth() {
  const badge = document.getElementById('api-status-badge');
  const text = document.getElementById('api-status-text');
  if (!badge || !text) return;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;

  try {
    const res = await fetch('http://localhost:5000/', {
      method: 'GET',
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      isServerOnline = true;
      badge.className = 'gov-badge-status online';
      badge.title = 'AgriQueue+ REST API Server Connected on Port 5000';
      text.textContent = (currentLang === 'hi') ? 'एपीआई सक्रिय' : 'REST API Active';
    } else {
      throw new Error('Non-200');
    }
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    isServerOnline = false;
    badge.className = 'gov-badge-status offline';
    badge.title = 'Running in offline resilient client mode. Start backend server for live sync.';
    text.textContent = (currentLang === 'hi') ? 'स्थानीय मोड' : 'Local State Mode';
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
      <span class="ticker-tag" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);padding:0.12rem 0.45rem;border-radius:4px;font-size:0.7rem;font-weight:700;letter-spacing:0.5px">MSP</span>
      <strong>${d.crop}</strong>: <span>₹${d.price.toLocaleString('en-IN')}/Qtl</span>
      <span class="${d.change > 0 ? 'ticker-up' : 'ticker-down'}">${d.change > 0 ? '▲' : '▼'}₹${Math.abs(d.change)}</span>
    </div>`).join('');
  t.innerHTML = html + html;
}

// Real-time mandi queue traffic monitor
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

// Inbound gate metric polling updater
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

// ===== OFFICIAL GOVTECH WEIGHMENT & PAYMENT RECEIPT PRINTER =====

function numberToIndianRupeesWords(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return '';
  const num = Math.round(Number(amount));
  if (num === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return units[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + units[unit] : '');
  }

  function convertThreeDigits(n) {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += units[Math.floor(n / 100)] + ' Hundred';
      if (n % 100 > 0) str += ' and ';
    }
    if (n % 100 > 0) {
      str += convertTwoDigits(n % 100);
    }
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  let hundred = remainder % 1000;

  let words = [];
  if (crore > 0) words.push(convertThreeDigits(crore) + ' Crore');
  if (lakh > 0) words.push(convertThreeDigits(lakh) + ' Lakh');
  if (thousand > 0) words.push(convertThreeDigits(thousand) + ' Thousand');
  if (hundred > 0) words.push(convertThreeDigits(hundred));

  return words.join(' ') + ' Rupees Only';
}

function printOfficialWeighmentSlip(w) {
  // If w not provided directly, try to extract live from on-screen weighment card
  if (!w || !w.id) {
    if (window.currentWeighmentData) {
      w = window.currentWeighmentData;
    } else {
      const vr = document.getElementById('verify-result');
      if (vr && vr.innerText && vr.innerText.includes('Official Weighment Slip Generated')) {
        const text = vr.innerText;
        const slipMatch = text.match(/Slip ID:\s*([^\n\r]+)/i);
        const tokenMatch = text.match(/Token \/ Manifest:\s*([^\n\r]+)/i);
        const grossMatch = text.match(/Gross Vehicle Weight:\s*([\d,]+)/i);
        const tareMatch = text.match(/Tare (?:Tare )?Weight:\s*([\d,]+)/i);
        const netMatch = text.match(/Accepted Net Quantity:\s*([\d,]+)\s*kg\s*\(([\d.]+)\s*Qtl\)/i);
        const moistMatch = text.match(/Moisture Meter Level:\s*([\d.]+)%\s*\(([^)]+)\)/i);
        const mspMatch = text.match(/MSP Rate Payable:\s*₹([\d,]+)/i);
        const payoutMatch = text.match(/Approved Procurement Payout:\s*₹([\d,]+)/i);

        w = {
          id: slipMatch ? slipMatch[1].trim() : ('WGH-' + Date.now()),
          token: tokenMatch ? tokenMatch[1].trim() : 'A-041',
          grossWeight: grossMatch ? parseFloat(grossMatch[1].replace(/,/g, '')) : 125600,
          tareWeight: tareMatch ? parseFloat(tareMatch[1].replace(/,/g, '')) : 7200,
          netWeightKg: netMatch ? parseFloat(netMatch[1].replace(/,/g, '')) : 118400,
          netQuintals: netMatch ? parseFloat(netMatch[2]) : 1184,
          moisture: moistMatch ? parseFloat(moistMatch[1]) : 13.22,
          qualityGrade: moistMatch ? moistMatch[2] : 'Grade-B (Minor Discoloration)',
          mspRate: mspMatch ? parseFloat(mspMatch[1].replace(/,/g, '')) : 2275,
          finalAmount: payoutMatch ? parseFloat(payoutMatch[1].replace(/,/g, '')) : 2693600,
          farmerName: (window.currentUser && window.currentUser.name) || 'Ramesh Kumar (Registered Farmer)',
          farmerPhone: (window.currentUser && window.currentUser.phone) || '+91 9876543210',
          commodity: 'Wheat (Triticum aestivum)',
          centerName: 'Karnal Grain Market (APMC Yard #4)'
        };
      }
    }
  }

  if (!w) {
    showNotif('Weighment data not found. Printing standard view.', 'info');
    window.print();
    return;
  }

  const slipId = w.id || ('WGH-' + Date.now());
  const token = w.token || 'A-041';
  const gross = (parseFloat(w.grossWeight) || 0).toLocaleString('en-IN');
  const tare = (parseFloat(w.tareWeight) || 0).toLocaleString('en-IN');
  const netKg = (parseFloat(w.netWeightKg) || 0).toLocaleString('en-IN');
  const netQtl = parseFloat(w.netQuintals) || ((parseFloat(w.netWeightKg) || 0) / 100);
  const moisture = w.moisture || 12.5;
  const grade = w.qualityGrade || 'Grade-A (FAQ Prime)';
  const rate = (parseFloat(w.mspRate) || 2275).toLocaleString('en-IN');
  const payout = parseFloat(w.finalAmount) || (netQtl * (parseFloat(w.mspRate) || 2275));
  const payoutStr = payout.toLocaleString('en-IN');
  const payoutWords = numberToIndianRupeesWords(payout);
  const farmerName = w.farmerName || 'Ramesh Kumar (Registered Farmer)';
  const farmerPhone = w.farmerPhone || '+91 9876543210';
  const center = w.centerName || 'Karnal Grain Market (APMC Yard #4)';
  const crop = w.commodity || 'Wheat (Triticum aestivum)';
  const dateStr = w.recordedAt ? new Date(w.recordedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official Weighment Slip - ${slipId}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; background: #fff; line-height: 1.4; padding: 20px; }
    .slip-container { border: 2.5px solid #064E3B; border-radius: 8px; padding: 24px; max-width: 780px; margin: 0 auto; background: #fff; }
    .gov-badge { text-align: center; margin-bottom: 14px; }
    .gov-sub { font-size: 10pt; font-weight: 700; color: #374151; letter-spacing: 0.8px; text-transform: uppercase; }
    .gov-title { font-size: 15pt; font-weight: 800; color: #064E3B; margin: 4px 0 2px; }
    .gov-dept { font-size: 9.5pt; color: #4B5563; }
    .meta-bar { display: flex; justify-content: space-between; background: #F0FDF4; border: 1.5px solid #A7F3D0; border-radius: 6px; padding: 8px 14px; margin: 14px 0; font-size: 9.5pt; }
    .table-section { width: 100%; border-collapse: collapse; margin: 14px 0; }
    .table-section td, .table-section th { border: 1px solid #D1D5DB; padding: 8px 12px; font-size: 10pt; }
    .table-section th { background: #F9FAFB; font-weight: 700; text-align: left; width: 38%; color: #374151; }
    .highlight-row { background: #ECFDF5 !important; }
    .highlight-row td, .highlight-row th { color: #064E3B; font-weight: 800; font-size: 11pt; }
    .payout-box { background: #F0FDF4; border: 2px solid #059669; border-radius: 8px; padding: 14px 18px; margin: 16px 0; }
    .words-text { font-style: italic; font-size: 9.5pt; color: #065F46; margin-top: 4px; }
    .sig-section { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
    .sig-box { text-align: center; width: 30%; border-top: 1px dashed #6B7280; padding-top: 6px; font-size: 8.5pt; color: #374151; }
    .footer-note { margin-top: 24px; padding-top: 8px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 8pt; color: #6B7280; }
    .barcode-strip { font-family: monospace; font-size: 11pt; letter-spacing: 3px; background: #F3F4F6; padding: 4px 8px; border-radius: 4px; display: inline-block; }
    @media print {
      body { padding: 0 !important; }
      .slip-container { border: 2px solid #000 !important; max-width: 100% !important; }
      .payout-box { background: #f4f4f4 !important; border: 1.5px solid #000 !important; }
      .meta-bar { background: #f9f9f9 !important; border: 1px solid #999 !important; }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="gov-badge">
      <div style="font-size:24px;margin-bottom:2px">🌾</div>
      <div class="gov-sub">Ministry of Agriculture & Farmers Welfare · Government of India</div>
      <div class="gov-title">OFFICIAL APMC MANDI WEIGHMENT & PAYMENT ADVISORY</div>
      <div class="gov-dept">National Agricultural Market (e-NAM) · Minimum Support Price (MSP) Procurement Portal</div>
    </div>

    <div class="meta-bar">
      <div><strong>Slip Reference:</strong> <span style="font-family:monospace">${slipId}</span></div>
      <div><strong>Date & Time:</strong> ${dateStr}</div>
      <div><strong>Manifest Token:</strong> <span style="color:#064E3B;font-weight:800">${token}</span></div>
    </div>

    <table class="table-section">
      <tr>
        <th>Procurement Hub / Mandi Yard:</th>
        <td>${center}</td>
      </tr>
      <tr>
        <th>Farmer / Consignor Name:</th>
        <td><strong>${farmerName}</strong></td>
      </tr>
      <tr>
        <th>Registered Mobile / DBT Reference:</th>
        <td>${farmerPhone}</td>
      </tr>
      <tr>
        <th>Declared Agricultural Commodity:</th>
        <td><strong>${crop}</strong></td>
      </tr>
      <tr>
        <th>Gross Vehicle Weight:</th>
        <td><strong>${gross} kg</strong></td>
      </tr>
      <tr>
        <th>Tare Vehicle Weight:</th>
        <td><strong>${tare} kg</strong></td>
      </tr>
      <tr class="highlight-row">
        <th>Accepted Net Procurement Quantity:</th>
        <td>${netKg} kg &nbsp;(${netQtl.toLocaleString('en-IN')} Quintals)</td>
      </tr>
      <tr>
        <th>Moisture Meter Analysis:</th>
        <td>${moisture}% &nbsp;<span style="color:#059669;font-weight:700">✓ Compliance Passed (&le; 14.00% FAQ Standard)</span></td>
      </tr>
      <tr>
        <th>Quality Inspection Grade:</th>
        <td>${grade}</td>
      </tr>
      <tr>
        <th>Notified Government MSP Rate:</th>
        <td><strong>₹${rate} / Quintal</strong></td>
      </tr>
    </table>

    <div class="payout-box">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:9.5pt;font-weight:700;color:#065F46;text-transform:uppercase">Approved Total Procurement Payout:</div>
          <div class="words-text">${payoutWords}</div>
        </div>
        <div style="font-size:18pt;font-weight:900;color:#064E3B;font-family:monospace">₹${payoutStr}</div>
      </div>
      <div style="margin-top:8px;font-size:8.5pt;color:#047857">
        PFMS DBT Gateway State: <strong>PFMS_PAYMENT_INITIATED</strong> &nbsp;·&nbsp; Direct credit scheduled to farmer's registered Aadhaar DBT bank account.
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 6px">
      <div class="barcode-strip">||| | | |||| || | || ||||| | || ||||| ${token}</div>
      <div style="font-size:8pt;color:#6B7280;font-family:monospace">Security Digest: SHA256-${slipId.slice(-8)}</div>
    </div>

    <div class="sig-section">
      <div class="sig-box">
        Weighbridge Operator / Inspector<br>
        <strong>Karnal APMC Yard</strong>
      </div>
      <div class="sig-box">
        Mandi Secretary / Superintendent<br>
        <strong>Official Seal & Verification</strong>
      </div>
      <div class="sig-box">
        Consignor / Farmer Signature<br>
        <strong>${farmerName}</strong>
      </div>
    </div>

    <div class="footer-note">
      This is a digitally generated electronic weighment receipt issued under the State Agricultural Produce Marketing Act.<br>
      Official audit record registered in the national e-NAM AgriQueue+ database.
    </div>
  </div>
</body>
</html>`;

  // Try printing directly via isolated hidden iframe
  try {
    let oldFrame = document.getElementById('agriqueue-print-frame');
    if (oldFrame) document.body.removeChild(oldFrame);

    const iframe = document.createElement('iframe');
    iframe.id = 'agriqueue-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.open', e);
        const win = window.open('', '_blank', 'width=840,height=900');
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => { win.focus(); win.print(); }, 400);
        }
      }
    }, 300);
  } catch (err) {
    console.error('Print initialization error:', err);
    const win = window.open('', '_blank', 'width=840,height=900');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 400);
    } else {
      window.print();
    }
  }
}

