// ===== AgriQueue+ | Admin & Officer Portal Logic =====

async function initAdminApp() {
  // Fetch overview & live stats from backend
  if (typeof api !== 'undefined') {
    const ov = await api.getAdminOverview();
    if (ov && ov.success && ov.data) {
      const tEl = document.getElementById('adm-total');
      const pEl = document.getElementById('adm-processed');
      const cEl = document.getElementById('adm-complaints');
      if (tEl) tEl.textContent = ov.data.totalFarmersToday.toLocaleString();
      if (pEl) pEl.textContent = ov.data.slotsProcessed.toLocaleString();
      if (cEl) cEl.textContent = ov.data.pendingComplaints;
    }
  }

  const canvas = document.getElementById('admin-chart');
  if (canvas && typeof Chart !== 'undefined') {
    if (canvas._chartInstance) {
      canvas._chartInstance.destroy();
    }

    let chartData = {
      labels: ['Mandi Road', 'GT Road', 'Civil Lines', 'Sector 21', 'Khanna', 'Doraha'],
      datasets: [{
        label: 'Processed',
        data: [342, 218, 156, 89, 71, 0],
        backgroundColor: 'rgba(27,94,32,.8)',
        borderRadius: 6,
      }, {
        label: 'Pending',
        data: [58, 32, 44, 11, 29, 85],
        backgroundColor: 'rgba(230,81,0,.7)',
        borderRadius: 6,
      }]
    };

    if (typeof api !== 'undefined') {
      const tp = await api.getAdminThroughput();
      if (tp && tp.success && tp.data) {
        chartData = {
          labels: tp.data.labels,
          datasets: [
            {
              label: tp.data.datasets[0].label,
              data: tp.data.datasets[0].data,
              backgroundColor: 'rgba(27,94,32,.8)',
              borderRadius: 6
            },
            {
              label: tp.data.datasets[1].label,
              data: tp.data.datasets[1].data,
              backgroundColor: 'rgba(230,81,0,.7)',
              borderRadius: 6
            }
          ]
        };
      }
    }

    const ctx = canvas.getContext('2d');
    canvas._chartInstance = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 } } }
        },
        scales: {
          y: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  renderComplaints();
}

async function resolveComplaint(id) {
  if (typeof api !== 'undefined') {
    await api.resolveComplaint(id);
  }

  const sample = sampleComplaints.find(c => c.id === id);
  if (sample) sample.status = 'Resolved';

  const userCmp = myComplaints.find(c => c.id === id);
  if (userCmp) {
    userCmp.status = 'Resolved';
    localStorage.setItem('aq_complaints', JSON.stringify(myComplaints));
  }

  renderComplaints();
  showNotif('Complaint ' + id + ' marked as resolved ✅');

  const admCmpEl = document.getElementById('adm-complaints');
  if (admCmpEl) {
    const n = parseInt(admCmpEl.textContent) || 0;
    admCmpEl.textContent = Math.max(0, n - 1);
  }
}
