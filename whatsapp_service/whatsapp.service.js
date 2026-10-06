/**
 * WhatsApp Baileys Service
 * Handles WebSocket connection to WhatsApp Web, multi-file authentication persistence,
 * QR code generation, auto-reconnection, and sending OTP messages.
 */

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const AUTH_FOLDER = process.env.AUTH_FOLDER || path.join(__dirname, 'auth_info_baileys');

let sock = null;
let currentQr = null;
let isConnected = false;
let userJid = null;
let reconnectAttempts = 0;

async function startWhatsApp() {
  if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`[WhatsApp Service] Starting Baileys (WA version: ${version.join('.')}, isLatest: ${isLatest})...`);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['Doordrape OTP Engine', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      console.log('\n======================================================');
      console.log('[WhatsApp Service] Scan this QR code with WhatsApp (Linked Devices):');
      console.log('======================================================\n');
      qrcodeTerminal.generate(qr, { small: true });
      console.log('======================================================\n');
    }

    if (connection === 'open') {
      isConnected = true;
      currentQr = null;
      reconnectAttempts = 0;
      userJid = sock.user ? sock.user.id : null;
      console.log(`\n✅ [WhatsApp Service] Connected successfully as ${userJid}`);
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ [WhatsApp Service] Connection closed. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        reconnectAttempts++;
        const delay = Math.min(3000 * reconnectAttempts, 15000);
        console.log(`[WhatsApp Service] Reconnecting in ${delay / 1000}s...`);
        setTimeout(() => {
          startWhatsApp();
        }, delay);
      } else {
        console.log('❌ [WhatsApp Service] Logged out. Clearing auth folder to request new QR...');
        currentQr = null;
        try {
          fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        } catch (_) {}
        setTimeout(() => startWhatsApp(), 2000);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}

/**
 * Send WhatsApp OTP to customer's phone number
 * @param {string} phoneNumber - 10-digit Indian mobile number or international number
 * @param {string|number} otpCode - 6-digit numeric OTP code
 */
async function sendWhatsAppOtp(phoneNumber, otpCode) {
  if (!sock || !isConnected) {
    const err = new Error('WhatsApp service is not connected. Please scan QR or wait for connection.');
    err.code = 'WHATSAPP_DISCONNECTED';
    throw err;
  }

  let cleaned = String(phoneNumber).replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  const jid = `${cleaned}@s.whatsapp.net`;
  const messageText = `Your verification code is: ${otpCode}. Valid for 5 minutes. Please do not share this code.`;

  try {
    const sent = await sock.sendMessage(jid, { text: messageText });
    return {
      success: true,
      messageId: sent?.key?.id,
      jid,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`[WhatsApp Service] Failed to send OTP to ${jid}:`, error);
    throw error;
  }
}

function getStatus() {
  return {
    isConnected,
    userJid,
    hasQr: !!currentQr,
    currentQr,
    reconnectAttempts,
  };
}

module.exports = {
  startWhatsApp,
  sendWhatsAppOtp,
  getStatus,
};
