# DoorDrape post-deployment reality check — 2026-10-02

**Verdict: NEEDS WORK.** The deployed toolchain release passed its release checks, but the live storefront has measurable loading/layout problems and keyboard accessibility defects. This is not a full accessibility certification or an end-to-end order acceptance sign-off.

## Scope and release baseline

Reviewed production https://try-and-buy-model.vercel.app/home after release `746ac68c2c32fa83b5040f363e39e2bd30aa9a76`. The previous release evidence records 72 frontend tests, production build and CI passing, with zero critical/high dependency findings (four moderate findings remain). Those are historical release results, not tests rerun by this audit. See [migration evidence](frontend-toolchain-migration.md).

Applied Reality Checker, Accessibility Auditor and Performance Benchmarker skills. No application code, database records or deployment settings changed during this recheck. The example QA capture script named in the skill is absent; evidence below uses Lighthouse CLI and supported browser controls instead.

## Live performance measurements

Five sequential fresh-browser Lighthouse 13.5.0 navigations against production, 11:36–11:39 UTC on 2026-10-02. Three simulated mobile runs and two desktop-preset runs. Mobile configuration: 412×823, simulated 150 ms RTT / 1638.4 Kbps throughput / 4× CPU slowdown. These are lab measurements from this computer, not real-user percentiles or measurements on a physical phone.

| Metric | Mobile median (range), n=3 | Desktop median (range), n=2 |
|---|---|---|
| Performance score | 44 (43–46) | 69.5 (68–71) |
| First contentful paint | 3.74 s (3.14–4.03) | 1.18 s (1.07–1.29) |
| Largest contentful paint | **5.81 s (5.60–7.05)** | **2.68 s (2.65–2.72)** |
| Cumulative layout shift | **0.490 (0.378–0.639)** | **0.188 (0.177–0.199)** |
| Total blocking time | 56 ms (54–70) | 0 ms |
| Transferred resources | ~705 KiB | ~759 KiB |
| Automated accessibility score | 91 | 92 |

All five reports completed without runtime errors or Lighthouse warnings. Accessibility scores do not mean 91–92% WCAG compliance. Good Core Web Vitals reference values are LCP ≤2.5 seconds, CLS ≤0.1 and INP ≤200 ms; field assessment uses the 75th percentile. INP was not measured here; TBT is not INP. [Google guidance](https://web.dev/articles/vitals).

### Performance work to prioritize

1. Reserve stable heights for loading catalog sections and hero content. Mobile report 1 attributes major shifts to the Budget Bazaar section moving; the moving element is not necessarily the cause. Inspect sections inserted above it before changing its images.
2. Make the first hero image discoverable earlier and avoid waiting for unrelated catalog requests before rendering it. Report 1's observed LCP breakdown contains ~3.16 s resource discovery delay and ~2.08 s image transfer. These observed timings differ from the simulated headline LCP. Verify after changes rather than assuming Cloudinary is the sole cause.
3. Consolidate duplicate Google Font stylesheet loading in `index.html` and `src/index.css`; reduce font families/weights. Mobile report 1 estimates 1.41 s of render-blocking opportunity, not a guaranteed saving.
4. Serve responsive collection images and a small flag asset. Report 1 estimates ~85 KiB image savings. Existing compression is helping: this measurement does not support the earlier claim of a 15 MB current homepage, nor an initial payload below 500 KB.
5. Review shared JavaScript imports after the above changes. Estimated unused JavaScript is ~91 KiB, while measured TBT is relatively low; layout and image discovery deserve priority.

## Accessibility findings

| Priority | Finding and evidence | Remediation |
|---|---|---|
| P1 | **Keyboard focus enters hidden slides.** All five automated runs fail `aria-hidden-focus`. Manual Tab traversal reaches hero buttons inside `aria-hidden=true`, including an offscreen element at x=-1217. | Remove inactive slide descendants from tab order, or make them inert; restore only the active slide's controls. Check both hero and category carousels. |
| P1 | Hero rotates every four seconds without a visible pause control; source enables autoplay and hover pause only. | Add a keyboard-accessible pause/play control; stop rotation on keyboard interaction and respect reduced motion. Verify WCAG 2.2.2 behavior. |
| P1 | Source review: header home logo and product detail image thumbnails use click-only divs. | Use native links/buttons with names and visible focus. Product image navigation must remain keyboard operable. This is source evidence, not a completed live product-detail journey. |
| P2 | Automated `target-size` failures include carousel dots and closely spaced footer links. | Increase interactive area/spacing to satisfy WCAG 2.5.8, then remeasure. |
| P2 | Automated `label-content-name-mismatch` on hero actions: accessible names omit visible promotional text. | Separate decorative copy from a clearly labeled action, or align visible/action names; verify speech-input usability. |
| P2 | Cookie notice heading hierarchy fails `heading-order`. | Use an appropriate heading level. This automated best-practice finding alone is not a conformance verdict. |
| P2 | SPA sign-in retains the generic homepage document title. No route title/focus management found in source. | Give routes meaningful titles and manage/announce navigation changes; verify with real assistive technology. |

WCAG references: [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Priority reflects this launch review, not a scanner severity guarantee.

### Manual checks actually performed

- Desktop: Men → Women Tab transition works. Search, Sign In and Try Bag are keyboard reachable; Sign In and Try Bag show a computed white focus outline. Hero action buttons show a blue outline, but hidden-slide focus remains a confirmed failure.
- Mobile at 390 px: menu opens with Enter, closes with Escape, and returns focus to its trigger. A subsequent observation confirms the close control disappears after the transition.
- Narrow homepage at 320 px: document width 319 px with a 320 px viewport; no document-level horizontal overflow observed. This is a narrow viewport check, not a 400% browser zoom test or every-component reflow certification.
- Customer sign-in opens with Enter. Mobile/password labels and required fields appear in the accessible DOM. Empty-submit behavior was inspected, but reliable error announcement/focus was not established; do not mark validation accessibility passed.
- Desktop/mobile/narrow homepage and sign-in screenshots saved. Source checks supplement, not replace, browser testing.

## Remaining acceptance work — not tested / not signed off

Actual NVDA/JAWS/VoiceOver speech output cannot be tested with the available native-control environment. DOM snapshots are not a substitute. Full keyboard and screen-reader journeys for authenticated customer, admin and rider panels remain incomplete. Previous release login smoke checks do not satisfy this requirement.

After remediation, test with NVDA + Chrome (and preferably VoiceOver + Safari): headings/landmarks, menus and dialogs, product sizes/colors and image controls, bag/checkout errors, order assignment, rider status announcements, trial timer, retained-item billing, customer approval, cash collection and invoice download. Confirm focus restoration and no traps using Tab/Shift+Tab/Enter/Space/Escape. Test 200% text and 400% zoom as well as reduced motion.

The complete customer → admin → rider → customer COD order lifecycle, real-user INP, cold backend wake-up latency, network interruption recovery, and cross-browser/device coverage remain unverified in this recheck. No real orders were created or deleted.

## Evidence files

Raw HTML/JSON reports and screenshots are local under `.runtime/launch-recheck/` (ignored by Git). `home-mobile-{1,2,3}.report.*`, `home-desktop-{1,2}.report.*`, `metrics-summary.json`, `keyboard-home.json`, and `home-desktop.png`, `home-mobile.png`, `home-320.png`, `customer-login.png`. Compact measured results are also versioned in [launch-recheck-metrics.json](launch-recheck-metrics.json).

Launch gate stays open until the confirmed keyboard defects are fixed, repeat speed measurements improve, and full authenticated keyboard/screen-reader/COD acceptance evidence is recorded. No new deployment was made by this assessment.
