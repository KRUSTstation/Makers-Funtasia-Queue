/**
 * admin_display.js
 * Logic for the public queue display board.
 */

document.addEventListener('DOMContentLoaded', () => {
  const displayTime = document.getElementById('displayTime');
  const servingList = document.getElementById('servingList');
  const waitingList = document.getElementById('waitingList');

  let previousServing = [];
  let previousWaiting = [];

  // Update clock every second
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    displayTime.textContent = `${hours}:${minutes}`;
  }

  // Fetch and update queue data
  async function fetchQueueData() {
    try {
      const res = await fetch('/queue/get');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error('Failed to fetch queue data');
      }

      const data = await res.json();
      
      // Sort by join time (earliest first)
      data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      const serving = data.filter(item => item.status === 'serving').map(i => i.queue_number);
      const waiting = data.filter(item => item.status === 'waiting').map(i => i.queue_number);

      renderList(servingList, serving, previousServing, 'No one currently serving');
      renderList(waitingList, waiting, previousWaiting, 'No one waiting');

      previousServing = serving;
      previousWaiting = waiting;

    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  }

  function renderList(container, currentItems, previousItems, emptyMessage) {
    // Check if the array has changed to avoid unnecessary DOM updates and re-triggering animations
    if (JSON.stringify(currentItems) === JSON.stringify(previousItems) && previousItems.length !== 0) {
      return;
    }

    container.innerHTML = ''; // Clear container

    if (currentItems.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.textContent = emptyMessage;
      container.appendChild(emptyDiv);
      return;
    }

    currentItems.forEach(num => {
      const ticketDiv = document.createElement('div');
      ticketDiv.className = 'ticket';
      // Format to 3 digits e.g. 001
      ticketDiv.textContent = String(num).padStart(3, '0');
      container.appendChild(ticketDiv);
    });
  }

  // Initial calls
  updateClock();
  fetchQueueData();

  // Set intervals
  setInterval(updateClock, 1000); // 1s
  setInterval(fetchQueueData, 15000); // 15s

  // ── QR Code Logic ──────────────────────────────────────────────────────────
  const qrContainer  = document.getElementById('qrContainer');
  const qrCountdown  = document.getElementById('qrCountdown');
  const qrBlock      = document.getElementById('qrBlock');

  let _qrCountdownTimer = null;

  async function initQR() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/admin/qr/token`);
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error('Failed to fetch QR token');
      const data = await res.json();
      renderQR(data);
    } catch (err) {
      console.error('QR init error:', err);
    }
  }

  function renderQR(data) {
    if (_qrCountdownTimer) clearInterval(_qrCountdownTimer);
    qrContainer.innerHTML = '';

    const canvas = document.createElement('canvas');
    qrContainer.appendChild(canvas);

    if (typeof QRCode !== 'undefined') {
      QRCode.toCanvas(canvas, data.qr_url, {
        width: 140,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      }, (err) => {
        if (err) console.error('QRCode render error:', err);
      });
    }

    let secsLeft = data.seconds_remaining;
    if (qrCountdown) qrCountdown.textContent = secsLeft;

    _qrCountdownTimer = setInterval(async () => {
      secsLeft -= 1;
      if (qrCountdown) qrCountdown.textContent = Math.max(0, secsLeft);

      if (secsLeft <= 0) {
        clearInterval(_qrCountdownTimer);
        await initQR(); // Auto-refresh when expired
      }
    }, 1000);
  }

  initQR();
});
