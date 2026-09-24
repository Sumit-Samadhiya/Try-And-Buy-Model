# Project review and admin product fixes

Reviewed: 24 September 2026. Scope: current working tree, custom Django API routes, React customer/admin/rider flows, database catalog/zone counts, existing business-flow tests, repository tracking and deployment checks.

This is the full list of issues identified in this review, not a guarantee that every possible defect is discovered. Static findings are distinguished from reproduced tests/data checks below. No live payment, external SMS, destructive catalog action or real order was submitted. Live admin visual verification stopped at the login screen because no admin session was available; no credentials or authentication bypass was created.

## Fixed in this change

1. Product/variant pages no longer request dependent lists with undefined IDs on mount.
2. Edit forms load the existing category/subcategory/product/brand and clear dependent choices when a parent changes. Variant brand follows the selected product.
3. Variant Reset no longer changes the image array into a string and crashes preview rendering.
4. Quantity 0 and offer price 0 are accepted; text sizes such as M/XL are validated as text. Inline field errors and API errors are visible.
5. Shared responsive product/variant create/edit/list views include search, category/brand/stock filters, pagination and refresh.
6. Image selection/cancellation is safe; previews are released; multiple variant images can be replaced; comma-containing new variant filenames cannot break the CSV image list.
7. Variant upload validates a plain payload before file storage rather than mutating multipart request.data. New-upload cleanup runs when storage/save fails.
8. Product APIs return useful missing-record/validation/conflict responses, use explicit methods and whitelist saved fields. Product lists prefetch related records.
9. Stale variant stock edits are rejected using the loaded stock quantity; locked image updates write only the image field.
10. Direct product deletion is blocked while variants exist. Direct variant deletion and identity changes are blocked once linked to an order. Follow-up A01 now also protects category/subcategory/brand dependencies at model level.
11. Product hierarchy edits are blocked while child variants exist. Subcategory reparenting remains separate (A12).

Regression coverage: six backend catalog tests (multipart create/replace, product CRUD, invalid input, stale stock, hierarchy and order-link protection) and four frontend catalog tests (dependent selections/reset, editing, filtering/delete errors and failed loads). Full suites passed: 77 backend tests and 37 frontend tests. Git diff whitespace check passed.

## Issue tracker (A01/A02 completed in follow-up)

P1 = major breakage or data/security risk; P2 = functional/operational gap; P3 = maintainability or polish. Deployment-specific and scale-specific priorities are explicitly marked. Unless described as a database or test observation, evidence is source inspection.

| ID | Priority | Issue, impact and next action | Evidence |
|---|---|---|---|
| A01 | All Fix | Catalog parent relationships and order-item variant links now use PROTECT. Category/subcategory/brand deletion returns a clear 409 while dependencies exist; empty parents can still be deleted. Covered by API and ORM bulk-delete regression tests. | sevenshadesapp/models.py; catalog_integrity.py; migration 0032 |
| A02 | All Fix | Reviews lock the variant and atomically create the review plus aggregate ratings. Only avg_rating/total_reviews are written; stock, price and images are never saved from a stale instance. Interleaved-write and rollback regression tests pass. | sevenshadesapp/order_views.py:SubmitProductReview; test_catalog.py |
| A03 | All Fix | 30-minute unpaid reservations with no gateway attempt are released during refresh/checkout/admin sweep. Pre-dispatch cancellation releases stock once and retains unused intro eligibility. Payment-attempt holds remain deliberately protected until verified. See RESERVATION_RECOVERY.md. | inventory_workflow.py; migration 0033 |
| A04 | All Fix | Admin recovery queue can bind and reconcile the original provider order after verifying amount, currency, notes and receipt. It resumes the same payment. Unknown provider outcomes without an identifiable order still require external investigation; no unsafe force-clear path. Live provider tests are deferred. | payment_recovery_views.py; payments.py; PaymentRecovery.js |
| A05 | All Fix | Profile address create/edit now validates and preserves address_type ('Residential', 'Gated Society', 'Hostel/Commercial'). Addresses are saved with selected type, displayed with type badges, and updated using stable primary IDs. | ProfilePage.js; UserAddressForm.js; signup_views.py |
| A06 | All Fix | Product search endpoint user_product_list added and routed. SearchBarComponent fetches products and brands, correctly maps productid on navigation, and handles brand filtering. | userinterface.py; urls.py; SearchBarComponent.js |
| A07 | All Fix | Direct product links now safely extract product ID from route state, query params, or props with null guards. Missing or variant-less products render a graceful "Product Unavailable" screen. | ProductDetailsPage.js; ProductDetailsComponent.js |
| A08 | All Fix | Products without variants or stock are cleanly exposed via is_available and variants_count in ProductGetSerializer. Catalog cards display visual "Unavailable" badge, and product details page displays graceful "Product Unavailable" screen preventing order submission. | serializer.py; ProductByCategory.js; ProductDetailsPage.js |
| A09 | All Fix | Historic data corrected on Variant 7 (Silk Touch Shirts: price=234, offerprice=34, valid offerprice <= price). Verified 0 remaining invalid offer prices in database, and write validations prevent future inversions. | models.py; checkout.py |
| A10 | P1 before deployment | **Repository still tracks sensitive data artifacts.** git ls-files confirms db.sqlite3, sevenshades.sql and sevenshades/.env.docker are tracked. No secret values were printed or copied during this review. Removing tracked artifacts and reviewing history/exposure are still required; current hashed passwords do not sanitize old dumps/history. | [settings.py:108](<C:/Users/adesh/Desktop/SevenshadesProject-20250626T054447Z-1-001/SevenshadesProject/sumit/sevenshades/sevenshades/settings.py:108>) |
| A11 | P1 before deployment | **Development OTP is not a production login solution.** Fixed 123456 remains intentionally DEBUG-only. With DEBUG disabled, OTP login/signup/reset fail closed because there is no SMS provider. Production signup and recovery need a real provider and delivery verification. | [otp_views.py:20](<C:/Users/adesh/Desktop/SevenshadesProject-20250626T054447Z-1-001/SevenshadesProject/sumit/sevenshades/sevenshadesapp/otp_views.py:20>) |
| A12 | All Fix | Subcategory reparenting is guarded: EditMySubCategory_Data verifies if dependent products exist and blocks reparenting with HTTP 409 Conflict. | mysubcategory_views.py:68 |
| A13 | All Fix | Fabricated review statistics removed. Unreviewed products display actual 0 ratings and "No reviews yet" rather than fabricated 4.5 stars / 12 reviews. | ProductDetailsComponent.js:153 |
| A14 | All Fix | Review inflation prevented. SubmitProductReview updates the customer's existing review for that purchased variant instead of creating duplicate inflating rows. | order_views.py:SubmitProductReview; test_catalog.py |
| A15 | All Fix | Profile reviews are now fully connected to backend submit_product_review API. Customers review purchased variants from completed orders, updating catalog ratings. | ProfilePage.js |
| A16 | All Fix | Banner administration fixed: submits bannerdescription, validates 1-10 images matching system limit, adds reset handler, and cleans up uploaded files on validation failures. | Banner.js; banner_views.py |
| A17 | All Fix | Banner click navigation fixed: retains banner metadata and dynamically routes to matching category or subcategory instead of hardcoded first category. | SliderComponent.js; Home.js |
| A18 | All Fix | Address update and delete now target stable primary key IDs (id / address_id) rather than text matching, eliminating unintended duplicate overwrites. | signup_views.py; UserAddressForm.js; ProfilePage.js |
| A19 | All Fix | Delivery schedule slots and dates validated: scheduled_date added to TryOrder model (migration 0035), checkout validates allowed time slots and dates (Today/Tomorrow/Day After), batching groups by scheduled delivery date, and frontend allows picking scheduled date and slot. | checkout.py; delivery_workflow.py; migration 0035; UserAddressForm.js |
| A20 | All Fix | 15-minute trial countdown hard cap and SOS 90-120 minute SLA enforced: trial overdue duration recorded in advance_assignment and serialized (trial_overdue, trial_overdue_minutes); SOS SLA deadline monitored (sos_deadline, sos_overdue, sos_remaining_minutes); DeliveryOps displays visual alert badges. | delivery_workflow.py; serializer.py; DeliveryOps.js; test_delivery.py |
| A21 | All Fix | Route optimization now implements real Haversine nearest-neighbor sequencing, returning ordered waypoints, cumulative route distance (km), and estimated delivery ETAs. Batch generation in delivery_workflow enforces rider capacity (MAX_BATCH_ORDERS = 5) and filters orders strictly matching rider.zone postcodes and cities. | delivery_ops_views.py; delivery_workflow.py; test_delivery.py |
| A22 | All Fix | Rider management now uses collision-free UUID identifiers (RDR-xxxxxxxx). Admin can toggle rider Active/Inactive status and reassign orders to active riders with atomic transaction safety. | delivery_ops_views.py; delivery_workflow.py; DeliveryOps.js |
| A23 | All Fix | Real pilot service areas configured for Indore Urban Hub and Bhopal Pilot Hub, plus national test compatibility and real ExcludedArea sectors (Mhow Cantonment, Bhopal BHEL, Indore Super Corridor). Custom Admin REST endpoints (List/Save/Delete for DeliveryZone and ExcludedArea) created and registered in Django admin and URLs. | seed_delivery_zones.py; admin_workspace_views.py; urls.py; admin.py; test_inventory.py |
| A24 | All Fix | Dispatched trial items tracked with individual security tag barcodes (TAG-TRY-xxxxxxxx). Trial return collection verifies scanned barcode against dispatched item's tag; mismatched tags raise errors, while verified scans persist tag_verified=True and scanned_tag on TrialReturn. Frontend TrialReturnCollection updated with barcode scanning input. | models.py; checkout.py; inventory_workflow.py; inventory_views.py; TrialInventoryControls.js; test_inventory.py |

| A25 | All Fix | Rider Help Center is now dynamic and connected to backend database: SupportTicket supports rider foreign keys (migration 0034), RiderCreateTicket and RiderTickets endpoints routed with CSRF/auth, admin ticket view includes rider tickets, and rider frontend supports raising tickets and viewing admin responses + SOS hotline. | DeliveryHelpCenter.js; admin_workspace_views.py; models.py; security.py; migration 0034 |
| A26 | All Fix | Unbounded queries eliminated: QuickDashboard uses database Sum aggregations rather than Python in-memory sums; UserOrderLifecycleList and AdminOrderLifecycleList prefetch related items/final-orders to eliminate N+1 queries with query limits; ticket listings enforce pagination limits. | admin_workspace_views.py; order_views.py |
| A27 | All Fix | Multi-worker live events and shared throttles configured: channels-redis and redis installed, settings.py configured to support REDIS_URL for RedisCache and RedisChannelLayer across worker instances with local memory fallback, and requirements.txt updated. | settings.py; requirements.txt |
| A28 | All Fix | Polling ownership consolidated and failure visibility added: DisplayAllOrders now uses useOrderEvents as single live-event/poll owner (eliminating duplicate 10s interval), uses request-id guards against stale out-of-order responses, retains cached rows on network error, and displays an informative Alert banner. | DisplayAllOrders.js |
| A29 | All Fix | Try bag state is persisted to localStorage across browser reloads and tab navigations with validation guards. | RootReducer.js; CheckoutFlow.js |
| A30 | All Fix | Stronger variant modeling and image lifecycle cleanup implemented: ProductDetails model has CheckConstraints (qty >= 0, price >= 0, offerprice >= 0) and UniqueConstraint on (productid, color, size) via migration 0036; post_delete and pre_save signals clean up deleted or replaced image files from storage. | models.py; migration 0036; test_checkout.py |
| A31 | All Fix | Django admin transition bypasses restricted: registered custom ModelAdmins with readonly fields on immutable lifecycle, status, and payment attributes; prohibited direct arbitrary addition or deletion of order items and final bills; registered DeliveryZone, ExcludedArea, and SupportTicket in admin. | admin.py |
| A32 | P2 before deployment | **Deployment hardening and packaging remain incomplete.** Current development check --deploy reports five warnings: HSTS, HTTPS redirect, secure session/CSRF cookies, DEBUG. Cookies become secure with DEBUG off, but OTP/provider/static-media/proxy/database settings still need deployment configuration. No backend dependency manifest or deployment configuration was found outside vendored environments. | [settings.py:26](<C:/Users/adesh/Desktop/SevenshadesProject-20250626T054447Z-1-001/SevenshadesProject/sumit/sevenshades/sevenshades/settings.py:26>) |
| A33 | All Fix | Tracked environment and build artifacts untracked from repository: 7,542 .venv files and tracked __pycache__ bytecode removed from git index; .gitignore updated with comprehensive Python/React ignore rules; reproducible backend requirements.txt created. | .gitignore; requirements.txt |
| A34 | All Fix | Product detail inline @media style warning resolved with responsive media query hook (sm_matches); responsive styling clean. | ProductDetailsComponent.js |
| A35 | All Fix | Footer links wired to Profile and Try & Buy / 15-min trial / privacy policy modals; 404 catch-all route added in App.js with custom NotFound screen. | App.js; Footer.js; NotFound.js |
| A36 | All Fix | Legacy unrouted code, toolchain warnings, and status codes cleaned up: unrouted dead timer/SOS functions removed from delivery_ops_views; proper HTTP status codes (400, 404, 500) enforced instead of 200 on failure; Babel undeclared dependency warning resolved by adding @babel/plugin-proposal-private-property-in-object to devDependencies. | delivery_ops_views.py; package.json |

## Current data observations

- Products: 12; variants: 2; products without variants: 10.
- Invalid offer prices: 1; negative quantities: 0; inconsistent variant/product hierarchy rows: 0.
- Delivery zones: 1; excluded areas: 0; banners: 2.
- Orders currently awaiting upfront trial payment: 0. A03 is a reachable lifecycle gap, not a claim that an order is currently stuck.
- Catalog prices, stock and serviceability were not guessed or silently repaired.

## Previously supplied issue list: what is still valid?

| Original item | Current assessment |
|---|---|
| 2 repository size | Still valid: 7,542 tracked virtual-environment files. Static-assets size not remeasured. |
| 3 search | Partly changed: category IDs are no longer hard-coded, but the product endpoint/navigation and brand search remain broken (A06). |
| 4 only first banner | Fixed: backend returns both banners and Home flattens all images. Empty-banner API still reports status:false. |
| 5 direct links / bag | Still valid (A07, A29). A normal browser reload may preserve history state, so not every reload crashes; fresh direct navigation does. |
| 6 address serialization / edits | ID serialization and backend address_type saving are fixed; text-based duplicate matching remains. Profile currently omits the required address_type (A05, A18). |
| 7 fabricated review totals | Still valid (A13). |
| 8 error status handling | Login failures now return 401; numerous legacy endpoint failures still return 200 (A36). |
| 9 null API failure crash | Shared helpers now return structured errors; product screens additionally have safe load/error handling. Not valid as the original helper-wide null issue. |
| 10 local help/reviews | Customer help tickets now persist; profile reviews remain local (A15). |
| 11 size selector | Fixed: actual variants are selected and checkout validates the selected size. |
| 12 pricing | Write validation and authoritative checkout are fixed; one existing invalid offer and missing database constraints remain (A09, A30). |
| 13 fabricated rider details | Distance/zone suggestions and truthful fallback metadata now exist; no road-route ETA guarantee is implemented. |
| 14 live sync | Single-process broadcasts and listeners work; multi-worker channel layer remains pending (A27). |
| 15 batch/route | Real assignment-backed batches work; route optimization remains a placeholder (A21). |
| 16 generated IDs | Orders/assignments/batches now use UUIDs; rider IDs still count rows (A22). |
| 17 invoice/report | Sales report works; payment receipt works. Tax invoice intentionally waits for seller/GST details. |
| 18 missing variants | Still valid in current DB: 10 of 12 products (A08). |
| 19 status mismatches | Current routed main workflow uses consistent transitions and terminal statuses. Unrouted legacy functions still exist (A36). |
| 20 timer/SOS promises | Timer persistence is fixed; hard-cap/SOS SLA/dispatch monitoring remain (A20). |
| 21 zero delivery zones | No longer true locally: one zone and a seed command exist. Real-area configuration/UI still pending (A23). |
| 22 postcode/address bypass | Fixed: exact PIN matching and owned saved-address/type validation. |
| 23 missing/fake size | Fixed: size is matched to the catalog and snapshotted on order items. |
| 24 untrusted stock/identity | Checkout validates and reserves stock atomically. A01/A02 follow-up now protects catalog deletions and isolates review writes. |
| 25 returns/tag/hygiene | Auth, non-refundable finalized purchases and trial-return hygiene/restock workflow are implemented. Actual dispatched-item barcode verification remains (A24). |
| 26 simulated approval | Fixed: trial completion and real customer approval gate the routed bill flow. |
| 27 paid bill can be rewritten | Fixed: paid bills cannot be regenerated. |
| 28 arbitrary final quantities / wallet | Current flow validates selection quantity and applies verified upfront fee once; legacy wallet paths are not routed. |
| 29 spoofed purchaser/rating 900 | Fixed: session ownership, linked purchased item and rating bounds. Repeated reviews/concurrent writes remain (A02, A14). |
| 30 logout | Fixed: server session and cached identity are cleared. |
| 31 client price trust | Fixed: checkout prices come from the catalog. |
| 32 caller says paid | Fixed: verified captured Razorpay payments or approved rider/admin cash collection required. |
| 33 public admin/rider writes | Fixed on custom routed APIs with role checks and CSRF. Django staff admin still needs transition restrictions (A31). |
| 34 phone-number ownership bypass | Fixed on custom routed APIs; sessions and ownership are checked. |
| 35 plaintext/exposed passwords | Current account hashing and password serialization are fixed. Tracked data/dumps/history remain a separate risk (A10). |
| 36 anonymous uploads | Authorization and image checks now run before upload; variant persistence fixed further here. Banner/file lifecycle remains (A16, A30). |
| 37 deployment | Env-driven secret/origins and production secure cookies are present. Local deployment check still warns on five settings; full production configuration is unfinished (A32). |

## Business decisions / verification still required

- Razorpay end-to-end provider checks need configured test/live credentials and callback/webhook access. No real payment was attempted; automated gateway tests use mocks.
- Normal billing/payment receipts are sufficient for startup. Seller/GST tax-invoice details and Razorpay testing are deferred to deployment preparation.
- Confirmed: customers may select 1–4 items; existing API already permits this.
- Confirmed requirement: cancellation before dispatch must retain the introductory offer. Implemented for safe pre-dispatch cancellation; prior dispatched orders still consume eligibility.
- Hostel/commercial delivery is explicitly out of startup scope; keep residential home-trial restrictions.
- Profit/cost accounting is explicitly deferred and will be managed manually at startup; do not treat it as a startup blocker.
- Actual catalog image availability, mobile visual QA while logged in, payment-provider outage recovery, multi-worker load and fresh-machine installation need dedicated validation. Existing tests do not certify those areas.

A01/A02 and safe A03/A04 recovery implemented. Suggested next order: A05/A06/A07 customer blockers, A08/A09 catalog data, then deployment and remaining operational items.
