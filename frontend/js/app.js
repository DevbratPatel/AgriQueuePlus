// ===== AgriQueue+ | Application Bootstrap =====

function init() {
  buildTicker();
  setDate();
  renderComplaints();
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  init();
  animateStats();
});
