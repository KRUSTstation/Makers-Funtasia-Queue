// Config loaded from config.js (CONFIG global)

// ── DOM References ──
const nameInput  = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const joinBtn    = document.getElementById("joinBtn");
const joinBtnText = document.getElementById("joinBtnText");
const joinBtnIcon = document.getElementById("joinBtnIcon");
const queueDiv   = document.getElementById("queue");
const queueFormCard = document.getElementById("queueFormCard");
const successCard   = document.getElementById("successCard");
const rejoinBtn     = document.getElementById("rejoinBtn");
const refreshBtn    = document.getElementById("refreshBtn");

// ── Join Queue ──
async function addToQueue() {
  const name  = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !phone) {
    shakeInput(!name ? nameInput : phoneInput);
    return;
  }

  // Loading state
  joinBtn.disabled = true;
  joinBtnText.textContent = "Joining...";
  joinBtnIcon.textContent = "hourglass_empty";

  try {
    const res = await fetch(`${CONFIG.API_BASE}/queue/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ph_num: phone })
    });

    if (!res.ok) throw new Error("Server error");
    const result = await res.json();

    // Persist queue info for the status page
    localStorage.setItem(CONFIG.LS_PREFIX + 'queueNumber', result.queue_number);
    localStorage.setItem(CONFIG.LS_PREFIX + 'name', name);
    localStorage.setItem(CONFIG.LS_PREFIX + 'joinedAt', new Date().toISOString());

    // Redirect to the personal status page
    window.location.href = '/queue/status';

  } catch (err) {
    console.error(err);
    showInlineError("Failed to join queue — please try again.");
  } finally {
    joinBtn.disabled = false;
    joinBtnText.textContent = "Join the Queue";
    joinBtnIcon.textContent = "arrow_forward";
  }
}

// ── Load Queue ──
async function loadQueue() {
  try {
    const res  = await fetch(`${API_BASE}/queue/get`);
    const data = await res.json();

    queueDiv.innerHTML = "";

    if (!data.length) {
      queueDiv.innerHTML = '<p class="queue-empty"><span class="material-symbols-outlined queue-empty-icon">celebration</span> Queue is empty — be the first to join!</p>';
      return;
    }

    data.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "queue-item";
      div.innerHTML = `
        <span class="queue-num">#${index + 1}</span>
        <span>${escapeHtml(item.name)}</span>
      `;
      queueDiv.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    queueDiv.innerHTML = '<p class="queue-empty">Could not load queue — check your connection.</p>';
  }
}

// ── Rejoin (show form again) ──
function showForm() {
  successCard.classList.add("hidden");
  queueFormCard.classList.remove("hidden");
  nameInput.focus();
}

// ── Helpers ──
function shakeInput(input) {
  input.style.borderColor = "#c0522a";
  input.style.animation = "none";
  // Force reflow then add shake
  void input.offsetWidth;
  input.style.animation = "shake 0.35s ease";
  setTimeout(() => {
    input.style.borderColor = "";
    input.style.animation = "";
    input.focus();
  }, 400);
}

function showInlineError(msg) {
  let existing = document.getElementById("inlineError");
  if (existing) existing.remove();

  const err = document.createElement("p");
  err.id = "inlineError";
  err.style.cssText = "color:#f0c96a; font-size:0.85rem; margin-top:0.75rem; text-align:center; display:flex; align-items:center; justify-content:center; gap:0.4rem;";
  err.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.1rem;">warning</span>' + escapeHtml(msg);
  joinBtn.after(err);
  setTimeout(() => err.remove(), 4000);
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Add shake keyframes dynamically ──
const style = document.createElement("style");
style.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60%  { transform: translateX(-6px); }
    40%,80%  { transform: translateX(6px); }
  }
`;
document.head.appendChild(style);

// ── Event Listeners ──
joinBtn.addEventListener("click", addToQueue);
rejoinBtn.addEventListener("click", showForm);
refreshBtn.addEventListener("click", () => {
  const refreshIcon = refreshBtn.querySelector(".refresh-icon");
  const refreshText = document.getElementById("refreshBtnText");
  if (refreshIcon) refreshIcon.style.animation = "spin 0.6s linear infinite";
  if (refreshText) refreshText.textContent = "Refreshing…";
  loadQueue().then(() => {
    if (refreshIcon) refreshIcon.style.animation = "";
    if (refreshText) refreshText.textContent = "Refresh";
  });
});

// Allow Enter key to submit
[nameInput, phoneInput].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter") addToQueue();
  });
});

// ── Initial Load ──
loadQueue();