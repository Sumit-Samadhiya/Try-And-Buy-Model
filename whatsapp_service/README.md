# WhatsApp Baileys Microservice (Zero-Cost / Paperwork-Free OTP Engine)

Self-hosted WhatsApp socket engine using `@whiskeysockets/baileys` to dispatch authentication OTPs directly to users on WhatsApp without Meta Business API costs or paperwork.

---

## 🚀 Quick Start & Pairing Instructions

### 1. Start the Microservice
```bash
cd whatsapp_service
npm start
```
By default, the service starts on `http://127.0.0.1:5001`.

### 2. Scan QR Code (One-time Setup)
Once started:
1. **In Terminal:** A QR code is rendered directly in your command line terminal.
2. **In Browser:** Open [http://localhost:5001/qr](http://localhost:5001/qr) for a high-resolution QR page that automatically refreshes every few seconds.
3. Open **WhatsApp** on your phone > **Linked Devices** > **Link a Device**.
4. Scan the QR code.

Once scanned, your authentication session is safely persisted in `./auth_info_baileys/`. You will **not** need to scan again on server restarts.

---

## 📡 API Endpoints

- **`GET /status`**
  Check connection status, current JID, and whether a QR code is waiting to be scanned.

- **`GET /qr`**
  Browser-friendly web UI displaying the QR code with auto-refresh.

- **`POST /send-otp`**
  ```json
  {
    "phone": "9876543210",
    "otp": "123456"
  }
  ```
  Dispatches message:
  `"Your verification code is: 123456. Valid for 5 minutes. Please do not share this code."`

---

## 🔒 Security & Persistence
- Session keys are saved to `./auth_info_baileys` which is ignored by `.gitignore` to prevent leaking private credentials.
- Auto-reconnect handles network blips and socket drops automatically (unless explicitly unlinked from WhatsApp).
