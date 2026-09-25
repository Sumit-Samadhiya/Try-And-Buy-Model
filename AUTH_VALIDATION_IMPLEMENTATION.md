# Authentication and validation update

Customer pages: /signindisplay, /signupdisplay, /forgotpassword.

## Customer authentication

- Password login remains available. Login also offers OTP. Sign-up requires mobile OTP verification; forgot password requires a reset-specific OTP plus matching new passwords.
- Local debug OTP is 123456, enabled by OTP_TEST_MODE (default 1 only while DJANGO_DEBUG=1). Both request and verification explicitly require DEBUG and OTP_TEST_MODE. Fixed OTP cannot work in production even if OTP_TEST_MODE is incorrectly enabled.
- No SMS provider is connected and no SMS is sent. The UI clearly labels development mode. Production OTP requests fail closed with an unavailable response until a real delivery integration is implemented.
- Challenges live in the database, are bound to mobile, purpose and requesting browser session, expire after five minutes and are consumed once. Five incorrect six-digit codes lock a challenge. Resends have a 60-second cooldown and revoke the prior challenge for that session/mobile/purpose. Limits: ten requests per mobile and thirty per IP per hour. Only an HMAC digest of the code and hashed session/IP bindings are stored.
- Password reset hashes the new password, clears the resetting session and invalidates all old account sessions through the password fingerprint. OTP login only authenticates customer accounts; admin/rider passwords remain separate.
- Existing email addresses are checked case-insensitively at signup. Password validation uses Django's configured strength/common-password checks; frontend additionally validates length and confirmation. Password visibility, loading states, expiry/resend countdowns and inline errors are available.

## Shared validation

Backend routed APIs now validate field types, required fields on account/address/catalog/rider writes, model-aligned text lengths, Indian mobile and PIN formats, email syntax, integer IDs, rating range, nonnegative quantity/offer price, positive regular price and offer-price bounds. Catalog foreign keys must exist and product/category/subcategory/brand references must agree. JSON bodies are limited to 1 MB.

Uploads require actual supported image content, at most ten files, 5 MB per file and 25 megapixels. Banner/product-detail storage retains actual filenames after collisions; product-detail replacement uses uploaded files correctly. Client validates every file and server inspects every file independently. SVG and non-image files are rejected.

Frontend shared postData applies field and form rules before network writes, returning field-specific errors. Auth and checkout address forms render inline errors; existing admin forms continue to use their message dialogs. Server checks remain authoritative. Existing checkout price/stock ownership, payment verification, role/CSRF rules, forward-only delivery, customer approval and returns checks remain in place.

## Rate limiting & exponential backoff

Backend routed APIs implement sliding-window rate limiting tailored to endpoint sensitivity, configured in `settings.RATE_LIMITS` and customizable via environment variables:

1. **Authentication routes (`RATE_LIMITS['AUTH']`)**:
   - Strictest limits: per-IP sliding window (default 100 req/min) plus per-account limits.
   - Per-account protection employs exponential backoff rather than a hard lockout:
     - Allows up to `ACCOUNT_MAX_ATTEMPTS` (default 10, configurable).
     - Upon reaching the limit, each subsequent failure doubles the delay: `min(BACKOFF_BASE * (BACKOFF_FACTOR ** (excess - 1)), BACKOFF_MAX)` (defaults: base 2.0s, factor 2.0, max 300s, window 900s).
     - Requests sent during cooldown are rejected with HTTP 429 and `Retry-After: <seconds>`.
     - Once the cooldown interval has passed, the user is permitted to retry. Successful authentication clears the backoff state immediately.
2. **Public endpoints (`RATE_LIMITS['PUBLIC']`)**:
   - Moderate limits (default 120 req/min per IP) on unauthenticated read endpoints (e.g. catalog, category lists, reviews, CSRF token).
3. **Authenticated user actions (`RATE_LIMITS['AUTHENTICATED']`)**:
   - Looser limits (default 300 req/min per account) on customer, rider, and admin operations.
4. **Configurability**:
   - Zero hardcoded thresholds; all windows, request counts, backoff bases, factors, and caps are dynamically loaded from Django `settings.RATE_LIMITS` and overrideable in tests with `@override_settings(RATE_LIMITS=...)`.
