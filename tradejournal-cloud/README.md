# TradeJournal Pro ☁️
### Professional Trading Journal — Zerodha + Vercel + Google Sheets

Access from anywhere: phone, any PC, no local server needed.

---

## Setup Guide (One Time — 20 mins)

### Step 1 — Google Sheets Setup

1. Go to [sheets.google.com](https://sheets.google.com) → Create new sheet → Name it **"TradeJournal Pro"**
2. Click **Extensions → Apps Script**
3. Delete all existing code
4. Open `GoogleAppsScript.js` from this repo → Copy all → Paste → Save (Ctrl+S)
5. Click **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy → Authorize → Allow**
7. **Copy the Web App URL** — looks like:
   `https://script.google.com/macros/s/XXXXXXXX/exec`
8. Save this URL — you'll need it in Step 3

---

### Step 2 — Zerodha Kite Connect

1. Go to [kite.trade](https://kite.trade) → Login → **Create New App**
2. App name: `TradeJournal Pro`
3. Redirect URL: `https://YOUR-VERCEL-URL.vercel.app/api/callback`
   *(You'll get this URL after Step 3 — update it then)*
4. Save your **API Key** and **API Secret**

---

### Step 3 — Deploy on Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
3. Add these **Environment Variables** in Vercel dashboard:

| Variable | Value |
|---|---|
| `KITE_API_KEY` | Your Zerodha API Key |
| `KITE_API_SECRET` | Your Zerodha API Secret |
| `GSHEETS_WEBHOOK_URL` | The URL from Step 1 |

4. Click **Deploy**
5. Copy your Vercel URL (e.g. `https://tradejournal-xxx.vercel.app`)
6. Go back to Zerodha Kite Connect → Update Redirect URL to `https://YOUR-URL.vercel.app/api/callback`

---

### Step 4 — Daily Usage

1. Open your Vercel URL on any device
2. Click **"Login with Zerodha"** → Complete login
3. Start trading! ✅

**Login expires daily** — login once every morning.

---

## File Structure

```
tradejournal-pro/
├── api/                      # Vercel serverless functions
│   ├── login-url.js          # GET /api/login-url
│   ├── callback.js           # GET /api/callback (Zerodha redirect)
│   ├── status.js             # GET /api/status
│   ├── profile.js            # GET /api/profile
│   ├── orders.js             # GET /api/orders
│   ├── positions.js          # GET /api/positions
│   ├── holdings.js           # GET /api/holdings
│   ├── margins.js            # GET /api/margins
│   ├── backup-gsheets.js     # POST /api/backup-gsheets
│   ├── _kite.js              # Shared Zerodha helper
│   ├── _sheets.js            # Shared Google Sheets helper
│   └── package.json
├── src/
│   ├── App.js                # Main React app
│   └── index.js
├── public/
│   └── index.html
├── GoogleAppsScript.js       # Paste this in Google Apps Script
├── package.json
├── vercel.json
└── README.md
```

---

## How Data is Stored

| Data | Where |
|---|---|
| Zerodha token | Google Sheets (_Auth tab) — refreshes daily |
| Your trades | Browser localStorage + Google Sheets backup |
| Settings | Browser localStorage |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `KITE_API_KEY` | ✅ | From kite.trade app |
| `KITE_API_SECRET` | ✅ | From kite.trade app |
| `GSHEETS_WEBHOOK_URL` | ✅ | Google Apps Script web app URL |
