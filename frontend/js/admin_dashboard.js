// Config loaded from config.js (CONFIG global)

// ── DOM refs ──
const tableBody     = document.getElementById("queueTableBody");
const refreshBtn    = document.getElementById("refreshBtn");
const resetBtn      = document.getElementById("resetBtn");
const refreshIcon   = refreshBtn.querySelector(".refresh-icon");
const modalOverlay  = document.getElementById("modalOverlay");
const modalClose    = document.getElementById("modalClose");
const modalQueueNum = document.getElementById("modalQueueNum");
const modalStatus   = document.getElementById("modalStatus");
const modalName     = document.getElementById("modalName");
const modalPhone    = document.getElementById("modalPhone");
const modalAttempts = document.getElementById("modalAttempts");
const modalTime     = document.getElementById("modalTime");

// Action buttons
const btnWaiting       = document.getElementById("btnWaiting");
const btnServing       = document.getElementById("btnServing");
const btnDone          = document.getElementById("btnDone");
const modalFeedback    = document.getElementById("modalActionFeedback");
const actionBtns       = [btnWaiting, btnServing, btnDone];

// Stat value elements
const statTotalVal   = document.getElementById("statTotalVal");
const statWaitingVal = document.getElementById("statWaitingVal");
const statServingVal = document.getElementById("statServingVal");
const statDoneVal    = document.getElementById("statDoneVal");

// ── Fetch & render queue ──
async function loadQueue() {
  setRefreshing(true);

  try {
    const res  = await fetch(`${CONFIG.API_BASE}/queue/get`);

    if (res.status === 401) {
      // Session expired — send back to login
      window.location.href = "/admin/login";
      return;
    }

    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();

    // Sort data: place 'done' items at the bottom, then sort each group by join time (earliest first)
    data.sort((a, b) => {
      const aDone = a.status === 'done' ? 1 : 0;
      const bDone = b.status === 'done' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    renderTable(data);
    renderStats(data);

    // If modal is open, auto-update it so it doesn't show stale data
    if (_currentItem && !modalOverlay.classList.contains("hidden")) {
      const latestItem = data.find(d => d.queue_number === _currentItem.queue_number);
      if (latestItem) {
        if (_currentItem.status !== latestItem.status) {
          _currentItem.status      = latestItem.status;
          modalStatus.textContent  = latestItem.status;
          modalStatus.className    = `modal-status-tag status-${latestItem.status}`;
          setActionButtons(latestItem.status);
          hideFeedback();
        }
      } else {
        closeModal(); // Item no longer exists
      }
    }

  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `
      <tr class="dash-empty-row">
        <td colspan="6">
          <span class="material-symbols-outlined" aria-hidden="true">wifi_off</span>
          Could not load queue — check your connection.
        </td>
      </tr>`;
  } finally {
    setRefreshing(false);
  }
}

function renderStats(data) {
  const total   = data.length;
  const waiting = data.filter(d => d.status === "waiting").length;
  const serving = data.filter(d => d.status === "serving").length;
  const done    = data.filter(d => d.status === "done").length;

  statTotalVal.textContent   = total;
  statWaitingVal.textContent = waiting;
  statServingVal.textContent = serving;
  statDoneVal.textContent    = done;
}

function renderTable(data) {
  if (!data.length) {
    tableBody.innerHTML = `
      <tr class="dash-empty-row">
        <td colspan="6">
          <span class="material-symbols-outlined" aria-hidden="true">celebration</span>
          Queue is empty — no one has joined yet.
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");
    tr.className = "dash-row";
    tr.setAttribute("tabindex", "0");
    tr.setAttribute("role", "button");
    tr.setAttribute("aria-label", `View details for ${escapeHtml(item.name)}, queue number ${item.queue_number}`);

    tr.innerHTML = `
      <td class="col-num">
        <span class="queue-num-badge">${item.queue_number}</span>
      </td>
      <td class="col-name">${escapeHtml(item.name)}</td>
      <td class="col-attempts" style="color: var(--text-muted); font-weight: 500;">
        ${item.attempts}
      </td>
      <td class="col-status">
        <span class="status-tag status-${item.status}">${item.status}</span>
      </td>
      <td class="col-time">${formatTime(item.created_at)}</td>
      <td class="col-action">
        <span class="material-symbols-outlined row-chevron" aria-hidden="true">chevron_right</span>
      </td>
    `;

    tr.addEventListener("click",  () => openModal(item));
    tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") openModal(item); });

    tableBody.appendChild(tr);
  });
}

// ── Modal ──
let _currentItem = null;   // track item currently open in modal

function openModal(item) {
  _currentItem = item;

  modalQueueNum.textContent = `#${item.queue_number}`;
  modalName.textContent     = item.name;
  modalPhone.textContent    = item.ph_num;
  if (modalAttempts) modalAttempts.textContent = item.attempts;
  modalTime.textContent     = formatTime(item.created_at);

  // Status tag
  modalStatus.textContent  = item.status;
  modalStatus.className    = `modal-status-tag status-${item.status}`;

  setActionButtons(item.status);
  hideFeedback();

  modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  modalClose.focus();
}

function setActionButtons(currentStatus) {
  actionBtns.forEach(btn => {
    const isActive = btn.dataset.status === currentStatus;
    btn.disabled   = isActive;
    btn.classList.toggle("active", isActive);
  });
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  document.body.style.overflow = "";
}

// Close on button, overlay click, or Escape
modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) closeModal();
});

// ── Status action buttons ──
actionBtns.forEach(btn => {
  btn.addEventListener("click", () => changeStatus(btn.dataset.status));
});

async function changeStatus(newStatus) {
  if (!_currentItem) return;
  const queueNum = _currentItem.queue_number;

  // Disable all buttons while the request is in flight
  actionBtns.forEach(b => b.disabled = true);
  hideFeedback();

  try {
    const res = await fetch(`${CONFIG.API_BASE}/admin/queue/${queueNum}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    });

    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error(await res.text());

    // Update the open modal instantly
    _currentItem.status      = newStatus;
    modalStatus.textContent  = newStatus;
    modalStatus.className    = `modal-status-tag status-${newStatus}`;
    setActionButtons(newStatus);
    showFeedback('Status updated.', 'ok');

    // Refresh the table in the background
    loadQueue();

  } catch (err) {
    console.error(err);
    showFeedback('Update failed — try again.', 'err');
    setActionButtons(_currentItem.status);  // re-enable correct button
  }
}

function showFeedback(msg, type) {
  modalFeedback.textContent  = msg;
  modalFeedback.className    = `modal-action-feedback feedback-${type}`;
}

function hideFeedback() {
  modalFeedback.textContent = '';
  modalFeedback.className   = 'modal-action-feedback hidden';
}

// ── Refresh button ──
refreshBtn.addEventListener("click", loadQueue);

// ── Reset Queue button ──
if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to reset the queue? This will delete all items and cannot be undone.")) {
      return;
    }
    
    setRefreshing(true);
    try {
      const res = await fetch(`${CONFIG.API_BASE}/admin/queue/reset`, {
        method: 'DELETE'
      });
      
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error("Failed to reset queue");
      
      await loadQueue();
      alert("Queue has been reset.");
    } catch (err) {
      console.error(err);
      alert("Failed to reset queue.");
      setRefreshing(false);
    }
  });
}

function setRefreshing(on) {
  refreshBtn.disabled = on;
  if (resetBtn) resetBtn.disabled = on;
  refreshIcon.style.animation = on ? "spin 0.7s linear infinite" : "";
}

// ── Helpers ──
function formatTime(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true })
       + " · " + d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Auto-refresh every 15 s ──
loadQueue();
setInterval(loadQueue, CONFIG.DASHBOARD_REFRESH_MS);

// ── QR Code Panel ────────────────────────────────────────────────────────────
const qrContainer  = document.getElementById('qrContainer');
const qrCountdown  = document.getElementById('qrCountdown');
const qrRegenBtn   = document.getElementById('qrRegenBtn');
const qrUrlHint    = document.getElementById('qrUrlHint');

let _qrCountdownTimer = null;   // setInterval handle for the countdown tick

/** Fetch token info and render a fresh QR code */
async function initQR() {
  try {
    const res = await fetch(`${CONFIG.API_BASE}/admin/qr/token`);
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to fetch QR token');
    const data = await res.json();
    renderQR(data);
  } catch (err) {
    console.error('QR init error:', err);
    if (qrUrlHint) qrUrlHint.textContent = 'Could not load QR — check connection.';
  }
}

/** Render a new QR code and start the countdown */
function renderQR(data) {
  // Clear previous QR and countdown
  if (_qrCountdownTimer) clearInterval(_qrCountdownTimer);
  qrContainer.innerHTML = '';

  // Build a canvas and render into it
  const canvas = document.createElement('canvas');
  qrContainer.appendChild(canvas);

  QRCode.toCanvas(canvas, data.qr_url, {
    width:            160,
    margin:           1,
    color: { dark: '#000000', light: '#ffffff' },
  }, (err) => {
    if (err) console.error('QRCode render error:', err);
  });

  // Show the URL hint
  if (qrUrlHint) qrUrlHint.textContent = data.qr_url;

  // Start countdown from seconds_remaining
  let secsLeft = data.seconds_remaining;
  if (qrCountdown) qrCountdown.textContent = secsLeft;

  _qrCountdownTimer = setInterval(async () => {
    secsLeft -= 1;
    if (qrCountdown) qrCountdown.textContent = Math.max(0, secsLeft);

    if (secsLeft <= 0) {
      clearInterval(_qrCountdownTimer);
      // Auto-fetch a fresh token (server auto-generates when expired)
      await initQR();
    }
  }, 1000);
}

/** Manual regenerate */
async function regenQR() {
  if (qrRegenBtn) {
    qrRegenBtn.disabled = true;
    qrRegenBtn.classList.add('spinning');
  }
  try {
    const res = await fetch(`${CONFIG.API_BASE}/admin/qr/regenerate`, { method: 'POST' });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to regenerate QR token');
    const data = await res.json();
    renderQR(data);
  } catch (err) {
    console.error('QR regen error:', err);
  } finally {
    if (qrRegenBtn) {
      qrRegenBtn.disabled = false;
      qrRegenBtn.classList.remove('spinning');
    }
  }
}

if (qrRegenBtn) qrRegenBtn.addEventListener('click', regenQR);

// Kick off QR on page load
initQR();

// ── Prizes Management ────────────────────────────────────────────────────────
const managePrizesBtn = document.getElementById('managePrizesBtn');
const prizesModalOverlay = document.getElementById('prizesModalOverlay');
const prizesModalClose = document.getElementById('prizesModalClose');
const prizesTableBody = document.getElementById('prizesTableBody');
const addPrizeForm = document.getElementById('addPrizeForm');
const prizeNameInput = document.getElementById('prizeNameInput');
const prizePointsInput = document.getElementById('prizePointsInput');

if (managePrizesBtn && prizesModalOverlay) {
  managePrizesBtn.addEventListener('click', () => {
    prizesModalOverlay.classList.remove('hidden');
    loadPrizes();
  });

  prizesModalClose.addEventListener('click', () => {
    prizesModalOverlay.classList.add('hidden');
  });

  prizesModalOverlay.addEventListener('click', e => {
    if (e.target === prizesModalOverlay) prizesModalOverlay.classList.add('hidden');
  });

  addPrizeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = prizeNameInput.value.trim();
    const points = parseInt(prizePointsInput.value, 10);
    if (!name || isNaN(points)) return;

    try {
      const res = await fetch('/admin/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, points })
      });
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error('Failed to add prize');
      
      prizeNameInput.value = '';
      prizePointsInput.value = '';
      await loadPrizes();
    } catch (err) {
      console.error(err);
      alert('Failed to add prize');
    }
  });
}

async function loadPrizes() {
  prizesTableBody.innerHTML = '<tr><td colspan="4" class="prizes-empty-cell"><span class="material-symbols-outlined" aria-hidden="true">sync</span>Loading...</td></tr>';
  try {
    const res = await fetch('/api/prizes');
    if (!res.ok) throw new Error('Failed to fetch prizes');
    const prizes = await res.json();
    
    if (prizes.length === 0) {
      prizesTableBody.innerHTML = '<tr><td colspan="4" class="prizes-empty-cell"><span class="material-symbols-outlined" aria-hidden="true">redeem</span>No prizes added yet.</td></tr>';
      return;
    }

    prizesTableBody.innerHTML = '';
    prizes.forEach(prize => {
      const tr = document.createElement('tr');
      tr.id = `prize-row-${prize.id}`;
      tr.innerHTML = `
        <td class="prize-name-cell">${escapeHtml(prize.name)}</td>
        <td class="prizes-col-pts prize-points-cell">${prize.points}</td>
        <td class="prizes-col-action">
          <button class="prizes-edit-btn" onclick="editPrize(${prize.id}, '${escapeHtml(prize.name).replace(/'/g, "\\'")}', ${prize.points})" title="Edit" aria-label="Edit ${escapeHtml(prize.name)}">
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
        </td>
        <td class="prizes-col-action">
          <button class="prizes-delete-btn" onclick="deletePrize(${prize.id})" title="Remove" aria-label="Delete ${escapeHtml(prize.name)}">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </td>
      `;
      prizesTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    prizesTableBody.innerHTML = '<tr><td colspan="4" class="prizes-empty-cell" style="color: #cc2222;">Failed to load prizes</td></tr>';
  }
}

function editPrize(id, currentName, currentPoints) {
  const tr = document.getElementById(`prize-row-${id}`);
  if (!tr) return;
  tr.innerHTML = `
    <td colspan="2" style="padding: 0.4rem 0.75rem;">
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <input type="text" class="prizes-field-input prizes-inline-input" id="edit-name-${id}" value="${escapeHtml(currentName)}" style="flex: 2;">
        <input type="number" class="prizes-field-input prizes-inline-input" id="edit-points-${id}" value="${currentPoints}" min="1" style="flex: 1; min-width: 70px;">
      </div>
    </td>
    <td class="prizes-col-action">
      <button class="prizes-edit-btn prizes-save-btn" onclick="savePrize(${id})" title="Save">
        <span class="material-symbols-outlined" aria-hidden="true">check</span>
      </button>
    </td>
    <td class="prizes-col-action">
      <button class="prizes-delete-btn" onclick="loadPrizes()" title="Cancel" style="border-color: var(--db-border); color: var(--db-ink-3);">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </td>
  `;
  document.getElementById(`edit-name-${id}`).focus();
}

async function savePrize(id) {
  const nameEl   = document.getElementById(`edit-name-${id}`);
  const pointsEl = document.getElementById(`edit-points-${id}`);
  const name   = nameEl ? nameEl.value.trim() : '';
  const points = pointsEl ? parseInt(pointsEl.value, 10) : NaN;
  if (!name || isNaN(points) || points < 1) {
    nameEl && nameEl.focus();
    return;
  }
  try {
    const res = await fetch(`/admin/prizes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, points })
    });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to update prize');
    await loadPrizes();
  } catch (err) {
    console.error(err);
    alert('Failed to update prize');
  }
}

async function deletePrize(id) {
  if (!confirm('Delete this prize?')) return;
  try {
    const res = await fetch(`/admin/prizes/${id}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to delete prize');
    await loadPrizes();
  } catch (err) {
    console.error(err);
    alert('Failed to delete prize');
  }
}
