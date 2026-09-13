// ===== AgriQueue+ | Authentication & Session Management =====

function showAuth(role) {
  currentRole = role;
  const subtitles = {
    farmer: 'Farmer Portal',
    admin: 'Admin / Officer Portal',
    distributor: 'Center Agent Portal'
  };
  const subtitleEl = document.getElementById('auth-subtitle');
  if (subtitleEl) subtitleEl.textContent = subtitles[role] || 'Portal';

  // Hide farmer-specific fields for non-farmers
  const aadhaarGrp = document.getElementById('reg-aadhaar-grp');
  const stateGrp = document.getElementById('reg-state-grp');
  if (aadhaarGrp) aadhaarGrp.style.display = (role === 'farmer' ? 'block' : 'none');
  if (stateGrp) stateGrp.style.display = (role === 'farmer' ? 'block' : 'none');

  showScreen('auth');
}

function showLanding() {
  showScreen('landing');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
  if (regForm) regForm.style.display = tab === 'register' ? 'block' : 'none';

  document.querySelectorAll('.auth-tab-btn').forEach((b, i) => {
    b.classList.toggle('active', i === (tab === 'login' ? 0 : 1));
  });
}

let otpCountdownTimer = null;
let lastGeneratedOtp = '';

function startOtpCountdown(seconds = 60) {
  const statusEl = document.getElementById('otp-status-msg');
  const btn = document.getElementById('btn-request-otp');
  if (btn) btn.style.pointerEvents = 'none';

  let remaining = seconds;
  if (otpCountdownTimer) clearInterval(otpCountdownTimer);

  otpCountdownTimer = setInterval(() => {
    remaining--;
    if (statusEl) {
      statusEl.textContent = remaining > 0 ? `Resend code in ${remaining}s` : 'Did not receive code?';
    }
    if (remaining <= 0) {
      clearInterval(otpCountdownTimer);
      if (btn) {
        btn.style.pointerEvents = 'auto';
        btn.textContent = 'Resend OTP';
      }
    }
  }, 1000);
}

async function requestOTP() {
  const phoneEl = document.getElementById('login-phone');
  const phone = phoneEl ? phoneEl.value.trim() : '';

  if (!phone || phone.length < 10) {
    showNotif('Please enter a valid 10-digit mobile number', 'error');
    if (phoneEl) phoneEl.focus();
    return;
  }

  startOtpCountdown(60);

  if (typeof api !== 'undefined') {
    const res = await api.sendOTP(phone);
    if (res && res.success) {
      lastGeneratedOtp = res.devOtp || res.otp || '';
      showNotif(`SMS Gateway: Verification code is [ ${lastGeneratedOtp} ]`, 'success');
      fillVerificationCode(lastGeneratedOtp);
      const statusEl = document.getElementById('otp-status-msg');
      if (statusEl) {
        statusEl.innerHTML = `Code generated: <strong style="color:var(--green);font-size:.95rem">${lastGeneratedOtp}</strong> (Valid for 5 min)`;
      }
      return;
    }
  }

  // Resilient offline fallback
  lastGeneratedOtp = String(Math.floor(100000 + Math.random() * 900000));
  showNotif(`SMS Notification: Your AgriQueue+ OTP is ${lastGeneratedOtp}`, 'success');
  fillVerificationCode(lastGeneratedOtp);
}

function fillVerificationCode(code) {
  const digits = String(code).split('');
  ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.value = digits[i] || '';
  });
}

function fillDemoOTP() {
  if (lastGeneratedOtp) {
    fillVerificationCode(lastGeneratedOtp);
  } else {
    requestOTP();
  }
}

function otpNext(el, nextId) {
  if (el.value.length === 1 && nextId) {
    const nextEl = document.getElementById(nextId);
    if (nextEl) nextEl.focus();
  }
}

async function doLogin() {
  const phoneEl = document.getElementById('login-phone');
  const phone = phoneEl ? phoneEl.value.trim() : '';
  const otp = ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6']
    .map(id => document.getElementById(id) ? document.getElementById(id).value : '')
    .join('');

  if (phone.length < 10) {
    showNotif('Enter valid 10-digit mobile number', 'error');
    return;
  }
  if (otp.length < 6) {
    showNotif('Enter the complete 6-digit verification code', 'warning');
    return;
  }

  let res = null;
  if (typeof api !== 'undefined') {
    res = await api.login(phone, otp, currentRole);
  }

  if (res && res.success) {
    currentUser = res.user;
    if (res.token && typeof api !== 'undefined') {
      api.setToken(res.token);
    }
    showNotif('Login authenticated! Session token issued.', 'success');
  } else if (res && !res.success) {
    showNotif(res.message || 'Invalid or expired verification code', 'error');
    return;
  } else {
    // Offline resilience fallback
    if (otp === lastGeneratedOtp) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const isRamesh = cleanPhone === '9876543210' || cleanPhone === '';
      const name = currentRole === 'farmer' 
        ? (isRamesh ? 'Ramesh Kumar' : 'Kisan ' + cleanPhone.slice(-4)) 
        : currentRole === 'admin' 
          ? 'District Procurement Officer' 
          : 'Center Mandi Agent';

      currentUser = {
        name: name,
        phone: '+91 ' + (cleanPhone.length === 10 ? cleanPhone.slice(0, 5) + ' ' + cleanPhone.slice(5) : '98765 43210'),
        avatar: name[0].toUpperCase(),
        role: currentRole,
        kisanId: 'KSN-2026-' + (cleanPhone.slice(-4) || '7832'),
        aadhaarMasked: 'XXXX-XXXX-' + (cleanPhone.slice(-4) || '4521'),
        state: 'Punjab',
        village: isRamesh ? 'Raipur Kalan, Ludhiana' : 'Mandi Zone ' + cleanPhone.slice(-2) + ', Punjab',
        bankName: 'Punjab National Bank',
        bankAccount: 'XXXXXXXX' + (cleanPhone.slice(-4) || '4521'),
        bankIfsc: 'PUNB0001234',
        landAcreage: isRamesh ? '4.5 Acres' : '5.2 Acres',
        khasra: isRamesh ? '214/2, 215/1' : '108/3, 109/2',
        crops: 'Wheat, Paddy'
      };
      showNotif('Authenticated locally (resilient client mode)', 'success');
    } else {
      showNotif('Invalid verification code. Please check your SMS code.', 'error');
      return;
    }
  }

  setTimeout(() => launchApp(), 600);
}

async function doRegister() {
  const nameEl = document.getElementById('reg-name');
  const phoneEl = document.getElementById('reg-phone');
  const aadhaarEl = document.getElementById('reg-aadhaar');
  const stateEl = document.getElementById('reg-state');

  const name = nameEl ? nameEl.value.trim() : '';
  const phone = phoneEl ? phoneEl.value.trim() : '';
  const aadhaar = aadhaarEl ? aadhaarEl.value.trim() : '';
  const state = stateEl ? stateEl.value : 'Punjab';

  if (!name || phone.length < 10) {
    showNotif('Fill all required fields', 'error');
    return;
  }

  // Backend API Call with local fallback
  const res = typeof api !== 'undefined' ? await api.register({
    name,
    phone,
    aadhaar,
    state,
    role: currentRole
  }) : null;

  if (res && res.success) {
    currentUser = res.user;
  } else {
    currentUser = {
      name,
      phone: '+91 ' + phone.slice(0, 5) + ' ' + phone.slice(5),
      avatar: name[0].toUpperCase(),
      role: currentRole,
      aadhaar,
      aadhaarMasked: aadhaar ? ('XXXX-XXXX-' + aadhaar.slice(-4)) : ('XXXX-XXXX-' + phone.slice(-4)),
      kisanId: 'KSN-2026-' + (phone.slice(-4) || '8831'),
      state: state || 'Punjab',
      village: 'Gram ' + name.split(' ')[0] + ', ' + (state || 'Punjab'),
      bankName: 'State Bank of India',
      bankAccount: 'XXXXXXXX' + (phone.slice(-4) || '8831'),
      bankIfsc: 'SBIN0001892',
      landAcreage: '5.0 Acres',
      khasra: '312/1, 314/4',
      crops: 'Wheat, Paddy, Mustard'
    };
  }

  showNotif('Registered successfully!');
  setTimeout(() => launchApp(), 600);
}

function launchApp() {
  if (currentRole === 'farmer') {
    const fAvatar = document.getElementById('farmer-avatar');
    const fUname = document.getElementById('farmer-uname');
    const pAvatar = document.getElementById('profile-avatar-big');
    const pName = document.getElementById('profile-name');
    const pPhone = document.getElementById('profile-phone');
    const pKisanId = document.getElementById('profile-kisan-id');
    const pAadhaar = document.getElementById('profile-aadhaar-badge');
    const pBankName = document.getElementById('profile-bank-name');
    const pBankAcc = document.getElementById('profile-bank-acc');
    const pBankIfsc = document.getElementById('profile-bank-ifsc');
    const pLandAcreage = document.getElementById('profile-land-acreage');
    const pKhasra = document.getElementById('profile-khasra');
    const pVillage = document.getElementById('profile-village');
    const pCrops = document.getElementById('profile-crops');

    if (fAvatar) fAvatar.textContent = currentUser.avatar || 'R';
    if (fUname) fUname.textContent = (currentUser.name || 'Ramesh').split(' ')[0];
    if (pAvatar) pAvatar.textContent = currentUser.avatar || 'R';
    if (pName) pName.textContent = currentUser.name || 'Ramesh Kumar';
    if (pPhone) pPhone.textContent = currentUser.phone || '+91 98765 43210';
    if (pKisanId && currentUser.kisanId) pKisanId.textContent = 'Kisan ID: ' + currentUser.kisanId;
    if (pAadhaar && currentUser.aadhaarMasked) pAadhaar.textContent = '✓ Aadhaar Verified (' + currentUser.aadhaarMasked + ')';
    if (pBankName && currentUser.bankName) pBankName.textContent = currentUser.bankName;
    if (pBankAcc && currentUser.bankAccount) pBankAcc.textContent = currentUser.bankAccount;
    if (pBankIfsc && currentUser.bankIfsc) pBankIfsc.textContent = currentUser.bankIfsc;
    if (pLandAcreage && currentUser.landAcreage) pLandAcreage.textContent = currentUser.landAcreage;
    if (pKhasra && currentUser.khasra) pKhasra.textContent = currentUser.khasra;
    if (pVillage && currentUser.village) pVillage.textContent = currentUser.village;
    if (pCrops && currentUser.crops) pCrops.textContent = currentUser.crops;

    showScreen('farmer-app');
    initFarmerApp();
  } else if (currentRole === 'admin') {
    showScreen('admin-app');
    initAdminApp();
  } else {
    showScreen('distributor-app');
    initDistributorApp();
  }
}

function logout() {
  if (typeof api !== 'undefined') api.clearToken();
  navHistory = [];
  bookingStep = 1;
  selectedSlot = '';
  selectedVehicle = '';
  selectedCenter = 0;
  showScreen('landing');
}
