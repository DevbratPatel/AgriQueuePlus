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
