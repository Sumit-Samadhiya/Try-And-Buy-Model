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

## Verification and boundaries

OTP tests cover expiry, wrong code lockout, replay, session/mobile/purpose isolation, resend revocation, verified signup, duplicates, reset revocation, missing CSRF and production disablement. Shared validation tests cover invalid values, inconsistent category references and fake images. Frontend tests cover inline errors, OTP login, signup confirmation and password reset in addition to order regressions.

This is validation coverage for the current routed application and its shared mutation client, not a claim that all future forms or every possible input are covered. Legacy unrouted prototype code is not enabled. Prior CRA/style warnings are unchanged. Real SMS delivery and production activation remain outside this development OTP setup.

Verification result: 66 backend tests passed; 27 frontend regression/auth tests plus 3 shared-validation tests passed. The final whitespace-password check also passed the four-test backend validation rerun. Migration 0030 applied; no migration drift. Login/signup desktop and forgot-password mobile layouts inspected in the running browser.
