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

    if (typeof Chart !== 'undefined') {
      try {
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
      } catch (e) {
        drawNativeAdminChart(canvas, chartData);
      }
    } else {
      drawNativeAdminChart(canvas, chartData);
    }
  }

  renderComplaints();
}

function drawNativeAdminChart(canvas, chartData) {
  if (!canvas) return;
  const parent = canvas.parentElement;
  const width = parent ? (parent.clientWidth || 360) : 360;
  const height = 180;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const labels = chartData.labels || [];
  const processed = (chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data) || [];
  const pending = (chartData.datasets && chartData.datasets[1] && chartData.datasets[1].data) || [];

  const padLeft = 32;
  const padRight = 14;
  const padTop = 15;
  const padBottom = 26;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  if (chartW <= 0 || chartH <= 0) {
    ctx.restore();
    return;
  }

  const maxVal = Math.max(...processed, ...pending, 100);

  const steps = [0, Math.round(maxVal / 2), maxVal];
  ctx.font = '500 9px "Inter", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94A3B8';
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
  ctx.setLineDash([3, 3]);

  steps.forEach(v => {
    const y = padTop + chartH - (v / maxVal) * chartH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
    ctx.fillText(v, padLeft - 4, y);
  });
  ctx.setLineDash([]);

  const barGroupWidth = chartW / (labels.length || 1);
  const barW = Math.min(14, barGroupWidth * 0.35);

  labels.forEach((lbl, idx) => {
    const groupX = padLeft + idx * barGroupWidth;
    const pVal = processed[idx] || 0;
    const qVal = pending[idx] || 0;

    const pH = (pVal / maxVal) * chartH;
    const qH = (qVal / maxVal) * chartH;

    ctx.fillStyle = 'rgba(27, 94, 32, 0.85)';
    ctx.fillRect(groupX + (barGroupWidth - barW * 2 - 4) / 2, padTop + chartH - pH, barW, pH);

    ctx.fillStyle = 'rgba(230, 81, 0, 0.85)';
    ctx.fillRect(groupX + (barGroupWidth - barW * 2 - 4) / 2 + barW + 3, padTop + chartH - qH, barW, qH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748B';
    ctx.font = '500 9px "Inter", sans-serif';
    ctx.fillText(lbl.split(' ')[0], groupX + barGroupWidth / 2, padTop + chartH + 5);
  });

  ctx.restore();
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
  showNotif('Complaint ' + id + ' marked as resolved');

  const admCmpEl = document.getElementById('adm-complaints');
  if (admCmpEl) {
    const n = parseInt(admCmpEl.textContent) || 0;
    admCmpEl.textContent = Math.max(0, n - 1);
  }
}
