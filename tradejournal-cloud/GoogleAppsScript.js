// ═══════════════════════════════════════════════════════════
// TradeJournal Pro — Google Apps Script
// Handles: Token storage + Trade backup
// Deploy as Web App → Anyone can access → copy URL to Vercel env
// ═══════════════════════════════════════════════════════════

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "saveToken") {
      return saveToken(data.token);
    } else if (action === "getToken") {
      return getToken();
    } else if (action === "backupTrades") {
      return backupTrades(data.trades || []);
    } else {
      // Default: treat as trade backup (backwards compatible)
      return backupTrades(data.trades || []);
    }
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === "getToken") return getToken();
  return ContentService.createTextOutput("TradeJournal Pro API is live ✅");
}

// ── Token Management ──────────────────────────────────────
function saveToken(token) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("_Auth");
  if (!sheet) sheet = ss.insertSheet("_Auth");
  sheet.clearContents();
  const today = new Date().toISOString().slice(0, 10);
  sheet.getRange("A1").setValue("token");
  sheet.getRange("B1").setValue(token);
  sheet.getRange("A2").setValue("date");
  sheet.getRange("B2").setValue(today);
  sheet.getRange("A3").setValue("updated");
  sheet.getRange("B3").setValue(new Date().toLocaleString("en-IN"));
  return respond({ success: true, message: "Token saved" });
}

function getToken() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("_Auth");
    if (!sheet) return respond({ token: null, date: null });
    const token = sheet.getRange("B1").getValue();
    const date = sheet.getRange("B2").getValue();
    return respond({ token: token || null, date: date || null });
  } catch (err) {
    return respond({ token: null, date: null, error: err.message });
  }
}

// ── Trade Backup ──────────────────────────────────────────
function backupTrades(trades) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Trades Sheet ──────────────────────────────────────
  let sheet = ss.getSheetByName("Trades");
  if (!sheet) sheet = ss.insertSheet("Trades");
  sheet.clearContents();

  const headers = [
    "Date", "Symbol", "Market", "Type", "Direction",
    "Entry ₹", "Exit ₹", "Qty", "Charges ₹", "Net P&L ₹", "P&L %",
    "Strategy", "Setup", "Timeframe", "Exit Reason", "Status",
    "Emotion", "Loss Reason", "Mistakes / Lessons", "Notes", "Tags", "Source"
  ];

  // Header row styling
  sheet.appendRow(headers);
  const hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setBackground("#0c1221");
  hRange.setFontColor("#3d7eff");
  hRange.setFontWeight("bold");
  hRange.setFontSize(9);
  hRange.setFontFamily("Consolas");

  // Data rows
  trades.forEach(function(t, i) {
    const row = [
      t.date || "",
      t.symbol || "",
      t.market || "",
      t.type || "",
      t.direction || "",
      parseFloat(t.entry || 0),
      t.exit ? parseFloat(t.exit) : "",
      parseInt(t.qty || 0),
      parseFloat(t.charges || 0).toFixed(2),
      parseFloat(t.pnl || 0).toFixed(2),
      t.exit && t.entry && t.qty
        ? ((parseFloat(t.pnl || 0) / (parseFloat(t.entry) * parseInt(t.qty))) * 100).toFixed(2) + "%"
        : "",
      t.strategy || "",
      typeof t.setup === "string" ? t.setup : (t.setup || []).join(", "),
      t.timeframe || "",
      t.exitReason || "",
      t.status || "",
      t.emotion || "",
      typeof t.lossReason === "string" ? t.lossReason : (t.lossReason || []).join(", "),
      t.mistakes || "",
      t.notes || "",
      Array.isArray(t.tags) ? t.tags.join(", ") : (t.tags || ""),
      t.zerodhaImport ? "Zerodha" : "Manual"
    ];

    sheet.appendRow(row);

    // Color P&L cell
    const pnlVal = parseFloat(t.pnl || 0);
    const pnlCell = sheet.getRange(i + 2, 10);
    if (pnlVal > 0) {
      pnlCell.setFontColor("#00d68f");
      pnlCell.setBackground("#00d68f10");
    } else if (pnlVal < 0) {
      pnlCell.setFontColor("#ff3d6b");
      pnlCell.setBackground("#ff3d6b10");
    }
  });

  sheet.autoResizeColumns(1, headers.length);

  // ── Summary Sheet ──────────────────────────────────────
  let sum = ss.getSheetByName("Summary");
  if (!sum) sum = ss.insertSheet("Summary");
  sum.clearContents();

  const closed = trades.filter(function(t) { return t.status === "CLOSED" && t.exit; });
  const totalPnL = closed.reduce(function(s, t) { return s + parseFloat(t.pnl || 0); }, 0);
  const wins = closed.filter(function(t) { return parseFloat(t.pnl || 0) > 0; });
  const losses = closed.filter(function(t) { return parseFloat(t.pnl || 0) < 0; });
  const winRate = closed.length ? ((wins.length / closed.length) * 100).toFixed(1) : 0;
  const avgWin = wins.length ? wins.reduce(function(s,t){ return s+parseFloat(t.pnl||0);},0)/wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce(function(s,t){return s+parseFloat(t.pnl||0);},0)/losses.length) : 0;
  const pf = avgLoss > 0 ? (avgWin * wins.length / (avgLoss * losses.length)).toFixed(2) : "∞";
  const totalCharges = trades.reduce(function(s,t){return s+parseFloat(t.charges||0);},0);

  const summaryData = [
    ["TradeJournal Pro — Performance Summary", "", new Date().toLocaleString("en-IN")],
    [],
    ["METRIC", "VALUE"],
    ["Total Closed Trades", closed.length],
    ["Net P&L", "₹" + totalPnL.toFixed(2)],
    ["Win Rate", winRate + "%"],
    ["Total Wins", wins.length],
    ["Total Losses", losses.length],
    ["Avg Win", "₹" + avgWin.toFixed(2)],
    ["Avg Loss", "₹" + avgLoss.toFixed(2)],
    ["Profit Factor", pf],
    ["Total Charges Paid", "₹" + totalCharges.toFixed(2)],
    ["Best Trade", wins.length ? "₹" + Math.max.apply(null, wins.map(function(t){return parseFloat(t.pnl||0);})).toFixed(2) : "—"],
    ["Worst Trade", losses.length ? "₹" + Math.min.apply(null, losses.map(function(t){return parseFloat(t.pnl||0);})).toFixed(2) : "—"],
    [],
    ["Last Backup", new Date().toLocaleString("en-IN")],
    ["Total Trades in Sheet", trades.length]
  ];

  summaryData.forEach(function(row) { sum.appendRow(row); });

  // Style summary
  sum.getRange("A1").setFontSize(13).setFontWeight("bold").setFontColor("#3d7eff");
  sum.getRange("A3:B3").setBackground("#0c1221").setFontColor("#3d7eff").setFontWeight("bold");

  // Color total P&L
  const pnlSumCell = sum.getRange("B5");
  if (totalPnL >= 0) pnlSumCell.setFontColor("#00d68f").setFontWeight("bold");
  else pnlSumCell.setFontColor("#ff3d6b").setFontWeight("bold");

  sum.autoResizeColumns(1, 2);

  return respond({ success: true, count: trades.length, message: trades.length + " trades backed up!" });
}

// ── Helper ────────────────────────────────────────────────
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
