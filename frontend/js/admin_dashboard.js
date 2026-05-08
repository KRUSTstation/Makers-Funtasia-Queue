// Config loaded from config.js (CONFIG global)

// â”€â”€ DOM refs â”€â”€
const tableBody = document.getElementById("queueTableBody");
const refreshBtn = document.getElementById("refreshBtn");
const resetBtn = document.getElementById("resetBtn");
const refreshIcon = refreshBtn.querySelector(".refresh-icon");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalQueueNum = document.getElementById("modalQueueNum");
const modalStatus = document.getElementById("modalStatus");
const modalName = document.getElementById("modalName");
const modalPhone = document.getElementById("modalPhone");
const modalAttempts = document.getElementById("modalAttempts");
const modalTime = document.getElementById("modalTime");

// Action buttons
const btnWaiting = document.getElementById("btnWaiting");
const btnServing = document.getElementById("btnServing");
const btnDone = document.getElementById("btnDone");
const modalFeedback = document.getElementById("modalActionFeedback");
const actionBtns = [btnWaiting, btnServing, btnDone];

// Stat value elements
const statTotalVal = document.getElementById("statTotalVal");
const statWaitingVal = document.getElementById("statWaitingVal");
const statServingVal = document.getElementById("statServingVal");
const statDoneVal = document.getElementById("statDoneVal");

// â”€â”€ Fetch & render queue â”€â”€
async function loadQueue() {
  setRefreshing(true);

  try {
    const res = await fetch(`${CONFIG.API_BASE}/queue/get`);

    if (res.status === 401) {
      // Session expired â€” send back to login
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
          _currentItem.status = latestItem.status;
          modalStatus.textContent = latestItem.status;
          modalStatus.className = `modal-status-tag status-${latestItem.status}`;
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
          Could not load queue â€” check your connection.
        </td>
      </tr>`;
  } finally {
    setRefreshing(false);
  }
}

function renderStats(data) {
  const total = data.length;
  const waiting = data.filter(d => d.status === "waiting").length;
  const serving = data.filter(d => d.status === "serving").length;
  const done = data.filter(d => d.status === "done").length;

  statTotalVal.textContent = total;
  statWaitingVal.textContent = waiting;
  statServingVal.textContent = serving;
  statDoneVal.textContent = done;
}

function renderTable(data) {
  if (!data.length) {
    tableBody.innerHTML = `
      <tr class="dash-empty-row">
        <td colspan="6">
          <span class="material-symbols-outlined" aria-hidden="true">celebration</span>
          Queue is empty â€” no one has joined yet.
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

    tr.addEventListener("click", () => openModal(item));
    tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") openModal(item); });

    tableBody.appendChild(tr);
  });
}

// â”€â”€ Modal â”€â”€
let _currentItem = null;   // track item currently open in modal

function openModal(item) {
  _currentItem = item;

  modalQueueNum.textContent = `#${item.queue_number}`;
  modalName.textContent = item.name;
  modalPhone.textContent = item.ph_num;
  if (modalAttempts) modalAttempts.textContent = item.attempts;
  modalTime.textContent = formatTime(item.created_at);

  // Status tag
  modalStatus.textContent = item.status;
  modalStatus.className = `modal-status-tag status-${item.status}`;

  setActionButtons(item.status);
  hideFeedback();

  modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  modalClose.focus();
}

function setActionButtons(currentStatus) {
  actionBtns.forEach(btn => {
    const isActive = btn.dataset.status === currentStatus;
    btn.disabled = isActive;
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

// â”€â”€ Status action buttons â”€â”€
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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error(await res.text());

    // Update the open modal instantly
    _currentItem.status = newStatus;
    modalStatus.textContent = newStatus;
    modalStatus.className = `modal-status-tag status-${newStatus}`;
    setActionButtons(newStatus);
    showFeedback('Status updated.', 'ok');

    // Refresh the table in the background
    loadQueue();

  } catch (err) {
    console.error(err);
    showFeedback('Update failed â€” try again.', 'err');
    setActionButtons(_currentItem.status);  // re-enable correct button
  }
}

function showFeedback(msg, type) {
  modalFeedback.textContent = msg;
  modalFeedback.className = `modal-action-feedback feedback-${type}`;
}

function hideFeedback() {
  modalFeedback.textContent = '';
  modalFeedback.className = 'modal-action-feedback hidden';
}

// â”€â”€ Refresh button â”€â”€
refreshBtn.addEventListener("click", loadQueue);

// â”€â”€ Reset Queue button â”€â”€
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

// â”€â”€ Helpers â”€â”€
function formatTime(raw) {
  if (!raw) return "â€”";
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true })
    + " Â· " + d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// â”€â”€ Auto-refresh every 15 s â”€â”€
loadQueue();
setInterval(loadQueue, CONFIG.DASHBOARD_REFRESH_MS);

// â”€â”€ QR Code Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const qrContainer = document.getElementById('qrContainer');
const qrCountdown = document.getElementById('qrCountdown');
const qrRegenBtn = document.getElementById('qrRegenBtn');
const qrUrlHint = document.getElementById('qrUrlHint');

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
    if (qrUrlHint) qrUrlHint.textContent = 'Could not load QR â€” check connection.';
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
    width: 160,
    margin: 1,
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

// â”€â”€ Prizes Management (Software / Hardware tabs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const managePrizesBtn    = document.getElementById('managePrizesBtn');
const prizesModalOverlay = document.getElementById('prizesModalOverlay');
const prizesModalClose   = document.getElementById('prizesModalClose');
const prizesTableBody    = document.getElementById('prizesTableBody');
const addPrizeForm       = document.getElementById('addPrizeForm');
const prizeNameInput     = document.getElementById('prizeNameInput');
const prizeThresholdInput = document.getElementById('prizeThresholdInput');
const prizeThresholdLabel = document.getElementById('prizeThresholdLabel');
const prizesThresholdHeader = document.getElementById('prizesThresholdHeader');
const prizeQtyInput      = document.getElementById('prizeQtyInput');
const prizeTabSoftware   = document.getElementById('prizeTabSoftware');
const prizeTabHardware   = document.getElementById('prizeTabHardware');

let currentPrizeSector = 'software';

function setPrizeSector(sector) {
  currentPrizeSector = sector;
  if (sector === 'software') {
    prizeTabSoftware.classList.add('active');
    prizeTabHardware.classList.remove('active');
    if (prizeThresholdLabel) prizeThresholdLabel.textContent = 'Points Required';
    if (prizeThresholdInput) prizeThresholdInput.placeholder = '500';
    if (prizesThresholdHeader) prizesThresholdHeader.textContent = 'Points';
  } else {
    prizeTabHardware.classList.add('active');
    prizeTabSoftware.classList.remove('active');
    if (prizeThresholdLabel) prizeThresholdLabel.textContent = 'Time Limit (mins)';
    if (prizeThresholdInput) prizeThresholdInput.placeholder = '2';
    if (prizesThresholdHeader) prizesThresholdHeader.textContent = 'Time Limit';
  }
  loadPrizes();
}

if (managePrizesBtn && prizesModalOverlay) {
  managePrizesBtn.addEventListener('click', () => {
    prizesModalOverlay.classList.remove('hidden');
    setPrizeSector('software');
  });
  prizesModalClose.addEventListener('click', () => prizesModalOverlay.classList.add('hidden'));
  prizesModalOverlay.addEventListener('click', e => {
    if (e.target === prizesModalOverlay) prizesModalOverlay.classList.add('hidden');
  });
  if (prizeTabSoftware) prizeTabSoftware.addEventListener('click', () => setPrizeSector('software'));
  if (prizeTabHardware) prizeTabHardware.addEventListener('click', () => setPrizeSector('hardware'));

  addPrizeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = prizeNameInput.value.trim();
    const points = parseInt(prizeThresholdInput.value, 10);
    const quantity_left = parseInt(prizeQtyInput.value, 10);
    if (!name || isNaN(points)) return;

    try {
      const res = await fetch('/admin/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sector: currentPrizeSector, points, quantity_left })
      });
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error('Failed to add prize');
      prizeNameInput.value = '';
      prizeThresholdInput.value = '';
      prizeQtyInput.value = '-1';
      await loadPrizes();
    } catch (err) {
      console.error(err);
      alert('Failed to add prize');
    }
  });
}

async function loadPrizes() {
  if (!prizesTableBody) return;
  prizesTableBody.innerHTML = '<tr><td colspan="5" class="prizes-empty-cell"><span class="material-symbols-outlined" aria-hidden="true">sync</span>Loading...</td></tr>';
  try {
    const res = await fetch('/api/prizes');
    if (!res.ok) throw new Error('Failed to fetch prizes');
    const allPrizes = await res.json();
    const prizes = allPrizes.filter(p => p.sector === currentPrizeSector);

    if (prizes.length === 0) {
      const label = currentPrizeSector === 'software' ? 'software' : 'hardware';
      prizesTableBody.innerHTML = `<tr><td colspan="5" class="prizes-empty-cell"><span class="material-symbols-outlined" aria-hidden="true">redeem</span>No ${label} prizes yet.</td></tr>`;
      return;
    }

    prizesTableBody.innerHTML = '';
    prizes.forEach(prize => {
      const isUnlimited = prize.quantity_left === -1;
      const qtyLabel = isUnlimited ? '&infin;' : prize.quantity_left;
      const thresholdLabel = currentPrizeSector === 'software' ? `${prize.points} PTS` : `${prize.points} min`;
      const soldOut = !isUnlimited && prize.quantity_left === 0;
      const tr = document.createElement('tr');
      tr.id = `prize-row-${prize.id}`;
      if (soldOut) tr.style.opacity = '0.5';
      tr.innerHTML = `
        <td class="prize-name-cell">${escapeHtml(prize.name)}${soldOut ? ' <span style="color:#c00;font-size:0.7rem;">[SOLD OUT]</span>' : ''}</td>
        <td class="prizes-col-pts prize-points-cell">${thresholdLabel}</td>
        <td class="prizes-col-pts">
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <button onclick="adjustQty(${prize.id}, ${prize.quantity_left}, -1)" title="-1" style="background:none;border:1px solid var(--db-border);border-radius:3px;padding:1px 5px;cursor:pointer;color:var(--db-ink-2);font-size:0.75rem;" ${isUnlimited ? 'disabled' : ''}>-</button>
            <span style="min-width:2rem;text-align:center;">${qtyLabel}</span>
            <button onclick="adjustQty(${prize.id}, ${prize.quantity_left}, 1)" title="+1" style="background:none;border:1px solid var(--db-border);border-radius:3px;padding:1px 5px;cursor:pointer;color:var(--db-ink-2);font-size:0.75rem;" ${isUnlimited ? 'disabled' : ''}>+</button>
            <button onclick="toggleUnlimited(${prize.id}, ${prize.quantity_left})" title="${isUnlimited ? 'Set limited' : 'Set unlimited'}" style="background:none;border:1px solid var(--db-border);border-radius:3px;padding:1px 5px;cursor:pointer;color:var(--db-ink-3);font-size:0.65rem;">${isUnlimited ? '&infin;' : '#-&gt;&infin;'}</button>
          </div>
        </td>
        <td class="prizes-col-action">
          <button class="prizes-edit-btn" onclick="editPrize(${prize.id}, '${escapeHtml(prize.name).replace(/'/g, "\\'")}', ${prize.points}, ${prize.quantity_left})" title="Edit" aria-label="Edit ${escapeHtml(prize.name)}">
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
    prizesTableBody.innerHTML = '<tr><td colspan="5" class="prizes-empty-cell" style="color:#c00;">Failed to load prizes</td></tr>';
  }
}

async function adjustQty(id, current, delta) {
  if (current === -1) return; // unlimited
  const newQty = Math.max(0, current + delta);
  try {
    const res = await fetch(`/admin/prizes/${id}/quantity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity_left: newQty })
    });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to update quantity');
    await loadPrizes();
  } catch (err) { console.error(err); alert('Failed to update quantity'); }
}

async function toggleUnlimited(id, current) {
  const newQty = current === -1 ? 10 : -1; // toggle: unlimited â†’ 10, limited â†’ unlimited
  try {
    const res = await fetch(`/admin/prizes/${id}/quantity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity_left: newQty })
    });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to update');
    await loadPrizes();
  } catch (err) { console.error(err); alert('Failed to toggle unlimited'); }
}

function editPrize(id, currentName, currentPoints, currentQty) {
  const tr = document.getElementById(`prize-row-${id}`);
  if (!tr) return;
  const thresholdPlaceholder = currentPrizeSector === 'software' ? 'PTS' : 'mins';
  tr.innerHTML = `
    <td colspan="3" style="padding: 0.4rem 0.75rem;">
      <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
        <input type="text" class="prizes-field-input prizes-inline-input" id="edit-prize-name-${id}" value="${escapeHtml(currentName)}" style="flex:2;min-width:120px;" placeholder="Prize name">
        <input type="number" class="prizes-field-input prizes-inline-input" id="edit-prize-pts-${id}" value="${currentPoints}" style="flex:1;min-width:70px;" placeholder="${thresholdPlaceholder}" min="0">
        <input type="number" class="prizes-field-input prizes-inline-input" id="edit-prize-qty-${id}" value="${currentQty}" style="flex:1;min-width:60px;" placeholder="Qty" min="-1">
      </div>
    </td>
    <td class="prizes-col-action">
      <button class="prizes-edit-btn prizes-save-btn" onclick="savePrize(${id})" title="Save">
        <span class="material-symbols-outlined" aria-hidden="true">check</span>
      </button>
    </td>
    <td class="prizes-col-action">
      <button class="prizes-delete-btn" onclick="loadPrizes()" title="Cancel" style="border-color:var(--db-border);color:var(--db-ink-3);">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </td>
  `;
  document.getElementById(`edit-prize-name-${id}`).focus();
}

async function savePrize(id) {
  const nameEl  = document.getElementById(`edit-prize-name-${id}`);
  const ptsEl   = document.getElementById(`edit-prize-pts-${id}`);
  const qtyEl   = document.getElementById(`edit-prize-qty-${id}`);
  const name    = nameEl ? nameEl.value.trim() : '';
  const points  = ptsEl ? parseInt(ptsEl.value, 10) : NaN;
  const quantity_left = qtyEl ? parseInt(qtyEl.value, 10) : -1;
  if (!name || isNaN(points)) { if (nameEl && !name) nameEl.focus(); return; }
  try {
    const res = await fetch(`/admin/prizes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sector: currentPrizeSector, points, quantity_left })
    });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to update prize');
    await loadPrizes();
  } catch (err) { console.error(err); alert('Failed to update prize'); }
}

async function deletePrize(id) {
  if (!confirm('Delete this prize?')) return;
  try {
    const res = await fetch(`/admin/prizes/${id}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to delete prize');
    await loadPrizes();
  } catch (err) { console.error(err); alert('Failed to delete prize'); }
}

// â”€â”€ Game Prices Management (Software / Hardware tabs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const managePricesBtn     = document.getElementById('managePricesBtn');
const pricesModalOverlay  = document.getElementById('pricesModalOverlay');
const pricesModalClose    = document.getElementById('pricesModalClose');
const pricesTableBody     = document.getElementById('pricesTableBody');
const addPriceForm        = document.getElementById('addPriceForm');
const priceItemNameInput  = document.getElementById('priceItemNameInput');
const priceValueInput     = document.getElementById('priceValueInput');
const priceTabSoftware    = document.getElementById('priceTabSoftware');
const priceTabHardware    = document.getElementById('priceTabHardware');

let currentPriceSector = 'software';

function setPriceSector(sector) {
  currentPriceSector = sector;
  if (sector === 'software') {
    priceTabSoftware.classList.add('active');
    priceTabHardware.classList.remove('active');
  } else {
    priceTabHardware.classList.add('active');
    priceTabSoftware.classList.remove('active');
  }
  loadPrices();
}

if (managePricesBtn && pricesModalOverlay) {
  managePricesBtn.addEventListener('click', () => {
    pricesModalOverlay.classList.remove('hidden');
    setPriceSector('software');
  });
  pricesModalClose.addEventListener('click', () => pricesModalOverlay.classList.add('hidden'));
  pricesModalOverlay.addEventListener('click', e => {
    if (e.target === pricesModalOverlay) pricesModalOverlay.classList.add('hidden');
  });
  if (priceTabSoftware) priceTabSoftware.addEventListener('click', () => setPriceSector('software'));
  if (priceTabHardware) priceTabHardware.addEventListener('click', () => setPriceSector('hardware'));

  addPriceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const item_name = priceItemNameInput.value.trim();
    const price = priceValueInput.value.trim();
    const unit = currentPriceSector === 'software' ? 'attempt' : 'minute';
    if (!item_name || !price) return;
    try {
      const res = await fetch('/admin/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name, price, sector: currentPriceSector, unit })
      });
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error('Failed to add price');
      priceItemNameInput.value = '';
      priceValueInput.value = '';
      await loadPrices();
    } catch (err) { console.error(err); alert('Failed to add price'); }
  });
}

async function loadPrices() {
  if (!pricesTableBody) return;
  pricesTableBody.innerHTML = '<tr><td colspan="4" class="prizes-empty-cell"><span class="material-symbols-outlined" aria-hidden="true">sync</span>Loading...</td></tr>';
  try {
    const res = await fetch('/api/prices');
    if (!res.ok) throw new Error('Failed to fetch prices');
    const allPrices = await res.json();
    const prices = allPrices.filter(p => p.sector === currentPriceSector);

    if (prices.length === 0) {
      const label = currentPriceSector === 'software' ? 'software (per attempt)' : 'hardware (per minute)';
      pricesTableBody.innerHTML = `<tr><td colspan="4" class="prizes-empty-cell"><span class="material-symbols-outlined" aria-hidden="true">payments</span>No ${label} prices yet.</td></tr>`;
      return;
    }

    pricesTableBody.innerHTML = '';
    prices.forEach(item => {
      const unitLabel = item.unit === 'minute' ? '/ min' : '/ attempt';
      const tr = document.createElement('tr');
      tr.id = `price-row-${item.id}`;
      tr.innerHTML = `
        <td class="prize-name-cell">${escapeHtml(item.item_name)}</td>
        <td class="prizes-col-pts prize-points-cell">${escapeHtml(item.price)} <span style="color:var(--db-ink-3);font-size:0.7rem;">${unitLabel}</span></td>
        <td class="prizes-col-action">
          <button class="prizes-edit-btn" onclick="editPrice(${item.id}, '${escapeHtml(item.item_name).replace(/'/g, "\\'")}', '${escapeHtml(item.price).replace(/'/g, "\\'")}')" title="Edit" aria-label="Edit ${escapeHtml(item.item_name)}">
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
        </td>
        <td class="prizes-col-action">
          <button class="prizes-delete-btn" onclick="deletePrice(${item.id})" title="Remove" aria-label="Delete ${escapeHtml(item.item_name)}">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </td>
      `;
      pricesTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    pricesTableBody.innerHTML = '<tr><td colspan="4" class="prizes-empty-cell" style="color:#c00;">Failed to load prices</td></tr>';
  }
}

function editPrice(id, currentItemName, currentPrice) {
  const tr = document.getElementById(`price-row-${id}`);
  if (!tr) return;
  tr.innerHTML = `
    <td colspan="2" style="padding: 0.4rem 0.75rem;">
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <input type="text" class="prizes-field-input prizes-inline-input" id="edit-price-name-${id}" value="${escapeHtml(currentItemName)}" style="flex:2;" placeholder="Item name">
        <input type="text" class="prizes-field-input prizes-inline-input" id="edit-price-val-${id}" value="${escapeHtml(currentPrice)}" style="flex:1;min-width:70px;" placeholder="$">
      </div>
    </td>
    <td class="prizes-col-action">
      <button class="prizes-edit-btn prizes-save-btn" onclick="savePrice(${id})" title="Save">
        <span class="material-symbols-outlined" aria-hidden="true">check</span>
      </button>
    </td>
    <td class="prizes-col-action">
      <button class="prizes-delete-btn" onclick="loadPrices()" title="Cancel" style="border-color:var(--db-border);color:var(--db-ink-3);">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </td>
  `;
  document.getElementById(`edit-price-name-${id}`).focus();
}

async function savePrice(id) {
  const nameEl  = document.getElementById(`edit-price-name-${id}`);
  const priceEl = document.getElementById(`edit-price-val-${id}`);
  const item_name = nameEl ? nameEl.value.trim() : '';
  const price     = priceEl ? priceEl.value.trim() : '';
  if (!item_name || !price) { if (nameEl && !item_name) nameEl.focus(); return; }
  const unit = currentPriceSector === 'software' ? 'attempt' : 'minute';
  try {
    const res = await fetch(`/admin/prices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name, price, sector: currentPriceSector, unit })
    });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to update price');
    await loadPrices();
  } catch (err) { console.error(err); alert('Failed to update price'); }
}

async function deletePrice(id) {
  if (!confirm('Delete this price?')) return;
  try {
    const res = await fetch(`/admin/prices/${id}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('Failed to delete price');
    await loadPrices();
  } catch (err) { console.error(err); alert('Failed to delete price'); }
}
