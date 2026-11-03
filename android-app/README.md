# DoorDrape Android preview

This Android 8+ app preserves the existing live website UI. It is a native WebView client, not a rewritten native catalog. No website files or production settings were changed.

## Build
Install JDK 17 and Android SDK platform 34/build-tools 35. Set ANDROID_HOME to your SDK folder, then run `powershell -ExecutionPolicy Bypass -File android-app/build.ps1` from the repository root.

Output: `android-app/build/DoorDrape-preview.apk`. Development-signed; not a Play Store release. Keep the generated development keystore locally if you want subsequent preview APKs to update an existing install.

## Features
- Existing responsive DoorDrape UI and live inventory
- Brand launcher icon, system-bar colors, keyboard resize and safe-area spacing
- Android back navigation and exit confirmation
- Persistent web sessions, system file chooser, external browser/payment links
- Local network-error/retry screen (shopping requires connectivity)
- HTTPS only, no file access, no native JavaScript bridge, normal TLS validation

## Release limitations
- No offline ordering, native push notifications, or biometric login.
- Blob/PDF invoice downloads may require the browser; authenticated external downloads need verification.
- Customer/admin/rider authenticated flows require device QA before commercial distribution.
- Target SDK 34 is for this locally buildable preview. Upgrade to the current Play submission requirement and use a private production signing key before store release.
- Third-party cookies are enabled for the existing cross-origin API session behavior.
- REA static analysis parsed 47 JS files with zero parse failures; semantic coverage was partial. This is not evidence of end-to-end app correctness.

Android WebView security reference: https://developer.android.com/privacy-and-security/risks/unsafe-uri-loading

Version 1.1.0 adds fixed Home / Try Bag / Orders / Profile navigation. Orders selects the existing Orders tab; Profile selects Account. The website source is unchanged. APK build/signature and emulator installation verified. Emulator launch timed out; visual and authenticated tab journeys still require device QA.


Version 1.2.0: custom outline navigation icons, rounded active states, ripple feedback and exact-origin authenticated receipt download handling. See VALIDATION.md for completed tests and remaining physical-device/payment checks. Play Store publication is deferred by user. Latest distributable: build/DoorDrape-1.2.0.apk.
