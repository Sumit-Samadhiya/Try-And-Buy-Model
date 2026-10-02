# Security Architecture & Policies

## 1. Secrets Management
- **Zero Secrets in Git:** No Firebase credentials, Cloudinary secrets, database connection strings, or Django `SECRET_KEY` values can ever be committed to git.
- **Environment Variables:** All secrets are passed via `.env` files in development and host environment dashboards in production (Vercel & Render).
- **Template:** All required keys are documented with safe placeholders in `.env.example`.

---

## 2. Authentication & Session Security
- **Customer Authentication:** Firebase Phone Auth with invisible reCAPTCHA prevents automated credential stuffing and bot spam.
- **Admin & Rider Authentication:** Password hashing using PBKDF2 / Django standards.
- **Session Tokens:** Transmitted via secure, HttpOnly, and SameSite cookies to protect against XSS token harvesting.

---

## 3. Request Authorization & CSRF Protection
- **CSRF Token Handshake:** State-changing requests (`POST`, `PUT`, `DELETE`) require `HTTP_X_CSRFTOKEN` header validated against backend secret.
- **Role Isolation:**
  - Customer routes: Protected via session role check (`role === 'customer'`).
  - Rider routes: Protected via rider token check (`role === 'rider'`).
  - Admin routes: Protected via `@require_admin_login` decorator.
- **Resource Ownership:** Users can only view and mutate their own orders and support tickets.

---

## 4. Input Validation & Data Integrity
- Phone numbers must be valid 10-digit Indian mobile numbers (`^[6-9]\d{9}$`).
- Pincodes must be 6 digits and validated against serviceable residential hubs.
- Uploaded media paths are strictly canonicalized through `canonical_media_path` to prevent path traversal vulnerabilities.
