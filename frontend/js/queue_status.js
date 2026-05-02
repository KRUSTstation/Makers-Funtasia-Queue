// Config loaded from config.js (CONFIG global)

// ── Read localStorage ──
const queueNumber = parseInt(localStorage.getItem(CONFIG.LS_PREFIX + 'queueNumber'), 10);
const name        = localStorage.getItem(CONFIG.LS_PREFIX + 'name') || '';
const joinedAtRaw = localStorage.getItem(CONFIG.LS_PREFIX + 'joinedAt');

// ── DOM refs ──
const statusLoading       = document.getElementById('statusLoading');
const statusNotFound      = document.getElementById('statusNotFound');
const statusCard          = document.getElementById('statusCard');
const statusRefreshNote   = document.getElementById('statusRefreshNote');
const statusName          = document.getElementById('statusName');
const statusQueueNum      = document.getElementById('statusQueueNum');
const statusBadge         = document.getElementById('statusBadge');
const statusAhead         = document.getElementById('statusAhead');
const statusWait          = document.getElementById('statusWait');
const statusPosition      = document.getElementById('statusPosition');
const statusCtaText       = document.getElementById('statusCtaText');

const statusServingBanner = document.getElementById('statusServingBanner');

// ── Guard: no localStorage data ──
if (!queueNumber || isNaN(queueNumber)) {
  statusLoading.classList.add('hidden');
  statusNotFound.classList.remove('hidden');
  statusRefreshNote.classList.add('hidden');
} else {
  // Pre-fill static fields immediately from localStorage
  statusName.textContent     = name;
  statusQueueNum.textContent = `#${queueNumber}`;


  // Fetch live position then start auto-refresh
  fetchPosition();
  setInterval(fetchPosition, CONFIG.STATUS_REFRESH_MS);
}

// ── Fetch live position ──
async function fetchPosition() {
  try {
    const res  = await fetch(`${CONFIG.API_BASE}/queue/position/${queueNumber}`);

    if (res.status === 404) {
      // Entry no longer exists
      showNotFound();
      return;
    }
    if (!res.ok) throw new Error('Network error');

    const data = await res.json();
    renderCard(data);

  } catch (err) {
    console.error('Failed to fetch position:', err);
    // Show card with whatever we have from localStorage
    statusLoading.classList.add('hidden');
    statusCard.classList.remove('hidden');
  }
}

// ── Render the status card ──
function renderCard(data) {
  statusLoading.classList.add('hidden');
  statusNotFound.classList.add('hidden');
  statusCard.classList.remove('hidden');

  statusQueueNum.textContent = `#${data.queue_number}`;
  statusName.textContent     = data.name || name;
  // Status badge
  const s = data.status;
  statusBadge.textContent  = s;
  statusBadge.className    = `status-badge status-badge-${s}`;

  // Ahead count and Estimated wait
  if (s === 'serving' || s === 'done') {
    statusAhead.textContent = '—';
    statusWait.textContent = '—';
    statusPosition.textContent = '—';
  } else {
    statusPosition.textContent = ordinal(data.position);
    if (data.ahead === 0) {
      statusAhead.textContent = 'None — you\'re next!';
    } else {
      statusAhead.textContent = data.ahead;
    }
    
    const mins = Math.max(0, data.ahead) * CONFIG.MINS_PER_PERSON;
    statusWait.textContent = mins === 0 ? 'Almost now!' : `~${mins} min`;
  }

  // CTA message
  if (s === 'serving') {
    statusServingBanner.classList.remove('hidden');
    statusCtaText.textContent = 'Please make your way to the booth now!';
    document.title = 'It\'s your turn! — Funtasia 2026';
  } else if (s === 'done') {
    statusServingBanner.classList.add('hidden');
    statusCtaText.textContent = 'Your session is complete — thanks for playing!';
    document.title = 'Done — Funtasia 2026';
  } else {
    statusServingBanner.classList.add('hidden');
    statusCtaText.textContent = data.ahead === 0
      ? 'You\'re next! Head over to the booth when called.'
      : 'Explore the other booths while you wait — we\'ll call your number!';
  }

}

function showNotFound() {
  statusLoading.classList.add('hidden');
  statusCard.classList.add('hidden');
  statusNotFound.classList.remove('hidden');
  statusRefreshNote.classList.add('hidden');
}

// ── Helpers ──
function formatTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
