# SevenShades project analysis — 26 September 2026

## Scope and confidence

Reviewed the local checkout at commit `867b299`, the public GitHub repository page, and the deployed Vercel storefront. Inspected frontend routing, catalog loading, authentication, backend authorization, checkout, inventory expiry, payment verification, delivery workflow interfaces, deployment settings, and existing tests. This is a broad engineering review, not a claim that every branch or authenticated production workflow has been exercised.

The checkout was initially clean. No application source or production data was changed. GitHub was accessible in the browser; remote commit equality and the deployed frontend/backend commit IDs were not established. Earlier audit documents are historical evidence, not fresh test results.

## Architecture and working foundations

- React 18 frontend with Redux, React Router, MUI and Axios; Vercel SPA rewrite is configured.
- Django backend with Channels/Daphne; database selected by environment, with SQLite fallback and PostgreSQL support.
- Three interfaces: customer shopping/trial checkout, administrator operations, and rider delivery tasks.
- Current phone verification uses Firebase; legacy OTP routes return a disabled response. Password login remains supported.
- Checkout validates saved-address ownership, serviceability, allowed variants, quantity, size and server-side prices. Atomic conditional stock decrement protects against overselling; customer locking protects the active-order check.
- API authorization defaults to administrator-only unless explicitly opened. Customer ownership, rider assignment, password hashing, session fingerprints and CSRF checks are present.
- Payments verify signatures and provider-side captured amount/currency/order, with unique bill-revision attempts and recovery logic. These are meaningful safeguards, although live settlement was not tested.
- Order events have WebSocket reconnect and periodic polling fallback.

## Prioritized findings

### 1. High — Initial catalog loading has no useful failure or loading feedback

**Observed live:** Initial `/home` showed fallback Budget Bazaar and footer content without banners/categories. A later observation after reload showed the banner and category section. This confirms a partial-loading experience, but does not by itself prove a Render cold start.

**Code:** `sevenshadesfrontend/src/userinterface/screens/Home.js` converts catalog failures into empty arrays and conditionally hides sections. `src/services/FetchDjangoApiServices.js` uses a 20-second timeout without catalog retry. Men and women requests run sequentially, adding delay.

**Impact:** A visitor can mistake a loading or failed catalog for the actual storefront, with no recovery action.

**Recommendation:** Explicit skeleton/loading, distinct error and empty states, a retry button, bounded retries only for safe catalog reads, and parallel independent collection reads. Measure backend response latency before attributing the cause to hosting.

### 2. Medium — Collection URLs cannot preserve the selected collection when shared

**Observed live:** Opening `/productpage` directly displays `Collections`, `0 items available for Try & Buy`, and `No products found`.

**Code:** `src/userinterface/screens/ProductPage.js` takes category, view and budget filters exclusively from `location.state`. Without state it returns an empty list without fetching a collection.

**Impact:** A copied collection URL opened in a fresh tab/session loses its category/filter. This affects sharing, bookmarking and search visibility. A same-tab refresh may preserve browser history state, so refresh failure is not asserted universally.

**Recommendation:** Encode category/brand/deal filters in URL path or query parameters and provide a useful default collection or category selector.

### 3. Medium — Backend accepts already elapsed delivery slots for today

**Code:** `sevenshades/sevenshadesapp/checkout.py` validates the scheduled date and the slot against three fixed labels, but does not compare today's selected slot with the current time.

**Impact:** A request late in the evening can still select today's 10:00 AM–02:00 PM slot. Frontend restrictions cannot replace server-side validation.

**Recommendation:** Validate slot cutoffs using the configured local timezone, include preparation lead time, and return remaining valid slots to the frontend. This is a static code finding; no live order was submitted.

### 4. Medium — Pending cash trials have no automatic stock release deadline

**Code:** `checkout.py` creates `TRY_REQUESTED` orders with `reservation_expires_at=None`. `inventory_workflow.py` expiry logic only handles `AWAITING_TRIAL_PAYMENT` orders.

**Impact:** An unassigned/abandoned cash trial retains stock until someone explicitly cancels or processes it. It also blocks another active trial for that customer. This may be intentional operational policy, but needs an overdue-order workflow.

**Recommendation:** Define expiry/escalation relative to the scheduled delivery window, with safe stock release and notifications. Do not expire valid future bookings indiscriminately.

### 5. Medium — Production safety depends on environment settings that are not enforced

**Code:** `sevenshades/sevenshades/settings.py` defaults DEBUG to enabled. Without Redis it uses process-local cache and channel layers. Uploaded media is written under the application filesystem.

**Risk, not a verified live misconfiguration:** Missing production variables could enable debug behavior; multiple processes without Redis would not share rate limits/events; uploaded files require persistent storage to survive an ephemeral-host replacement.

**Recommendation:** Fail closed for explicit production configuration, require the intended database/cache services, confirm persistent media storage, and test recovery from deployment/restart. Current Render configuration and storage were not inspected.

### 6. Medium — All major frontend areas are imported into the initial application bundle

**Evidence:** Production build succeeds but its main JavaScript bundle is **483.67 kB gzip**. `src/App.js` eagerly imports customer, administrator and rider screens.

**Impact:** Storefront visitors download code for interfaces they may never use. Slow connections compound the catalog loading experience.

**Recommendation:** Route-level lazy loading for admin/rider/account areas, then measure real device/network performance. No Lighthouse/Core Web Vitals score was measured.

### 7. Medium — Clickable text elements are not consistently keyboard-accessible

**Code and UI:** Footer destinations use clickable spans/Typography without link/button semantics. Browser accessibility output lists these as plain text.

**Impact:** Keyboard and assistive-technology users may not be able to operate these destinations normally.

**Recommendation:** Use semantic links for navigation and buttons for dialogs; provide visible focus states and verify keyboard navigation.

### 8. Low — Hard-coded catalog IDs and outdated operational notes

`Home.js` falls back to Men=5/Women=4 and `Header.js` initially loads category 5. Re-seeding into different IDs can break navigation. Resolve categories from backend identifiers/slugs.

The earlier live audit describes Fast2SMS and a rejected administrator `limit` parameter. Current code uses Firebase and allows a bounded `limit` (1–500). Those old findings should not be presented as current without retesting the deployed revision.

## Verification results

| Check | Result |
|---|---|
| Frontend tests | **15 suites, 40 tests passed** |
| Frontend production build | **Passed**; stale Browserslist-data and Node deprecation warnings |
| Backend test discovery | **165 tests discovered**, but execution blocked before tests ran |
| Backend environment | Existing virtual environment references unavailable Python; alternate bundled runtime reaches Django checks but fails importing `firebase_admin` |
| Live homepage | Renders; initial partial catalog experience observed, later banner/category content appeared |
| Live direct collection link | Empty collection confirmed |
| Live sign-in page | Password/OTP options render |
| Authenticated checkout/admin/rider/payment | **Not exercised in this review** |

`firebase-admin` is declared in requirements; the missing package is a local environment problem, not evidence that the production backend lacks it. No credentials were guessed, OTPs sent, orders created or real payments initiated.

## Suggested execution order

1. Fix loading/error recovery and collection URL state.
2. Reject elapsed delivery slots and define overdue reservation handling.
3. Restore reproducible backend dependencies and run the full backend suite.
4. Validate Firebase configuration, session persistence, Redis/database/media persistence and production settings in the actual deployment.
5. Run one controlled customer → admin → rider → customer bill approval → cash settlement → return/inventory reconciliation workflow with dedicated test accounts.
6. Split bundles and improve keyboard accessibility; record mobile performance baselines.

**Assessment:** The project has substantial full-stack business logic and test coverage. Deployment is reachable, but a complete production-ready claim needs the above reliability fixes and authenticated end-to-end verification.
