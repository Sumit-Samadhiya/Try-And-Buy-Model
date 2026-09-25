# Mobile OTP authentication

## Latest live provider diagnosis

One authorized live send attempt returned HTTP 400 / Fast2SMS status_code 996:
"Before using OTP Message API, complete website verification. Visit OTP Message menu or use DLT SMS API."
Complete website verification in the account's OTP Message menu before retrying.
This is the actual provider response, not an inferred wallet/key issue. OTP delivery
has not succeeded. Do not repeatedly send requests or switch routes without the
account/template requirements being met.

Debug mode now logs response HTTP status and response text (bounded to 4,000 characters,
with API key, destination phone and OTP redacted) and returns the provider message.
Production keeps generic customer-facing errors. This supersedes the earlier statement
that raw provider message text is never returned. Authorization keys are stripped;
phone whitespace is trimmed and country-code-prefixed numbers remain invalid.

Implemented in the existing Django + React application. Customer identity remains
`SignUp.mobileno`; this avoids creating a separate Django User that cannot own orders.
Migration 0039 permits a null email for mobile-only accounts, preserving uniqueness
for real email addresses. Mobile-only accounts have an unusable password. Existing
password accounts, signup with personal details, and password recovery remain supported.

## Install and configure

In a Python 3.12 virtual environment:

```powershell
python -m pip install -r sevenshades/requirements.txt
# Newly added dependency (Requests and DRF already existed):
python -m pip install PyJWT==2.10.1
cd sevenshades
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

`START_PROJECT.bat` remains the normal Windows entry point. Restart an already-running
backend after configuring the key. Backend setting `FAST2SMS_API_KEY` reads the
environment first, then ignored local file `sevenshades/.fast2sms-key`. Never place the
key in React, committed settings, screenshots or logs. Rotate the key shared in chat
before deployment. No real SMS is sent by automated tests.

When a key is configured, real random OTPs are used even with DEBUG/test mode enabled.
Without a key, the previous 123456 development behavior requires both DEBUG and
OTP_TEST_MODE; production without a provider fails closed. Set `REDIS_URL` for shared
OTP/lock/rate-limit/revocation storage in production or any multi-process deployment.
The default local-memory cache is suitable only for a single local process and loses
OTPs/revocations on restart. Use HTTPS and a private, access-controlled Redis service.

Provider transport follows the Fast2SMS authorization reference:
https://docs.fast2sms.com/reference/authorization

The request is POST https://www.fast2sms.com/dev/bulkV2 with authorization and
Content-Type application/json headers and `{route: 'otp', variables_values: code,
numbers: phone}`. The code requires a successful HTTP response and JSON `return: true`.
Timeout, malformed JSON and provider rejection return a sanitized 502, never raw
provider messages that could disclose request details. API acceptance does not prove
handset delivery; account balance/provider permissions must be verified with a real phone.

## API contract

All unauthenticated browser POST requests retain this application's CSRF protection.
First GET `/api/auth_csrf`, preserve its cookies, and send the returned `csrfToken`
as the `X-CSRFToken` header on POST. React's existing helper already does this.
Postman/native clients can perform the same bootstrap with a cookie jar.

### POST /api/auth/send-otp/

```json
{"phone":"9876543210"}
```

Phone is a 10-digit Indian mobile starting 6–9, without +91. Generates a cryptographically
random six-digit code; leading zeroes are valid. Cache key `otp_<phone>` stores an HMAC
hash plus attempt/expiry metadata for **300 seconds**, rather than exposing plaintext
OTP in cache. Successful response:

```json
{"status":true,"message":"OTP sent to your mobile number.","data":{"expires_in":300,"resend_after":60,"test_mode":false}}
```

60-second resend cooldown; up to 10 sends/hour/phone and 30/hour/source IP on these
endpoints. Trust proxy headers only after configuring a trusted proxy; code currently
uses REMOTE_ADDR, not arbitrary forwarded headers. Failed provider requests consume
throttle budget and do not leave a usable OTP. Resend replaces the earlier code.

### POST /api/auth/verify-otp/

```json
{"phone":"9876543210","otp":"123456"}
```

Use the actual SMS code, not the example. OTP compares in constant time; five failed
guesses invalidate it. Phone-scoped cache locks serialize issuance/verification.
Success deletes the OTP, gets/creates the customer, establishes the existing browser
session, and returns:

```json
{"status":true,"token":"<JWT>","token_type":"Bearer","expires_in":3600,"created":true,"data":[{"mobileno":"9876543210","fname":"","lname":"","emailid":null}]}
```

JWT is HS256, one-hour lifetime, with fixed issuer/audience, customer-only role and
current password fingerprint. Use `Authorization: Bearer <JWT>` on existing customer
APIs; customer tokens cannot access admin/rider operations. Valid bearer requests do
not require cookie CSRF. Browser React uses the HttpOnly session cookie instead and
does not persist JWT in localStorage. `/api/auth_session` works with either mechanism.
`/api/auth_logout` revokes the presented JWT and clears the browser session. Password
reset invalidates old sessions/tokens. There is no refresh token: verify a new OTP
after JWT expiry. Logging out one JWT does not revoke other devices' tokens.

Errors use `status:false` with a clear message: 400 invalid input/code/expired/used/
locked OTP, 403 missing CSRF, 429 throttling/busy request, 502 provider error, 503
unconfigured provider, 401 invalid/expired bearer token.

## Existing screens and compatibility

Login with OTP calls the new send/verify endpoints and can create a mobile-only
customer automatically. The detailed signup and forgot-password screens keep their
purpose/session-bound `otp_request`, `signup_submit` and `reset_password` APIs, now
using the same Fast2SMS transport with secure random codes. Those legacy challenges
remain hashed in OtpChallenge with their existing expiry/attempt limits. Login codes
cannot be substituted for a password-reset or signup challenge.

## File map

- `sevenshadesapp/mobile_auth_views.py`: requested send/verify views.
- `sevenshadesapp/mobile_auth_serializers.py`: request serializers (separate from the legacy singular `serializer.py`).
- `sevenshadesapp/sms_provider.py`: transport and code generation.
- `sevenshadesapp/mobile_tokens.py`: JWT creation, validation and revocation.
- `sevenshades/urls.py`, `sevenshades/settings.py`: routes and configuration.
- `sevenshadesapp/security.py`, `auth_views.py`: bearer/session integration.
- `sevenshadesapp/otp_views.py`: existing signup/reset delivery integration.
- `sevenshadesapp/test_mobile_auth.py`: mocked provider and authentication regression tests.
- Frontend `src/userinterface/screens/CustomerAuth.js` and its test: user-facing integration.

Run backend tests with `python manage.py test sevenshadesapp.test_mobile_auth sevenshadesapp.test_otp sevenshadesapp.test_security --noinput`.
Tests override the key and mock SMS; do not send live SMS in a regression suite.

## Verification for this change

- Focused authentication/security suite: 36 tests passed.
- Full frontend suite: 39 tests passed across 15 suites.
- Full backend suite: 105 of 109 passed. Four failures/errors are in the existing
  PaymentRecoveryTests, whose fixtures create current COD orders while expecting the
  older AWAITING_TRIAL_PAYMENT flow. No checkout/payment business logic was changed
  in this authentication task; do not represent the full backend suite as passing.
- Migration consistency check passed; local migration 0039 applied successfully.
- Supplied key stored in the ignored backend local configuration; no live SMS or
  handset-delivery test was performed.
