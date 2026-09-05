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

function fillDemoOTP() {
  ['otp1', 'otp2', 'otp3', 'otp4'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.value = ['1', '2', '3', '4'][i];
  });
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
  const otp = ['otp1', 'otp2', 'otp3', 'otp4']
    .map(id => document.getElementById(id) ? document.getElementById(id).value : '')
    .join('');

  if (phone.length < 10) {
    showNotif('Enter valid 10-digit mobile number', 'error');
    return;
  }
  if (otp.length < 4) {
    showNotif('Enter OTP sent to your mobile', 'warning');
    return;
  }

  // Backend API Call with local fallback
  const res = typeof api !== 'undefined' ? await api.login(phone, otp, currentRole) : null;

  if (res && res.success) {
    currentUser = res.user;
  } else if (otp === '1234') {
    // Local fallback
    currentUser = {
      name: currentRole === 'farmer' ? 'Ramesh Kumar' : currentRole === 'admin' ? 'District Officer' : 'Center Agent',
      phone: '+91 ' + phone.slice(0, 5) + ' ' + phone.slice(5),
      avatar: currentRole === 'farmer' ? 'R' : currentRole === 'admin' ? 'A' : 'D',
      role: currentRole
    };
  } else {
    showNotif('Invalid OTP. Use demo OTP: 1234', 'error');
    return;
  }

  showNotif('Login successful! Welcome back 🎉');
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
      state
    };
  }

  showNotif('Registered successfully! 🎉');
  setTimeout(() => launchApp(), 600);
}

function launchApp() {
  if (currentRole === 'farmer') {
    const fAvatar = document.getElementById('farmer-avatar');
    const fUname = document.getElementById('farmer-uname');
    const pAvatar = document.getElementById('profile-avatar-big');
    const pName = document.getElementById('profile-name');
    const pPhone = document.getElementById('profile-phone');

    if (fAvatar) fAvatar.textContent = currentUser.avatar;
    if (fUname) fUname.textContent = currentUser.name.split(' ')[0];
    if (pAvatar) pAvatar.textContent = currentUser.avatar;
    if (pName) pName.textContent = currentUser.name;
    if (pPhone) pPhone.textContent = currentUser.phone;

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
  showScreen('landing');
  bookingStep = 1;
  selectedSlot = '';
  selectedVehicle = '';
  selectedCenter = 0;
}
