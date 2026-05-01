// Config loaded from config.js (CONFIG global)

// ── DOM References ──
const loginForm    = document.getElementById("loginForm");
const userInput    = document.getElementById("adminUser");
const passInput    = document.getElementById("adminPass");
const loginBtn     = document.getElementById("loginBtn");
const loginBtnText = document.getElementById("loginBtnText");
const loginBtnIcon = document.getElementById("loginBtnIcon");
const loginError   = document.getElementById("loginError");
const loginErrorText = document.getElementById("loginErrorText");
const togglePass   = document.getElementById("togglePass");
const togglePassIcon = document.getElementById("togglePassIcon");

// ── Password visibility toggle ──
togglePass.addEventListener("click", () => {
  const isHidden = passInput.type === "password";
  passInput.type = isHidden ? "text" : "password";
  togglePassIcon.textContent = isHidden ? "visibility_off" : "visibility";
});

// ── Form submit ──
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await attemptLogin();
});

// ── Allow Enter from either field ──
[userInput, passInput].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter") attemptLogin();
  });
});

async function attemptLogin() {
  const username = userInput.value.trim();
  const password = passInput.value;

  // Basic client-side validation
  if (!username) { shakeInput(userInput); return; }
  if (!password) { shakeInput(passInput); return; }

  hideError();
  setLoading(true);

  try {
    const res = await fetch(`${CONFIG.API_BASE}/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      // Successful login — redirect to admin dashboard
      loginBtnText.textContent = "Redirecting...";
      loginBtnIcon.textContent = "check_circle";
      window.location.href = "/admin/dashboard";
    } else {
      const data = await res.json().catch(() => ({}));
      showError(data.detail || "Invalid credentials. Please try again.");
      shakeInput(passInput);
      passInput.value = "";
      passInput.focus();
    }

  } catch (err) {
    console.error(err);
    showError("Could not reach the server — please check your connection.");
  } finally {
    if (loginBtnText.textContent !== "Redirecting...") {
      setLoading(false);
    }
  }
}

// ── UI Helpers ──
function setLoading(on) {
  loginBtn.disabled = on;
  loginBtnText.textContent = on ? "Signing in..." : "Sign In";
  loginBtnIcon.textContent = on ? "hourglass_empty" : "login";
}

function showError(msg) {
  loginErrorText.textContent = msg;
  loginError.classList.remove("hidden");
}

function hideError() {
  loginError.classList.add("hidden");
}

function shakeInput(input) {
  input.style.borderColor = "#c0522a";
  input.style.animation = "none";
  void input.offsetWidth; // force reflow
  input.style.animation = "shake 0.35s ease";
  setTimeout(() => {
    input.style.borderColor = "";
    input.style.animation = "";
    input.focus();
  }, 400);
}

// ── Inject shake keyframes ──
const style = document.createElement("style");
style.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60%  { transform: translateX(-6px); }
    40%,80%  { transform: translateX(6px); }
  }
`;
document.head.appendChild(style);
