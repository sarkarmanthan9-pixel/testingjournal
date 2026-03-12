const axios = require("axios");

// ── Google Sheets helper via Apps Script Web App ──────────
// All data stored in Google Sheets — no database needed

const GSHEETS_URL = process.env.GSHEETS_WEBHOOK_URL;

async function sheetsRequest(action, payload = {}) {
  if (!GSHEETS_URL) throw new Error("GSHEETS_WEBHOOK_URL not set in environment variables");
  const response = await axios.post(GSHEETS_URL, { action, ...payload }, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000
  });
  return response.data;
}

// Save Zerodha access token to Google Sheets
async function saveToken(token) {
  return sheetsRequest("saveToken", { token });
}

// Read Zerodha access token from Google Sheets
async function getToken() {
  const result = await sheetsRequest("getToken");
  return result.token || null;
}

// Check if token exists and is from today
async function isLoggedIn() {
  try {
    const result = await sheetsRequest("getToken");
    if (!result.token || !result.date) return false;
    const today = new Date().toISOString().slice(0, 10);
    return result.date === today;
  } catch {
    return false;
  }
}

module.exports = { saveToken, getToken, isLoggedIn, sheetsRequest };
