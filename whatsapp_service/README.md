# WhatsApp Baileys Microservice (Zero-Cost / Paperwork-Free OTP Engine)

Self-hosted WhatsApp socket engine using `@whiskeysockets/baileys` to dispatch authentication OTPs directly to users on WhatsApp without Meta Business API costs or paperwork.

---

## 🚀 Quick Start & Pairing Instructions

### 1. Start the Microservice
```bash
cd whatsapp_service
npm install
npm start
```
By default, the service starts on `http://127.0.0.1:5001`.

### 2. Scan QR Code (One-time Setup)
Once started:
1. **In Terminal:** A QR code is rendered directly in your command line terminal.
2. **In Browser:** Open [http://localhost:5001/qr](http://localhost:5001/qr) for a high-resolution QR page that automatically refreshes every few seconds.
3. Open **WhatsApp** on your phone > **Linked Devices** > **Link a Device**.
4. Scan the QR code.

---

## 🗄️ PostgreSQL Persistence on Render (No Session Loss)
Render and similar container clouds have an **ephemeral filesystem** (local files are wiped on server restart/sleep). To prevent losing WhatsApp credentials and needing a new QR scan every time:
1. Set the `DATABASE_URL` environment variable on Render (e.g. your existing PostgreSQL connection string).
2. The service automatically creates and maintains the `whatsapp_sessions` table:
   ```sql
   CREATE TABLE IF NOT EXISTS whatsapp_sessions (
     session_id VARCHAR(128) PRIMARY KEY,
     data TEXT NOT NULL,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```
3. All cryptographic keys and credentials are automatically UPSERTed to PostgreSQL on each update and restored on boot.
4. **Fallback:** If `DATABASE_URL` is omitted, the service safely falls back to local filesystem storage (`./auth_info_baileys`).

---

## 📡 API Endpoints

- **`GET /status`**
  Check connection status, linked account JID, reconnect attempts, and active `authStoreType` (`postgresql` or `filesystem`).

- **`GET /health`**
  Lightweight health status returning `status: "connected" | "waiting_qr"`.

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

## 🧪 Testing Auth Store
Run the database auth adapter test suite:
```bash
npm test
```
