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

    // Sort data: place 'done' items at the bottom, maintain relative order otherwise
    data.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return 0;
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
        <td colspan="5">
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
        <td colspan="5">
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
