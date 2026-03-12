const { KiteConnect } = require("kiteconnect");
const { saveToken } = require("./_sheets");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { request_token } = req.query;
    if (!request_token) return res.status(400).send("Missing request_token");

    const kite = new KiteConnect({ api_key: process.env.KITE_API_KEY });
    const session = await kite.generateSession(request_token, process.env.KITE_API_SECRET);
    const token = session.access_token;

    // Save token to Google Sheets so it persists across serverless calls
    await saveToken(token);

    console.log("Login successful, token saved to Google Sheets");

    res.send(`
      <html>
      <head><title>Login Successful</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:80px;background:#05080f;color:#00d68f;">
        <div style="font-size:48px;margin-bottom:20px;">✅</div>
        <h1 style="font-size:28px;margin-bottom:10px;">Login Successful!</h1>
        <p style="color:#7b92b8;font-size:14px;">Token saved securely. You can close this tab.</p>
        <script>
          setTimeout(function() {
            if (window.opener) {
              window.opener.postMessage("zerodha_login_success", "*");
              window.close();
            }
          }, 1500);
        </script>
      </body>
      </html>
    `);
  } catch (e) {
    console.error("Callback error:", e.message);
    res.status(500).send(`
      <html>
      <body style="font-family:sans-serif;text-align:center;padding:80px;background:#05080f;color:#ff3d6b;">
        <h1>Login Failed</h1>
        <p style="color:#7b92b8;">${e.message}</p>
        <p style="color:#7b92b8;font-size:12px;">Check your KITE_API_KEY and KITE_API_SECRET in Vercel environment variables.</p>
      </body>
      </html>
    `);
  }
};
