# DoorDrape Android 1.2.0 validation

Date: 2026-10-21
Play Store publication deferred by user. No store registration, payment or submission performed.

## Completed
- Bottom bar: original outline icons, matching green selected state, rounded indicators, 58dp touch targets plus spacing, ripple feedback.
- Existing website design and production source untouched.
- APK compilation and APK v2/v3 signature verification passed.
- Emulator install passed. Launch command timed out on the slow emulator, but subsequent REA screenshot confirmed the actual app, website and navigation rendered.
- 50 isolated backend tests passed (in-memory SQLite): mobile authentication, checkout, doorstep workflow, payment recovery and delivery.
- Live customer password login passed using the previously authorized account.
- Live session persisted across full navigation to profile; existing order history and completed COD bill rendered.
- Receipt navigation now uses DownloadManager with cookies only for the exact HTTPS backend receipt endpoint, instead of losing session in an external browser.

## Not claimed as verified
- Full authenticated APK customer/admin/rider journey on a physical phone.
- Receipt download completion on an authenticated phone (handler compiled; actual device download pending).
- Actual money movement through UPI/card/gateway. Current user flow is COD; backend payment tests are isolated, not a bank transaction.
- API 36 / Play Store eligibility, production upload signing, store review or production publication.

The APK remains development-signed for direct installation. Keep the existing local development key for future updates; it must not be committed or used as the final store upload key. The app uses the live website and needs connectivity.

Logs: .runtime/android-release-tests.log
Visual evidence: .runtime/android-polished-nav/screen.png
