# SevenShades — AI project handoff

## Current audit index

Read `PROJECT_AUDIT_2026-09-25.md` for the latest consolidated findings: 33 identified,
32 open, one test-only SMS-isolation fix completed. Nine isolated audit probes reproduced
workflow/validation gaps. Frontend 39 tests pass, but strict CI build fails on lint warnings.
Backend full run had 110 tests with 5 failures/errors; the signup test-isolation failure
was subsequently fixed and its focused rerun passed. Four payment-recovery failures remain.
Current read-only DB snapshot: 13 products / 4 variants / 10 products without variants;
0 invalid offer prices or negative stock; 38 checked local product/variant/banner image
references all exist. Fast2SMS verification remains owner-deferred until deployment.
Older “All Fix” labels and historic counts below must not override this audit.

## Latest update: Fast2SMS mobile authentication

Live diagnosis follow-up: an authorized SMS attempt reached Fast2SMS but was rejected
with HTTP 400 / code 996 requiring **website verification in the OTP Message menu**.
Provider delivery remains blocked by account setup. Debug responses now include the
actual provider message, with key/phone/OTP redaction; see FAST2SMS_AUTH.md.

This update supersedes the older OTP/provider and latest-migration notes below.
`FAST2SMS_AUTH.md` contains the complete API contract, installation and test commands.
New `/api/auth/send-otp/` and `/api/auth/verify-otp/` endpoints use cache-backed, hashed
six-digit codes with 300-second expiry, resend/guess limits and single-use verification.
Verification gets/creates the existing SignUp customer, returns a one-hour PyJWT token,
and creates the normal browser session. Customer Bearer tokens are validated by
`security.py`; logout revokes the presented token and password changes invalidate it.
React OTP login uses these routes without persisting JWT in localStorage. Existing
signup/reset challenges now deliver through Fast2SMS while retaining purpose/session binding.
New modules: `mobile_auth_views.py`, `mobile_auth_serializers.py`, `sms_provider.py`,
`mobile_tokens.py`, `test_mobile_auth.py` under the backend app. Migration **0039**
makes customer email optional for mobile-only accounts, which have unusable passwords.
The API key is backend-only (`FAST2SMS_API_KEY` environment or ignored `.fast2sms-key`).
With a configured key, random SMS codes replace fixed development codes. Without a
key, 123456 remains restricted to DEBUG + OTP_TEST_MODE. Production/shared workers
require a shared cache such as the already-supported Redis configuration. Provider
delivery to a real handset is not verified by mocked automated tests.
The launcher dependency probe now skips comments/blank lines, fixing caveat 1 below.
Verification: focused auth/security 36 passed; frontend 39 passed; full backend
105/109 passed with four existing COD-versus-upfront payment-recovery fixture failures.
Migration consistency passed and local 0039 was applied. No live SMS delivery test.

**Snapshot: 25 September 2026.** Read this first when continuing this repository.
Purpose: explain the project once, then let an AI inspect only the files needed for a task.
This is a source-inspected orientation, not a substitute for current code or a fresh test result.
Paths below are relative to the repository root so this document works on another machine.

## 1. How to use this document

1. Read business rules, current behavior, and caveats below before changing anything.
2. Check working-tree changes and any applicable `AGENTS.md`; preserve other people's changes.
3. Use the task-to-file map to read the relevant implementation and tests. Do not scan the whole repository again by default.
4. Treat source code and migrations as evidence of implementation, owner instructions as product requirements, and old reports as historical context. If they disagree, explain the difference instead of silently choosing a new business policy.
5. After a change, update the affected section here with the date, actual verification, and remaining limitations.

Do not read dependencies, generated builds, database dumps, binary images, or all migrations into the AI context. Exclude `.venv`, `.venv-1`, `.runtime`, `node_modules`, `__pycache__`, `build`, `.git`, and `static` from ordinary text searches. Inspect a particular asset or migration only when relevant.
Never copy credentials, account records, `.env` values, database contents, or payment secrets into this document.

## 2. Product and owner decisions

SevenShades is a clothing **Try & Buy at home** startup with customer, admin, and delivery-rider interfaces in one React application. A rider brings garments, the customer tries them, chooses what to keep, approves an itemized bill, and settles payment. Unpurchased trial garments go through return verification and hygiene before returning to sellable stock.

Confirmed requirements:

- A trial may contain **1–4 different variants**, quantity **1 per variant**; four items are not mandatory.
- Residential and gated-society home delivery. Hostel/commercial delivery is outside startup scope, even if an address form can store that type.
- Explicit **Trial Completed** action after Trial In Progress, followed by rider selection, customer approval, then payment.
- Customer approval must show **Selection Submitted**; the bill must be visible to both customer and rider.
- **No refund option for finalized purchased items.** Trial returns are a separate inventory process.
- Cancellation before dispatch preserves otherwise-unused introductory-offer eligibility.
- Normal billing/payment receipts are sufficient initially. Seller/GST details are not ready; do not label the existing receipt a compliant tax invoice.
- Razorpay is the chosen future online provider, but provider testing is deferred until deployment preparation.
- Local development OTP is intentionally **123456**. It must not become a production authentication shortcut.
- Profit/cost accounting is manual for startup. Do not add it as a prerequisite for using the app.

The owner communicates in Hinglish and prefers implementation, concise explanations, and minimal repeated confirmation. Do not invent prices, stock, service areas, legal details, or credentials to make a demo pass.

## 3. Stack and repository layout

| Location | Responsibility |
|---|---|
| `sevenshades/manage.py` | Django management entry point |
| `sevenshades/sevenshades/` | Settings, HTTP routes, ASGI/WebSocket setup |
| `sevenshades/sevenshadesapp/` | Models, API views, workflow services, migrations, tests |
| `sevenshades/db.sqlite3` | Local database; preserve data |
| `sevenshades/static/` | Uploaded catalog/banner images and static files |
| `sevenshades/requirements.txt` | Pinned backend packages, including transitive packages |
| `sevenshadesfrontend/src/` | React customer/admin/rider interfaces |
| `sevenshadesfrontend/package.json`, `package-lock.json` | Frontend commands and dependency lock |
| `START_PROJECT.bat`, `scripts/start-project.ps1` | Windows startup launcher |
| `scripts/check-dependencies.py` | Installed backend dependency validation |
| `.runtime/` | Ignored launcher logs, dependency stamp, optional new Python environment |
| Root `*.md` | Prior design, implementation, verification, and review notes |

Backend: Python 3.12 launcher target, Django 5.0.2, Django REST Framework, Channels/Daphne, Pillow, Requests, SQLite locally. PyMySQL is imported by the settings package, but the configured database is SQLite. Redis is optional via `REDIS_URL`; otherwise events and cache use process-local memory.

Frontend: React 18, Create React App/react-scripts 5, React Router 6, MUI, Axios, Redux, React Slick. Source is JavaScript. Preserve existing conventions rather than migrating the framework as part of an unrelated fix. The rider directory is intentionally spelled **`diliveryinterface`** in existing paths.

## 4. Local startup and verification

Double-click `START_PROJECT.bat`. Backend uses `127.0.0.1:8000`; frontend uses `127.0.0.1:3000/home`. Keep the launcher open and press Enter there to stop its servers. It checks runtime/dependencies, applies migrations, starts hidden child processes, waits for HTTP readiness, and opens the browser. It refuses occupied ports instead of killing unrelated programs. Logs: `.runtime/logs/`.

Optional commands from repository root:

```bat
START_PROJECT.bat -CheckOnly
START_PROJECT.bat -NoBrowser
```

The launcher detects Python 3.12 including the available Codex runtime fallback; it does not automatically install Python or Node. Missing dependencies need internet. An old checked-in virtual environment can point to an unusable interpreter; do not assume `python` on PATH is correct. This machine previously had Python 3.8 first on PATH. Use a verified Python 3.12 interpreter/environment.

Once a working backend environment is selected, run from `sevenshades/`:

```text
python manage.py check
python manage.py showmigrations sevenshadesapp
python manage.py makemigrations --check --dry-run
python manage.py test sevenshadesapp --noinput
```

Here `python` means that verified environment's interpreter, not an arbitrary system Python. If reusing installed packages with the Codex interpreter, the launcher also sets `PYTHONPATH`; reproduce that environment rather than assuming packages are globally installed.

Frontend tests from `sevenshadesfrontend/`, PowerShell:

```powershell
$env:CI = 'true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand
```

Use focused tests while editing; run relevant broader tests before reporting completion. Django tests use a test database. Do not create real orders, delete real catalog records, or submit live payments just to test a fix.

**Verification boundary:** previous A03/A04 work reported 91 backend and 40 frontend tests passing. Subsequent source changes exist. These counts are historical, not a fresh certification of the September 25 tree. This handoff task inspected source; it did not rerun full suites or provider/live-browser flows.

## 5. Current lifecycle and billing — read carefully

Primary successful order path:

```text
TRY_REQUESTED → ASSIGNED → OUT_FOR_TRIAL → TRIAL_IN_PROGRESS
→ TRIAL_COMPLETED → AWAITING_SELECTION_APPROVAL → SELECTION_SUBMITTED
→ payment confirmed → DELIVERED
```

Other branches include `CANCELLED`, `NO_PURCHASE`, and older `AWAITING_TRIAL_PAYMENT` recovery paths. DeliveryAssignment uses different human-readable values: `Assigned`, `On Route`, `Trial In Progress`, `Trial Completed`, `Delivered`. Do not interchange assignment values and TryOrder status strings.

1. `checkout.create_trial` validates session customer, owned saved address, supported postcode, address type, active-order restriction, item count, unique variants, quantity, matching size, price, and stock. Prices are copied from the database into order-item snapshots. Stock is reserved atomically.
2. Admin assigns an active rider. Dispatch records `dispatched_at`; sequential rider transitions are checked in `delivery_workflow.py`.
3. Trial start/end timestamps support the 15-minute countdown and overdue information. Explicit trial completion unlocks selection.
4. Rider selection creates/updates a versioned FinalOrder and item snapshots. Customer approves the current revision. Changes must invalidate old approval; paid bills must remain immutable.
5. Cash collection or verified online capture settles the bill. Delivery completion checks approval, payment, and collection records for unpurchased reserved garments.
6. Warehouse receives trial returns, completes hygiene/steam-press, and approves restock. Inventory must be released only once.

### Current code differs from the original upfront-fee proposal

As inspected September 25, `checkout.py` creates orders immediately with `TRY_REQUESTED`, `try_payment_mode='cash'`, `try_payment_status='cod'`, and **no reservation expiry deadline**. Fee calculation is still first standard trial 0, repeat standard 49, SOS 99.

`settlement.py` currently sets payable to **selected merchandise total when at least one item is purchased**, waiving the delivery/trial charge. When nothing is purchased, payable is `order.try_fee`. It sets wallet credit to zero. This is not the original “collect upfront then subtract it” design.

Payment/recovery modules and historical notes still support earlier upfront-payment paths. Before changing billing, compare `checkout.py`, `settlement.py`, `payments.py`, receipt generation, frontend bill rendering, and tests together. The source-inspected policy above is implementation evidence, not a newly inferred owner approval. Verify behavior for old orders that already paid an upfront fee; do not silently charge them twice or lose their credit.

Safe expiry/cancellation helpers still exist: 30-minute unpaid reservations with no gateway attempt can be released when applicable. Current newly created COD orders do not get that deadline. Never describe all current unpaid orders as automatically expiring after 30 minutes.

## 6. Task-to-file map

Backend paths in this table are relative to `sevenshades/sevenshadesapp/`; frontend paths are relative to `sevenshadesfrontend/src/` unless stated otherwise.

| Task | Backend | Frontend |
|---|---|---|
| API route/auth access | `../sevenshades/urls.py`, `security.py`, `auth_views.py` | `App.js`, `services/RequireSession.js`, `services/FetchDjangoApiServices.js` |
| Login/signup/reset/OTP | `otp_views.py`, `signup_views.py`, `request_validation.py` | `userinterface/screens/CustomerAuth.js`, `CustomerAuth.css`, `ForgotPassword.js`, `services/validation.js` |
| Address/serviceability | `signup_views.py`, `checkout.py`, `location_views.py` | `userinterface/screens/ProfilePage.js`, locate `UserAddressForm.js` |
| Catalog/variants/stock edits | `product_views.py`, `productdetails_views.py`, `catalog_integrity.py`, `serializer.py` | `administrator/screens/CatalogWorkspace.js`; Product/ProductDetails/Display wrappers |
| Categories/brands | `maincategory_views.py`, `mysubcategory_views.py`, `brands_views.py` | `administrator/screens/Category.js`, `MySubCategory.js`, `Brand.js`, corresponding Display screens |
| Customer catalog/search/images | `userinterface.py`, `serializer.py` | `userinterface/screens/Home.js`, `ProductPage.js`, `ProductDetailsPage.js`; locate `SearchBarComponent.js`, `ProductDetailsComponent.js`, `ProductByCategory.js`, image URL helper |
| Banners | `banner_views.py`, `userinterface.py` | `administrator/screens/Banner.js`; locate `SliderComponent.js` |
| Bag/checkout | `checkout.py`, `order_views.py:TryOrderCreate` | `storage/RootReducer.js`, `userinterface/screens/MyBagDisplay.js`, `DisplayCheckOut.js`; locate `CheckoutFlow`/`UserAddressForm` |
| Assignments/batches/rider | `delivery_workflow.py`, `delivery_ops_views.py`, `location_views.py` | `administrator/screens/DeliveryOps.js`, `DeliveryBatches.js`, `RiderSuggestions.js`, `diliveryinterface/screens/` |
| Selection/bill/cash | `settlement.py`, `settlement_views.py`, `order_views.py` | `services/CustomerBill.js`, `services/CustomerOrderNotifications.js`, rider detail/DeliveryOps |
| Online payment/recovery | `payments.py`, `payment_recovery_views.py`, `settlement_views.py` | `services/razorpayCheckout.js`, `administrator/screens/PaymentRecovery.js` |
| Cancellation/trial returns | `inventory_workflow.py`, `inventory_views.py` | `services/TrialInventoryControls.js`, `administrator/screens/InventoryReturns.js` |
| Dashboard/sales/support/zones | `admin_workspace_views.py`, `admin_analytics_views.py` | `administrator/screens/AdminReports.js`, `AdminDashboard.js`, `diliveryinterface/screens/DeliveryHelpCenter.js`, customer Profile |
| Reviews | `order_views.py:SubmitProductReview`, `models.py` | Profile and product-detail components |
| Realtime | `order_events.py`, `consumers.py`, `../sevenshades/asgi.py` | `services/useOrderEvents.js`, notifications and order screens |
| Schema/data migration | `models.py`, `migrations/` | Update affected API callers and tests |

Find a named file with `rg --files` when a component location is not spelled out. Avoid relying on line numbers from old reports.

## 7. Data model and invariants

- Catalog: MainCategory → MySubCategory → Product → ProductDetails; Brands also relate to products/variants. ProductDetails is the sellable size/color/stock/price variant, not Product. Parent/order-item links use PROTECT where required to prevent cascading loss of inventory/order history.
- Accounts: custom PasswordAccount-derived SignUp, AdminLogin, DeliveryRider. Django staff-admin accounts are a separate mechanism. UserAddress belongs to the customer; address mutations use stable IDs and ownership.
- Trial: TryOrder contains delivery/customer snapshots and lifecycle/payment metadata; TryOrderItem contains reserved variant and garment/price snapshots plus security tag.
- Sale: FinalOrder and FinalOrderItem hold selected merchandise, current approval/payment revision and totals. Preserve snapshots when catalog names/prices later change.
- Operations: DeliveryAssignment links rider and order; DeliveryBatch groups assignments. TrialReturn tracks collection, scanned tag verification, hygiene, and restock. Legacy ReturnedItem/TamperProofTag/WalletAccount models also exist; model existence alone does not mean a customer refund/wallet route should be enabled.
- Payment: GatewayPayment tracks provider attempt and recovery metadata. OrderReceipt stores receipt data. Unknown provider outcome is not proof that nothing was paid.
- Auth/support: OtpChallenge stores purpose/session-bound OTP state; SupportTicket supports customer or rider tickets and admin responses.
- Reviews: ProductReview is constrained per variant/customer and rating 1–5 by migration 0038. Rating updates must not save stale stock/price/image fields.

Database mutations involving stock, approval, payment, or status must remain atomic and ownership-checked. Existing code uses locks, conditional updates, and SQLite-specific serialization patterns. Do not replace them with naive read-modify-save logic.

## 8. API, browser routes, and security conventions

Canonical HTTP route registry: `sevenshades/sevenshades/urls.py`. Most endpoints are `/api/<name>` without a trailing slash. At registration, custom API routes are wrapped with `protect_api`; unclassified endpoints default to admin-only. Adding a view without checking route security is incomplete.

Main endpoint families: `auth_*`, `otp_*`, `signup_submit`, `reset_password`; category/brand/product/productdetails CRUD; `user_*` catalog; `address_*`; `try_order_create`; `delivery_*`; `settlement_detail`, `customer_approve_bill`, `payment_*`; `cancel_trial`, `trial_return_items`, `process_return`, `update_hygiene_status`; `admin_*` reports/recovery/tickets; zone/exclusion CRUD.

Frontend HTTP helper uses Axios credentials/session cookies, fetches `auth_csrf` before POST, returns structured error data, and clears cached identities on 401. LocalStorage account flags are not authorization. React API base is `REACT_APP_API_URL` or current hostname at port 8000.

Customer routes: `/home`, `/productpage`, `/productdetailspage`, `/mybagdisplay`, `/signindisplay`, `/signupdisplay`, `/forgotpassword`, `/displaycheckout`, `/ordersuccess`, `/profile`. Admin: `/adminlogin`, `/admindashboard/*`. Rider: `/delivery/login`, `/delivery/dashboard`, `/delivery/order/:taskId`, `/delivery/help-center`. A catch-all NotFound route exists.

WebSockets: `/ws/orders/` and `/ws/order/<order_id>/`, configured in ASGI with origin checks and session middleware; consumers enforce ownership. Use events to refresh authoritative data, not to trust client-supplied totals. Redis configuration exists but multi-worker behavior still needs real validation.

OTP is hashed, purpose/session-bound, expiring, attempt-limited and rate-limited. Production must have a real delivery provider; do not remove fail-closed behavior. Gateway captures must verify provider identity, amount, currency and purpose; never accept a client boolean saying paid. No credentials belong in frontend source.

## 9. Migration landmarks and configuration

Latest migration file observed: **0038**. File presence does not prove a particular database has applied it; use `showmigrations`.

| Migration | Change |
|---|---|
| 0029 | Explicit trial completion and selection approval |
| 0030 | OTP challenges |
| 0031 | Support tickets |
| 0032 | Catalog/inventory relationship protection |
| 0033 | Reservation expiry, dispatch/cancellation and payment recovery metadata |
| 0034 | Rider support tickets |
| 0035 | Scheduled delivery date |
| 0036 | Variant stock/price checks and product/color/size uniqueness |
| 0037 | Trial-return scanned/verified tags and garment security tags |
| 0038 | Unique customer/variant review and rating bounds |

Relevant backend environment variable names: `DJANGO_DEBUG`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `FRONTEND_ORIGINS`, `REDIS_URL`, `OTP_TEST_MODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RECEIPT_SELLER_NAME`, `RECEIPT_SELLER_ADDRESS`.
Local debug can create `.local-secret`; production requires a configured secret. Settings use `os.environ`; do not assume an arbitrary `.env` file is automatically loaded. Launcher forces local debug/localhost settings. Read `RUN_PROJECT.md` and `PAYMENTS_SETUP.md` for operational detail, checking them against current code.

## 10. Known discrepancies and work still requiring verification

The older `PROJECT_REVIEW_2026-09-24.md` now labels many A01–A36 rows “All Fix”, while its lower historical observations still describe the same issues as open. **Do not treat that label or its old DB counts as a current test result.** The following findings are from this handoff's source inspection:

1. **Launcher dependency parser:** `scripts/check-dependencies.py` splits every line on `==`, but the current requirements file starts with a comment. That probe will fail on the comment and trigger the launcher's dependency-install fallback unnecessarily. Handle comments/blank lines in a future launcher fix; do not confuse it with missing packages.
2. **Billing divergence:** current COD/waived-fee behavior differs from historical upfront-credit behavior. Audit old paid orders, receipts, frontend wording and payment tests together before claiming the whole workflow matches one policy.
3. **Slots:** checkout currently validates slot text as nonempty and <=50 characters; it does not enforce an allowed slot list there. It accepts dates from today through today+3 days. The report's stronger slot-validation claim is not supported by this code. Capacity and already-passed time slots need targeted checks.
4. **Timer/SOS:** inspected trial-completion code emits an overdue event after 900 seconds; that is not automatic hard-stop enforcement. Do not promise a scheduler or guaranteed SOS arrival based on an overdue badge. Confirm timezone behavior for India; settings historically use UTC.
5. **Rider capacity:** batching partitions groups into batches of at most five; this alone does not prove a rider has at most five active orders across all batches. Route distance is a heuristic, not a verified road-traffic ETA.
6. **Production:** SMS, live/test Razorpay end-to-end verification, seller/GST setup, HTTPS/proxy/static-media/database configuration, backups, multi-worker/load testing and real service-area approval remain deployment work. Redis packages/configuration alone are not a load test.
7. **Sensitive artifacts:** previous review identified tracked SQLite/SQL/environment artifacts. Current `.gitignore` excludes environments and dependencies, but ignore rules do not remove already tracked files/history. Check tracking explicitly without printing secret contents before distributing the repository.
8. **Catalog data:** previous counts (12 products, 2 variants, 10 without variants) are historical. Unavailable UI does not supply missing real merchandise. Recount only if the task needs it; never guess commercial data.
9. **Migrations/image cleanup:** review constraint migrations against existing duplicates/invalid rows before applying to another database. Image cleanup signals exist; storage effects around rollback/shared filenames deserve targeted validation before claiming all orphan/asset cases are solved.

These are caveats, not authorization to change product policy during unrelated tasks. This document intentionally does not claim every possible bug has been discovered.

## 11. Tests and focused reading

Backend tests under `sevenshades/sevenshadesapp/`: `test_checkout.py`, `test_catalog.py`, `test_delivery.py`, `test_inventory.py`, `test_workflow.py`, `test_payment_recovery.py`, `test_security.py`, `test_otp.py`, `test_validation.py`, `test_order_events.py`, `test_admin_workspace.py`. Read the test covering the changed workflow, and assert resulting state/ownership/inventory rather than only HTTP success.

Frontend tests sit beside components or under their feature folders: CatalogWorkspace, AdminReports, PaymentRecovery, DeliveryOps, DeliveryBatches, CustomerBill, CustomerAuth, TrialInventoryControls, CheckoutFlow and others. Locate with `rg --files -g '*.test.js' sevenshadesfrontend/src`.

Further historical detail, only when needed: `Idea-of-project.md`, `STARTUP_DECISIONS.md`, `CHECKOUT_IMPLEMENTATION.md`, `DELIVERY_IMPLEMENTATION.md`, `INVENTORY_IMPLEMENTATION.md`, `SECURITY_IMPLEMENTATION.md`, `AUTH_VALIDATION_IMPLEMENTATION.md`, `ADMIN_WORKSPACE_IMPLEMENTATION.md`, `RESERVATION_RECOVERY.md`, `WORKFLOW_VERIFICATION.md`, `PAYMENTS_SETUP.md`, `PROJECT_REVIEW_2026-09-24.md`.

## 12. Copyable prompt for the next AI

> Read AI_PROJECT_HANDOFF.md first. Use its business rules, current-code caveats and task-to-file map to understand SevenShades. Then inspect only the source/tests relevant to my request and current working-tree changes. Do not re-analyze dependency folders or dump databases/secrets into context. Preserve existing data and unrelated changes. Do not assume historical “fixed” labels or test counts describe the current tree. Implement my requested change, verify it with appropriate checks, and update this handoff with what changed and any remaining limitations.
