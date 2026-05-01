/* ============================================================
   config.js — Central configuration for all frontend scripts.
   Load this BEFORE any other JS file.
   ============================================================ */

const CONFIG = {
  // ── Server ──────────────────────────────────────────────────
  API_BASE: "makers.njcfuntasia.com",

  // ── localStorage key prefix ─────────────────────────────────
  // All queue keys are stored as  CONFIG.LS_PREFIX + 'keyName'
  LS_PREFIX: "fq_",

  // ── Auto-refresh intervals (milliseconds) ───────────────────
  STATUS_REFRESH_MS:    15000,   // queue status page
  DASHBOARD_REFRESH_MS: 15000,   // admin dashboard

  // ── Queue timing ─────────────────────────────────────────────
  MINS_PER_PERSON: 1.5,            // estimated minutes per player
};
