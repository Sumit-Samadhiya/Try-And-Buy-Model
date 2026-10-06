require('dotenv').config();
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { startWhatsApp, sendWhatsAppOtp, getStatus } = require('./whatsapp.service');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Start WhatsApp Baileys engine
startWhatsApp().catch((err) => {
  console.error('[WhatsApp Service] Startup error:', err);
});

// Health & Status endpoint
app.get('/status', (req, res) => {
  const status = getStatus();
  res.json({
    status: 'ok',
    ...status,
  });
});

app.get('/health', (req, res) => {
  const status = getStatus();
  res.json({
    status: status.isConnected ? 'connected' : 'waiting_qr',
    connected: status.isConnected,
    user: status.userJid,
  });
});

// Web-based QR Code Display page for convenient phone camera scanning
app.get('/qr', async (req, res) => {
  const status = getStatus();

  if (status.isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>WhatsApp OTP Service - Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; text-align: center; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); border: 1px solid #334155; }
            .badge { background: #059669; color: #fff; padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 14px; display: inline-block; margin-bottom: 1rem; }
            h2 { margin: 0 0 0.5rem; }
            p { color: #94a3b8; font-size: 14px; margin: 0.5rem 0 1.5rem; }
            .jid { font-family: monospace; background: #0f172a; padding: 8px 14px; border-radius: 8px; color: #34d399; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Connected</span>
            <h2>WhatsApp Engine Active</h2>
            <p>Your WhatsApp account is linked and ready to send OTP messages.</p>
            <div class="jid">Account: ${status.userJid || 'Linked'}</div>
          </div>
        </body>
      </html>
    `);
  }

  if (!status.currentQr) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>WhatsApp OTP Service - Initializing</title>
          <meta http-equiv="refresh" content="3">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; text-align: center; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); border: 1px solid #334155; }
            .loader { border: 4px solid #334155; border-top: 4px solid #10b981; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 1.5rem auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            p { color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Initializing Baileys...</h2>
            <div class="loader"></div>
            <p>Connecting to WhatsApp Web socket and generating QR code. This page will refresh automatically.</p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(status.currentQr, { width: 300, margin: 2 });
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scan WhatsApp QR Code</title>
          <meta http-equiv="refresh" content="15">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #022c22; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
            .card { background: #064e3b; padding: 2rem; border-radius: 20px; text-align: center; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); }
            h2 { margin: 0 0 0.5rem; font-size: 22px; font-weight: 800; }
            p { color: #cbd5e1; font-size: 14px; margin: 0.5rem 0 1.5rem; line-height: 1.5; }
            .qr-box { background: #ffffff; padding: 16px; border-radius: 16px; display: inline-block; box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
            .qr-box img { display: block; border-radius: 8px; }
            .steps { text-align: left; background: rgba(0,0,0,0.25); padding: 1rem; border-radius: 12px; margin-top: 1.5rem; font-size: 13px; color: #e2e8f0; }
            .steps ol { margin: 0; padding-left: 1.2rem; }
            .steps li { margin-bottom: 0.4rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Link WhatsApp Number</h2>
            <p>Scan this QR code to activate the zero-cost WhatsApp OTP sender engine.</p>
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="WhatsApp QR Code" width="280" height="280" />
            </div>
            <div class="steps">
              <ol>
                <li>Open WhatsApp on your phone</li>
                <li>Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong> > <strong>Linked Devices</strong></li>
                <li>Tap <strong>Link a Device</strong> and point your camera at this QR code</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error generating QR code image');
  }
});

// Send OTP endpoint
app.post('/send-otp', async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Both "phone" and "otp" are required.',
    });
  }

  try {
    const result = await sendWhatsAppOtp(phone, otp);
    return res.json({
      success: true,
      message: 'WhatsApp OTP message dispatched successfully.',
      data: result,
    });
  } catch (err) {
    console.error('[WhatsApp Service] Error in /send-otp:', err.message);
    const isDisconnected = err.code === 'WHATSAPP_DISCONNECTED';
    return res.status(isDisconnected ? 503 : 500).json({
      success: false,
      message: isDisconnected
        ? 'WhatsApp service is temporarily unavailable. Please scan QR or wait for connection.'
        : `Failed to send WhatsApp OTP: ${err.message}`,
      error: err.code || 'SEND_FAILED',
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 [WhatsApp Service] Listening on http://localhost:${PORT}`);
  console.log(`👉 Open http://localhost:${PORT}/qr in your browser to scan the QR code!`);
});
