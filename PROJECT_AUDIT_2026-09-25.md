# SevenShades project audit — 25 September 2026

## Result and scope

The project has a working core, but it is **not ready to be described as fully verified or production-ready**. This audit identifies **33 findings: 32 open and one test-isolation issue fixed during verification**, grouped below rather than treating deferred startup features as defects.

Reviewed current customer/admin/rider routes, authentication, catalog, checkout, assignment, billing, returns, reports, uploads, configuration and operational documentation. Read-only aggregate database checks, isolated Django test-database reproductions, frontend tests/build and deployment checks were used. No real payment/order/catalog deletion or service-area change was performed. One existing test unexpectedly called Fast2SMS using local configuration; the provider rejected it with code 996 and no OTP delivery succeeded. That test isolation was then fixed (R33). No application business behavior was changed.

Evidence labels:

- **Reproduced**: executed an isolated scenario against the current code.
- **Source**: concrete behavior visible in the cited implementation; live UI/concurrency has not necessarily been reproduced.
- **Data**: aggregate query of the local database with SQLite query-only enabled.
- **Command**: observed tool/check output.

P1 means material correctness, inventory, privacy or release risk; P2 means functional/operational defect; P3 means maintenance/polish. Priorities marked “before deployment” or “before online payments” are not instructions to implement the deferred feature now.

Paths are repository-relative. Line numbers identify the reviewed snapshot and may move after edits.

## A. Current workflow and customer-facing issues

### R01 — P1: Barcode verification can be bypassed

**Reproduced.** `sevenshades/sevenshadesapp/inventory_workflow.py:123` accepts `tag_intact=True` with no `scanned_tag`. Warehouse steam-press/approval at lines 161/178 checks the boolean but not `tag_verified`. A return was approved and stock restored with `tag_verified=False`.

Impact: the physical garment/tag verification claimed by the workflow is optional at API level. A UI barcode field does not enforce it.
Fix: require the expected nonempty tag and a matching scan for normal returns; explicitly authorize/audit a separate exception process for legacy/missing tags. Do not silently turn a checkbox into proof of scanning.

### R02 — P1: Return collection/restock can run before customer approves selection

**Reproduced.** `inventory_workflow.py:117` requires only that a FinalOrder exists. It does not require customer approval, settled payment, or delivery completion. Generated an unapproved empty selection, collected its garment, received it, steam-pressed it, and restocked it successfully.

Impact: the customer can lose the ability to keep that item before approving, because `settlement.py:29` rejects purchasing an item with a return record. Stock can be resold while the original trial remains unresolved.
Fix: tie collection to the approved selection revision, and gate warehouse restock on a completed/correctly reconciled trial. Define a deliberate customer-dispute recovery path.

### R03 — P1: Route optimization invents GPS coordinates

**Source.** `delivery_ops_views.py:248` defaults to an Indore location. Lines 274–276 invent missing order coordinates using `hash(order_id)` offsets. These are returned as ordinary latitude/longitude, distance and ETA, with a success message. Python hash-based offsets can also differ between process starts. `estimated_arrival_minutes` includes the current stop's 15-minute trial, so it behaves more like completion time than arrival time.

Impact: admin/rider can mistake fabricated distances and stops for actual routing.
Fix: flag missing coordinates and exclude them from geographic optimization; require a verified start/hub. Clearly label straight-line estimates, separate arrival and completion, and exclude completed/cancelled stops. Do not introduce fabricated geocoding as fallback.

### R04 — P1: Abandoned COD orders reserve stock indefinitely

**Reproduced.** `checkout.py:106` sets no reservation deadline and creates `TRY_REQUESTED`. `inventory_workflow.py:87` sweeps only `AWAITING_TRIAL_PAYMENT`. Even an aged COD order retains stock. Three current local orders are TRY_REQUESTED; this is not a claim that those three are abandoned.

Impact: an unattended/no-show order can hold the last unit and block that customer's next order indefinitely. Existing 30-minute payment recovery does not cover current COD orders.
Fix: define a scheduled-slot-aware abandonment/no-show rule and admin recovery queue. Never automatically release garments already dispatched or awaiting warehouse verification.

### R05 — P2: Paid delivery-only/no-purchase orders receive no receipt

**Reproduced.** `receipts.py:9` exits whenever selected_items_count is zero. A paid SOS/no-purchase bill of ₹99 receives no OrderReceipt.

Impact: money is collected but the customer cannot download even a normal receipt. This is separate from the intentionally deferred tax invoice.
Fix: issue a normal payment receipt for any collected amount, with a delivery/trial-fee line when no merchandise was retained.

### R06 — P2: Arbitrary/past delivery slots are accepted

**Reproduced + Source.** `checkout.py:69` validates only nonempty slot text and length. `NOT A REAL SLOT` was accepted. Dates are allowed through today+3; there is no allowed-slot lookup, passed-slot cutoff, capacity check or dispatch-date gate.

Impact: customer/admin scheduling is not authoritative; impossible bookings can be created by API callers and future-dated orders can progress too early.
Fix: server-owned slot identifiers, date/time cutoffs, service capacity, and explicit early-dispatch rules. Align frontend choices with the same rules.

### R07 — P2: Indian delivery dates use UTC server time

**Source.** `sevenshades/sevenshades/settings.py` uses `TIME_ZONE='UTC'`; checkout uses `timezone.localdate()`, while browser UI represents local dates. Between Indian midnight and 05:30, “today” and the backend day differ. Report date filters also use the Django timezone.

Fix: choose a documented operational timezone (for this Indian service, normally Asia/Kolkata), use it for slots/reports, and keep stored timestamps consistently timezone-aware. Verify midnight boundaries before changing it.

### R08 — P2: Reassignment leaves stale batches and has no physical handover record

**Reproduced + Source.** `delivery_workflow.py:66` detaches assignment.batch without recomputing the old batch. A last-order reassignment left an empty batch Pending. It can reassign an in-progress trial without recording transfer of garments/cash; `order_events.py` publishes only to the new assigned rider, so the old rider may wait for polling to lose the task.

Fix: atomically update both batches, notify both riders, and distinguish pre-dispatch reassignment from a post-dispatch custody handover.

### R09 — P2: “Five orders” is a batch size, not a rider capacity limit

**Source.** `delivery_workflow.py:168` creates unlimited chunks of five for the same rider. Direct assignment/reassignment has no equivalent capacity or zone check. Zone matching also permits city-name fallback rather than requiring a supported postcode.

Impact: the admin can overload a rider or assign outside their operating zone while reports imply capacity enforcement.
Fix: validate active workload by rider/date/slot and apply the same eligibility rules to manual assignment and batches; allow explicit audited overrides if needed.

### R10 — P2: “Pay only for what you keep” hides the zero-purchase fee

**Source.** `userinterface/components/MyBag.js:177` and `ProductDetailsComponent.js:484` imply no purchase means no charge. In `settlement.py:51`, repeat standard/SOS orders with zero retained items owe ₹49/₹99. `Footer.js:114` describes fee adjustment, while current billing waives the fee on purchase instead of subtracting a prepaid amount.

Fix: show one consistent fee policy before booking and again before approval: upfront amount, fee when nothing is kept, and waiver/adjustment rule. Owner approval is needed if changing monetary policy; copy must follow the agreed implementation.

### R11 — P2: Phone whitespace cleanup is blocked by earlier validation

**Reproduced.** The serializer/provider strips whitespace, but `request_validation.py:36` rejects the raw phone first through `security.protect_api`. `{"phone":" 9876543210 "}` returned 400 and never reached the provider.

Fix: normalize once before shared validation and reuse the canonical value. Continue rejecting country prefixes and invalid numbers. The previous claim that incoming whitespace was handled end-to-end was incomplete.

### R12 — P2: Mobile-only accounts have no profile-completion path

**Source.** `mobile_auth_views.py:85` creates a customer with blank name and null email. Profile renders these fields (`ProfilePage.js:301`/541), but there is no routed customer name/email update endpoint or completion screen. Detailed signup cannot create the same mobile again.

Impact: customers created by OTP can remain unnamed in profile, delivery and support contexts.
Fix: allow verified customers to complete/edit their profile, preserving phone ownership and email uniqueness. Decide whether a name is needed before checkout rather than fabricating it.

### R13 — P2: Browser storage is trusted as valid application state

**Source.** `storage/RootReducer.js:4` accepts any parsed JSON, including null/arrays/scalars, without validating the bag shape. Bag screens expect item objects. Profile's review storage is parsed without a safe fallback (`ProfilePage.js:90`).

Impact: corrupted/older localStorage can crash or misrender screens. Bag state is also shared across customer logins on the same browser and does not revalidate stock/prices until later.
Fix: version and validate stored data, safely discard invalid values, and clarify guest/account bag behavior. Backend price/stock authority already protects the actual order.

### R14 — P2: Malformed filter/configuration input can return 500

**Reproduced + Source.** `/api/customer_tickets?limit=abc` returned 500. CustomerTickets/RiderTickets (`admin_workspace_views.py:120`/136) directly cast and slice; negative values also need handling. Zone/exclusion save methods call `.strip()` on unchecked types and accept arbitrary postcode lists.

Fix: typed serializers, bounded positive pagination, normalized valid Indian PIN lists, and consistent 400 responses. This disproves a blanket “validation everywhere” claim.

### R15 — P2: Most catalog products still cannot be ordered

**Data.** Current local database: **13 products, 4 variants, 10 products without variants**. Unavailable-state UI is useful, but it does not complete the commercial catalog.

Fix: owner supplies actual sizes/colors/prices/stock; populate or hide incomplete products. Do not infer stock or prices from images.

### R16 — P2: Catalog price/rating summaries can mislead

**Source.** `serializer.py:75` averages variant averages equally rather than weighting by review counts. Lines 85/90 independently calculate minimum regular and offer prices across all variants, including out-of-stock variants. `ProductByCategory.js` combines these minima into one price/discount card, although they may belong to different variants.

Example: a cheaper non-discounted variant and a more expensive discounted variant can produce a displayed price higher than the actual cheapest option; low out-of-stock offers can also be advertised. One five-star review should not count as much as a variant with 100 one-star reviews.
Fix: calculate available-variant effective prices and corresponding discounts together; aggregate actual reviews/counts for the overall rating.

### R17 — P2: “My reviews” remains browser-local and can duplicate an updated review

**Source.** `ProfilePage.js:227` submits to the backend correctly, but lines 240–253 append a new localStorage entry every time. Backend updates one review per customer/variant, while local UI can show multiple apparent reviews; another device cannot load the history.

Fix: fetch customer-owned reviews from the backend and upsert by persistent review ID. Do not describe this as entirely offline-only—the submission is now real, only the displayed history is inconsistent.

### R18 — P2: Direct order-success URL claims success without an order

**Source.** `userinterface/screens/OrderSuccess.js:13` defaults missing navigation state to an empty object but still shows “Order Placed Successfully”, zero items and ₹0. The route requires login, but does not verify an owned order.

Fix: require an order identifier, fetch authoritative order data, and show a neutral empty/not-found state when absent. Avoid making financial/booking claims from navigation state alone.

### R19 — P1 operational: Rider emergency hotline is hardcoded/unverified

**Source; number ownership not verified.** `diliveryinterface/screens/DeliveryHelpCenter.js:165` presents a fixed SOS Dispatch & Roadside Assistance number. There is no configuration/verification evidence that this is staffed by the business.

Fix: owner verifies a real support contact and operating hours, then configure it centrally. Remove emergency-assistance wording until an actual service is in place. Database-backed support tickets work independently.

### R20 — P2: Privacy and delivery promises overstate implementation

**Source.** `Footer.js:124` says sessions/tokens are encrypted; HS256 JWTs are signed, not encrypted, and the local application is HTTP. Multiple screens advertise 90–120 minute SOS delivery, but there is no operational guarantee/capacity monitor. Trial overdue events occur when a rider completes a late trial (`delivery_workflow.py:104`), not an automatic hard stop at 15 minutes.

Fix: factual privacy copy and clearly qualified delivery estimates. Keep the trial timer, but do not claim hard enforcement or guaranteed arrival without an implemented policy/operation.

## B. Admin, storage and scale

### R21 — P2 at scale: Pagination often happens after full loading; catalog adds N+1 queries

**Source.** SalesReport builds every matching order/final/customer row and sums in Python before slicing (`admin_workspace_views.py:34`). AdminOrderLifecycleList evaluates an unbounded queryset before breaking at a response limit. ProductGetSerializer performs several per-product aggregate/filter queries; select_related alone does not solve reverse-variant aggregates. Rider assignments/batches and public reviews/catalog lists are largely unbounded.

Fix: database filtering/pagination/aggregation, annotated catalog summaries, and paginated history endpoints. Document whether sales dates refer to order booking or actual collection; current report filters orders by created_at.

### R22 — P2: Image cleanup is incomplete and not transaction-safe

**Source; rollback/storage matrix not executed.** Product pre_save deletes the old file before the transaction commits (`models.py:368`). A later rollback can restore a database reference to a deleted image. File paths rely on field storage while uploads also use explicit static-directory storage. Variant icons are CSV TextField paths and lack equivalent replace/delete cleanup; category/brand replacement and banner lifecycle also need review.

Fix: normalize storage ownership, delete old unreferenced files on successful transaction commit, and cover shared filenames/failure cleanup with temporary-storage tests. This is a future failure risk, not a claim of currently missing image files.

### R23 — P1 for staff operations: Django admin can bypass workflow safeguards

**Source.** `admin.py:26` permits superuser order deletion without inventory-release workflow; rows without PROTECT dependents can be removed while reservation quantities remain decremented. DeliveryAssignment deletion is not disabled. Default ProductDetails/ProductReview admins can bypass API-specific hierarchy/stale-stock/aggregate rules. Some workflow fields (e.g. tag/dispatch metadata) are omitted from readonly lists.

Fix: make operational records read-only in Django admin or route supported actions through the same services. Superuser privilege is powerful by design; the issue is accidental business-data corruption through a supported UI, not anonymous authorization bypass.

## C. Payment compatibility — fix before old/prepaid or online orders are used

### R24 — P1 conditional: Already-paid upfront trial fee is not credited

**Reproduced with legacy prepaid state.** In `settlement.py:43–51`, wallet_credit is always zero and final_payable ignores trial_fee_paid. A previously prepaid ₹99 trial can still receive a full merchandise bill; a no-purchase legacy trial can owe the fee a second time. Reports sum prepaid and final amounts, reflecting the overcollection.

Fix: distinguish current COD bookings from legacy prepaid orders and reconcile verified credits once. This does not mean new COD orders should collect upfront fees; it is a compatibility bug.

### R25 — P1 before online use: Pending gateway attempt no longer freezes selection

**Reproduced with an existing READY attempt.** `settlement.generate_bill` permits changing an unpaid bill and increments the revision even when its original gateway order remains payable. An original capture then fails revision reconciliation. Approval also lacks an explicit pending-attempt mode-change guard.

Fix: restore pending-payment protection for existing attempts before enabling Razorpay. Provider testing is deferred, but guarding old uncertain outcomes is still required. Never resolve this by trusting a client “paid” flag or force-clearing a hold.

## D. Verification, repository and deployment

### R26 — P1 verification: Full backend regression suite is not green

**Command, final counts in verification section.** Four PaymentRecoveryTests expect the old upfront-payment setup but construct current COD orders. Failures include expiry not releasing, trial fee not payable, reconciliation refusal, and no GatewayPayment row after setup rejection.

Fix: keep explicit fixtures for legacy upfront orders and separate current COD tests; then assess whether failures reveal implementation gaps rather than merely weakening assertions. Nine additional audit reproductions show that passing business tests alone currently does not certify all invariants.

### R27 — P1 for CI deployment: Strict frontend production build fails

**Command.** `CI=true node node_modules/react-scripts/scripts/build.js` exited 1: CRA treats lint warnings as errors. Examples include duplicate declarations in DisplayAllBrand/DisplayAllCategory/Header, unused imports, loose equality, and hook dependency/cleanup warnings in AdminReports, UserAddressForm, ProductDetailsPage and ProfilePage. Browserslist/Babel toolchain warnings also remain.

Fix: correct the warnings and rerun the actual CI build. Do not present disabling CI/lint checks as fixing the defects. Development compilation and unit-test success do not imply a release build succeeds.

### R28 — P1 before sharing/deployment: Sensitive data artifacts are still tracked

**Command.** `git ls-files` still lists `sevenshades/db.sqlite3`, `sevenshades.sql`, `sevenshades/.env.docker`. Contents were not dumped for this audit. The ignored Fast2SMS key file must also be excluded from manual ZIP sharing; gitignore does not sanitize a ZIP or repository history.

Fix: remove sensitive live artifacts from tracking with a backup/migration plan, inspect exposure/history, rotate exposed credentials, and distribute sanitized sample configuration/data. Do not delete the working database merely to clean Git.

### R29 — P1 before deployment: Django dependency is unsupported

**Source + official release policy.** Requirements pin Django 5.0.2. Django 5.0 extended support ended April 2, 2025, and later 5.0 security patches existed. No exploit was attempted and this is not a full dependency-CVE audit.

Fix: plan an upgrade to a currently supported compatible release, followed by migrations and full regression tests. References: https://www.djangoproject.com/download/ and https://www.djangoproject.com/weblog/2025/apr/02/security-releases/ .

### R30 — P1 before multi-process deployment: Shared auth/event cache is optional, not enforced

**Source.** Without REDIS_URL, settings use local-memory cache/channel layers. New mobile OTPs, locks, throttles and revoked JWT identifiers become worker-local and disappear on restart. An OTP sent by one worker may fail verification on another; revocation reliability also depends on shared persistence. Legacy and new OTP endpoints use separate throttle/challenge stores.

Fix: deployment checks must require the shared cache configuration, establish eviction/restart expectations for revocation, and test cross-worker OTP/events. Unify SMS quotas across old/new endpoints. Do not enable a fixed OTP in production to work around delivery failure.

### R31 — P1 before deployment: Development settings/launcher are not deployment configuration

**Command + Source.** `manage.py check --deploy` reports five warnings for HSTS, HTTPS redirect, secure session/CSRF cookies, and DEBUG under the current local configuration. Cookies become secure with DEBUG off, but that alone does not configure TLS/proxy/media/static/backup behavior. `SILENCED_SYSTEM_CHECKS=['fields.E180']` suppresses a JSONField database support check. Launcher forces development settings and local ports; default frontend API URL uses the browser hostname with port 8000.

Fix: separate production settings/environment, verify backend URL/origins/HTTPS/WebSockets, configure static/uploads and backups, and remove unsupported blanket check suppression. These local-development warnings are not evidence that an already-running production site is insecure—no production deployment was inspected.

### R32 — P2: Reports/seed data describe more completion or real coverage than verified

**Source.** Older review rows marked “All Fix” disagree with lower historical sections and current code. `seed_delivery_zones.py` labels sample Indore/Bhopal/metro postcodes and restricted areas “real pilot”; checkout accepts any stored supported PIN without requiring an available rider. No owner-approved operational coverage evidence was found in the code.

Fix: use this audit as the current issue list, update handoff status after fixes, label demo seeds, and confirm actual service zones before deployment. Do not rerun seeds against business configuration without reviewing changes.

### R33 — P1 test isolation: A signup regression test could call the real SMS provider — FIXED

**Command.** `test_security.py:135` enabled DEBUG/test OTP but did not override FAST2SMS_API_KEY. Since a configured key intentionally takes precedence over fixed OTP, the complete test run unexpectedly made a real provider request for its fixture mobile. Fast2SMS rejected it with website-verification code 996; the test failed on the missing challenge response.

Applied a **test-only** fix: `FAST2SMS_API_KEY=''` in that test's override_settings. The focused test now passes without SMS transport. A suite-wide deny-network-by-default fixture is still recommended as future hardening. This incident does not indicate a successful SMS delivery.

## Confirmed positive findings and intentional exclusions

- Custom API routes use fail-closed role checks, session/bearer authentication and CSRF for browser writes. Reviewed tests cover ownership and rejection of customer tokens on admin APIs.
- Checkout still derives prices from catalog records, reserves stock atomically, validates owned addresses, enforces 1–4 distinct variants and quantity 1, and rejects hostel/commercial trials.
- Paid bills cannot be regenerated. Current manual cash confirmation requires current customer approval and the assigned rider/admin. Delivered status requires settled payment and return-collection records.
- Finalized purchased-item refund rejection is intentional and remains separate from unpurchased trial returns.
- Catalog protection and rating-only updates address earlier cascading-delete/stale-stock problems through the custom APIs. Database review uniqueness/rating constraints exist.
- **0 tracked .venv/__pycache__ artifacts** were found by the tracking check; do not repeat the old 7,542-files issue as if still current.
- Read-only local data: 13 products, 4 variants, 10 products without variants; 0 offerprice>price rows; 0 negative stock; 4 delivery zones, 3 excluded areas; 2 DELIVERED and 3 TRY_REQUESTED orders. Counts are a snapshot, not production health metrics.
- **38 local product/variant/banner image references checked; 0 missing files.** This does not prove all responsive rendering, image quality, external URLs, categories/brands or mobile layouts are correct.
- Fast2SMS website verification is **owner-deferred until deployment**. The configured real key currently means OTP requests remain blocked by provider code 996; the deferment does not automatically restore 123456 locally. Password login is available for existing password accounts. No configuration was silently changed during this audit.
- Razorpay provider testing, tax invoices/GST configuration, hostel/commercial delivery, and profit accounting remain deliberately deferred. Normal fee-only receipts (R05) are still within startup scope.

## Verification log

- Nine isolated audit probes reproduced the behavior in R01/R02, R04, R05, R06, R08, R11, R14, R24 and R25. The combined barcode/pre-approval probe demonstrates two related gaps. These probes assert current faulty behavior for diagnosis; they are **not** desired-behavior regression tests.
- Probe script: `.runtime/audit_probes.py` (ignored local artifact). Database snapshot script: `.runtime/audit_snapshot.py` (query-only).
- Frontend CI production build: **failed**, lint warnings treated as errors (R27).
- Django deployment check: **five warnings** under local debug settings (R31).
- Full frontend suite: **39/39 tests passed**, 15 suites.
- Full backend suite before the R33 isolation fix: **110 tests, 105 passed, 1 failure + 4 errors**. Four are PaymentRecoveryTests (R26); the fifth was the accidental real-provider signup test (R33).
- After the test-only R33 change, that exact signup test was rerun and **passed**. Four payment-recovery failures remain unresolved; a second full backend run was not performed. Do not claim a completely green suite.
- Full backend output is in ignored `.runtime/logs/audit-backend-tests.log`; do not distribute logs without reviewing them.
- Full logged-in visual/mobile/accessibility review, actual road routing, Redis multi-worker/load testing, fresh-machine install and live SMS/payment provider verification are **not certified** by this audit.

## Recommended implementation order

1. R01/R02 inventory/approval integrity, then R03 fake routing and R04 COD reservation recovery.
2. R05/R06/R07 billing receipt and schedule correctness; R08/R09 assignment consistency/capacity.
3. R10–R20 customer-visible errors, misleading wording and incomplete catalog/profile data.
4. R21–R23 query/storage/admin integrity; get R26/R27 test/build gates green.
5. Before enabling online payments, fix R24/R25 and run provider tests. Before deployment/sharing, finish R28–R32 plus deferred provider verification.

This is the identified issue list for the reviewed snapshot, not a guarantee that no other bug or vulnerability exists. Keep future fixes small, add tests for the intended invariant, and re-run the corresponding scenario before marking an issue fixed.
