const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { webhookUrl, trades } = req.body;
    const url = webhookUrl || process.env.GSHEETS_WEBHOOK_URL;
    if (!url) return res.status(400).json({ error: "No Google Sheets webhook URL configured" });

    await axios.post(url, { action: "backupTrades", trades }, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000
    });

    res.json({ success: true, count: trades.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
