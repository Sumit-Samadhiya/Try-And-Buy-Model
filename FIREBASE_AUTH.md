# Firebase phone authentication

Firebase Web config is in `sevenshadesfrontend/src/firebase.js`. Login, signup and password reset use invisible reCAPTCHA, Firebase SMS confirmation, then POST the Firebase ID token to `/api/auth/firebase-login/`.

## Backend setup

From the Django folder, using the project's virtual environment:

```powershell
python -m pip install -r requirements.txt
python manage.py migrate
```

`firebase-admin` is already in requirements. For frontend dependencies run `npm ci` in `sevenshadesfrontend`.

For local development the service account is read from `sevenshades/ry-and-buy-auth-firebase-adminsdk.json`. It is ignored by Git and must never be copied to the frontend or committed.

For Render use a secret file and set `FIREBASE_CREDENTIALS_PATH` to its absolute path, or set `FIREBASE_SERVICE_ACCOUNT_JSON` to the full service-account JSON in Render's secret environment settings. Set `FIREBASE_PROJECT_ID=ry-and-buy-auth`. Do not paste the private key into source code. Restart/redeploy the backend after changing credentials.

## Firebase Console

Enable the Phone sign-in provider; configure SMS region policy for India and the billing/quota required by your Firebase plan. Add `try-and-buy-model.vercel.app` to Authentication authorized domains. Configure development domains explicitly when testing locally. For automated/manual development tests use Firebase's configured fictional phone numbers and codes; no hardcoded universal OTP bypass is present.

Official setup: https://firebase.google.com/docs/auth/web/phone-auth
Token verification: https://firebase.google.com/docs/auth/admin/verify-id-tokens

## Endpoint contract

Login: `{ "id_token": "<Firebase ID token>" }`.
Signup: add `purpose: "signup"`, `fname`, `lname`, `emailid`, `password`, `confirm_password`.
Password reset: add `purpose: "reset"`, `password`, `confirm_password`.

The backend requires a recent (5-minute) phone-provider authentication with an Indian E.164 number, verifies signature/project/revocation through Firebase Admin, then links the existing phone-based customer record. Existing customer/order relationships remain intact. Signup cannot overwrite an existing account; reset changes the password and invalidates older application JWTs/sessions through the account password fingerprint.

Response: `token`, `token_type: "Bearer"`, `expires_in: 3600`, safe `user` and legacy-compatible `data`. Browser stores only the application's JWT under `sevenshades_token`, sends it on API requests and revokes/removes it at logout. A Django session is also established for existing panel/WebSocket compatibility. Token expiry requires sign-in again.

Old Fast2SMS and legacy OTP routes return HTTP 410. They cannot send SMS, accept development OTPs, create an account, or reset a password. Password login remains supported for customer/admin/rider accounts. No online payment changes are part of this migration.

## Verification

Focused backend tests: `python manage.py test sevenshadesapp.test_firebase_auth`.
Frontend tests cover Firebase confirmation/exchange, reset payload, JWT transport/logout and protected route session handling. Legacy Fast2SMS test suites describe retired routes and are not evidence for the new Firebase flow.

After deployment, verify SMS on an authorized domain, submit the received code, confirm `/api/auth_session`, reload a protected customer page, log out, and verify the revoked JWT is rejected. A successful mocked test does not verify Firebase Console settings, SMS delivery, or Render secret configuration.

Local verification on 2026-09-26: 19 backend Firebase/validation tests passed, 12 frontend authentication/session tests passed, and the production frontend build compiled successfully. Firebase Admin initialized locally for project `ry-and-buy-auth` using the existing ignored service-account file. Real SMS and hosted deployment verification remain pending redeployment and Firebase Console configuration.
