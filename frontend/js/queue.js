// Config loaded from config.js (CONFIG global)

// ── Read token from URL ──────────────────────────────────────────────────────
const _urlToken = new URLSearchParams(window.location.search).get('token') || '';

// ── DOM References ───────────────────────────────────────────────────────────
const nameInput      = document.getElementById('name');
const phoneInput     = document.getElementById('phone');
const joinBtn        = document.getElementById('joinBtn');
const joinBtnText    = document.getElementById('joinBtnText');
const joinBtnIcon    = document.getElementById('joinBtnIcon');
const queueFormCard  = document.getElementById('queueFormCard');
const successCard    = document.getElementById('successCard');
const rejoinBtn      = document.getElementById('rejoinBtn');
const tokenErrorCard = document.getElementById('tokenErrorCard');
const tokenErrorMsg  = document.getElementById('tokenErrorMsg');
const tokenLoading   = document.getElementById('tokenLoading');

// ── Token Validation (runs on page load) ─────────────────────────────────────
async function validateToken() {
  // Show loading, hide everything else
  tokenLoading.classList.remove('hidden');
  queueFormCard.classList.add('hidden');
  tokenErrorCard.classList.add('hidden');

  if (!_urlToken) {
    showTokenError('No QR token found. Please scan the QR code provided by a crew member.');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE}/queue/validate-token?token=${encodeURIComponent(_urlToken)}`);
    if (res.ok) {
      // Token is valid — reveal the form
      tokenLoading.classList.add('hidden');
      queueFormCard.classList.remove('hidden');
      nameInput.focus();
    } else {
      const data = await res.json().catch(() => ({}));
      showTokenError(data.detail || 'This QR code has expired. Please ask a crew member for a fresh one.');
    }
  } catch {
    showTokenError('Could not verify your QR code — check your connection and try again.');
  }
}

function showTokenError(msg) {
  tokenLoading.classList.add('hidden');
  tokenErrorCard.classList.remove('hidden');
  queueFormCard.classList.add('hidden');
  if (tokenErrorMsg) tokenErrorMsg.textContent = msg;
}

// ── Join Queue ───────────────────────────────────────────────────────────────
async function addToQueue() {
  const name  = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !phone) {
    shakeInput(!name ? nameInput : phoneInput);
    return;
  }

  // Loading state
  joinBtn.disabled = true;
  joinBtnText.textContent = 'Joining...';
  joinBtnIcon.textContent = 'hourglass_empty';

  try {
    const res = await fetch(`${CONFIG.API_BASE}/queue/add`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body: JSON.stringify({ name, ph_num: phone, token: _urlToken }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Token became invalid (expired between validate and submit)
        showTokenError(errData.detail || 'Your QR code has expired. Please scan a fresh one.');
        return;
      }
      if (res.status === 429) {
        throw new Error(errData.detail || 'Please wait 5 seconds before joining again.');
      }
      if (res.status === 422) {
        if (Array.isArray(errData.detail) && errData.detail.length > 0) {
          throw new Error(errData.detail[0].msg.replace('Value error, ', ''));
        }
        throw new Error(errData.detail || 'Validation error');
      }
      throw new Error('Server error');
    }

    const result = await res.json();

    // Persist queue info for the status page
    localStorage.setItem(CONFIG.LS_PREFIX + 'queueNumber', result.queue_number);
    localStorage.setItem(CONFIG.LS_PREFIX + 'name', name);
    localStorage.setItem(CONFIG.LS_PREFIX + 'joinedAt', new Date().toISOString());

    // Redirect to the personal status page
    window.location.href = '/queue/status';

  } catch (err) {
    console.error(err);
    showInlineError(err.message === 'Server error' ? 'Failed to join queue — please try again.' : err.message);
  } finally {
    joinBtn.disabled = false;
    joinBtnText.textContent = 'Join the Queue';
    joinBtnIcon.textContent = 'arrow_forward';
  }
}

// ── Rejoin (show form again after success, if they somehow hit the button) ───
function showForm() {
  successCard.classList.add('hidden');
  queueFormCard.classList.remove('hidden');
  nameInput.focus();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function shakeInput(input) {
  input.style.borderColor = '#c0522a';
  input.style.animation   = 'none';
  void input.offsetWidth;
  input.style.animation = 'shake 0.35s ease';
  setTimeout(() => {
    input.style.borderColor = '';
    input.style.animation   = '';
    input.focus();
  }, 400);
}

function showInlineError(msg) {
  let existing = document.getElementById('inlineError');
  if (existing) existing.remove();
  const err = document.createElement('p');
  err.id = 'inlineError';
  err.style.cssText = 'color:#f0c96a; font-size:0.85rem; margin-top:0.75rem; text-align:center; display:flex; align-items:center; justify-content:center; gap:0.4rem;';
  err.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.1rem;">warning</span>' + escapeHtml(msg);
  joinBtn.after(err);
  setTimeout(() => err.remove(), 4000);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Shake keyframes
const _shakeStyle = document.createElement('style');
_shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60%  { transform: translateX(-6px); }
    40%,80%  { transform: translateX(6px); }
  }
`;
document.head.appendChild(_shakeStyle);

// ── Event Listeners ──────────────────────────────────────────────────────────
joinBtn.addEventListener('click', addToQueue);
if (rejoinBtn) rejoinBtn.addEventListener('click', showForm);
[nameInput, phoneInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') addToQueue(); });
});

// ── Kick off token validation immediately ────────────────────────────────────
validateToken();
