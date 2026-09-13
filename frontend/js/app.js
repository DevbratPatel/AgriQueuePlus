// ===== AgriQueue+ | Application Bootstrap =====

function init() {
  buildTicker();
  setDate();
  renderComplaints();
  initNavigation();

  // Restore saved language preference
  let savedLang = 'en';
  try {
    savedLang = localStorage.getItem('agri_lang') || 'en';
  } catch (e) {}
  setLang(savedLang, false);

  // Check backend server health and poll periodically
  checkServerHealth();
  setInterval(checkServerHealth, 25000);
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  init();
  animateStats();
});
