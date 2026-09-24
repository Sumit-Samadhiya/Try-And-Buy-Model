# Doorstep order and settlement verification

Verified 24 September 2026.

Latest flow update: Trial In Progress → Trial Completed → rider sends selection (AWAITING_SELECTION_APPROVAL) → customer Approve Selection (SELECTION_SUBMITTED) → payable bill and payment method choice → verified collection/payment → Delivered. Delivery Ops automatically opens the shared selection panel after Trial Completed; it can be reopened from Latest Status. Trial completion records its timestamp once. Customer profile shows the separate trial-completed and approved-selection milestones.

Validation for this update: the full backend run passed 53/54 tests; an older batch fixture was updated to include Trial Completed, then all 14 delivery/workflow tests passed. Frontend full run passed 20/21; after updating the stale-approval fixture and adding two stage/panel tests, all 7 affected tests passed (23 frontend tests overall). Migration 0029 applied locally. This report covers the six-step workflow; it supersedes earlier payment/approval limitations in the phase reports.

| Step | Implemented behavior | Verification |
| --- | --- | --- |
| Trial booking | 1–4 unique variants, authoritative prices/address/stock; existing free first standard trial, ₹49 repeat standard and ₹99 SOS rules retained. Fee-bearing orders wait in AWAITING_TRIAL_PAYMENT until capture, then TRY_REQUESTED. | Checkout regression and four-item workflow tests; mocked verified Razorpay upfront fee. |
| Admin dispatch | New-order alerts; active rider assignment; ASSIGNED state. Fresh shared GPS ranks approximate nearest riders; missing GPS falls back to zone/workload without inventing distance. | Ownership, location freshness, assignment and batching tests. |
| Live tracking | Session-authorized account/order WebSockets update customer, admin and rider; reconnect and 15-second reconciliation polling. OUT_FOR_TRIAL then TRIAL_IN_PROGRESS. Server records one 15-minute deadline that survives refresh. | Actual ASGI socket tests for account isolation/logout; stage and timer tests; running server accepted account socket after restart. |
| Selection and billing | Rider selects retained items, generates versioned bill, verified prepaid fee adjusted up to item total. Changes invalidate previous approval. Online payment attempts lock the bill. | Four-to-two selection, revision/replay, invalid quantity and stock tests. |
| Customer approval/payment | Customer popup and Orders bill; only owning customer approves current revision. Assigned rider records cash after approval. Razorpay orders, signature, captured amount/currency, signed webhook and reconciliation verified on server. | Cash API workflow and frontend interactions; mocked gateway capture, forgery/amount mismatch, pending vs captured, ownership, retries and duplicate webhook tests. No live/test-mode provider transaction was made. |
| Completion/warehouse | Paid approved bill plus collection required for delivery. Immutable authorized payment receipt after delivery; live admin collected-payments summary. Trial returns queue for warehouse receipt, intact-tag/good-condition checks, recorded steam-press, then once-only stock release. | Full four-item cash API workflow through receipt and stock; no-purchase, missing tag, duplicate completion, ownership and concurrency regressions. |

## Results

- Backend baseline: 54 tests; latest update validation above.
- Frontend baseline: 21 tests across 9 suites. Latest update adds two tests; validation above. After correcting async timing in two test suites, those 5 affected tests passed on the focused rerun; the other 16 passed in the full run.
- Migrations 0027_doorstep_settlement and 0028_dispatch_locations applied locally. Migration drift check: no changes detected. Git whitespace check passed.
- Frontend retains existing CRA dependency and product style warnings; these are separate from order-flow behavior.
- Tests use isolated fixtures and do not place real customer orders or move live money. This is automated API/socket/component verification, not a completed manual three-device acceptance run.

## Confirmed policy

Finalized purchased items have no return/refund option. Rejected trial garments follow collection and warehouse processing. No-purchase selection still needs customer approval, then collection; no merchandise receipt is fabricated. A fee paid for the trial is only offset up to retained-item value; unused fee is not refunded by this implementation.

## Remaining activation and operational limits

1. Razorpay keys are not configured in this local backend. Free standard first trials and cash settlement are usable; paid trial booking and online payment stay disabled until gateway setup. Follow PAYMENTS_SETUP.md, then perform a real Razorpay test-mode acceptance flow before live activation.
2. Seller/GST details are not ready, as confirmed by the owner. Download is an HTML payment receipt that can be printed/saved as PDF, explicitly not a tax invoice. Tax invoice generation remains pending seller details, product tax configuration and verification.
3. Nearest distance is straight-line, based on user-shared saved-address GPS and rider GPS updated within 30 minutes. No background tracking, route optimization or fabricated live map.
4. Channel layer is currently in-memory for this single backend process. Multi-process production deployment needs a shared channel backend and secure deployment configuration.
5. An uncertain provider-order creation is held for reconciliation and does not issue a second order automatically. Pending paid-trial reservations do not expire automatically. Operations must resolve abandoned/uncertain attempts against Razorpay before release; there is no general-purpose reconciliation dashboard yet.
6. Historical paid orders without customer approval, legacy stock without reservation records, and historical returns without tag/steam evidence require reconciliation; no migration invents approvals or stock eligibility.
7. Online UPI is through Razorpay Checkout. Arbitrary static rider QR transfers cannot be manually asserted as verified online payments.

## Manual acceptance after gateway setup

Use separate browser sessions for customer, admin and rider. Book four in-stock variants; verify upfront fee where applicable. In admin, assign an active rider. Rider starts route and doorstep trial; refresh and confirm timer continuity. Retain two items and generate bill. Customer reviews popup, approves and pays. Confirm cash only after physically receiving it, or wait for Razorpay verification. Collect the two unselected garments with tag/condition checks; complete delivery. Customer downloads receipt; admin sees completion and collected amount. Receive the two returned garments in Returns & Stock, confirm steam-press, approve restock. Repeat with zero retained items and with a changed bill before approval.
