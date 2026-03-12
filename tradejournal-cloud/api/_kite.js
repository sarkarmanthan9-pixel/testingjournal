const { KiteConnect } = require("kiteconnect");
const { getToken, isLoggedIn } = require("./_sheets");

// Helper to get authenticated kite instance
async function getKite() {
  const token = await getToken();
  if (!token) throw new Error("Not logged in. Please login with Zerodha first.");
  const kite = new KiteConnect({ api_key: process.env.KITE_API_KEY });
  kite.setAccessToken(token);
  return kite;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── /api/status ───────────────────────────────────────────
module.exports.status = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const loggedIn = await isLoggedIn();
    res.json({ loggedIn });
  } catch (e) {
    res.json({ loggedIn: false });
  }
};

// ── /api/profile ──────────────────────────────────────────
module.exports.profile = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const kite = await getKite();
    res.json(await kite.getProfile());
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// ── /api/orders ───────────────────────────────────────────
module.exports.orders = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const kite = await getKite();
    res.json(await kite.getOrders());
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// ── /api/positions ────────────────────────────────────────
module.exports.positions = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const kite = await getKite();
    res.json(await kite.getPositions());
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// ── /api/holdings ─────────────────────────────────────────
module.exports.holdings = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const kite = await getKite();
    res.json(await kite.getHoldings());
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// ── /api/margins ──────────────────────────────────────────
module.exports.margins = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const kite = await getKite();
    res.json(await kite.getMargins());
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
