const { KiteConnect } = require("kiteconnect");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const kite = new KiteConnect({ api_key: process.env.KITE_API_KEY });
    const url = kite.getLoginURL();
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
