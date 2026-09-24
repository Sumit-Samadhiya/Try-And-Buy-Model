# Delivery workflow and purchase policy

Finalized purchases are non-refundable. Customers choose at home before purchase; trial-item collection and unassigned cancellation remain separate. Checkout states this policy, and purchased-return requests are rejected. No refund option or refund integration is planned for purchased items.

## Delivery behavior

- New assignments require an active rider and pending order, begin as Assigned, and set the order's assigned rider/status together. Each order has one assignment enforced by the database. Repeat requests for the same pending assignment reuse it; reassignment needs a separate handover flow.
- Delivery advances Assigned -> On Route -> Trial In Progress -> Trial Completed -> Delivered. Unknown, skipped or backward transitions are rejected. Rider ownership is rechecked while the order is locked. Starting the trial records the server timestamp once.
- Order statuses use TRY_REQUESTED, ASSIGNED, OUT_FOR_TRIAL, TRIAL_IN_PROGRESS, TRIAL_COMPLETED, AWAITING_SELECTION_APPROVAL, SELECTION_SUBMITTED, PAYMENT_PENDING, DELIVERED, NO_PURCHASE and CANCELLED. Existing known legacy labels are normalized by migration.
- Saving payment does not complete delivery by itself. Delivery completion checks final selection, current customer approval and settled payment (including zero balance), and collection records for unpurchased reserved items. No-purchase completion records NO_PURCHASE. Warehouse/hygiene approval can happen afterward without making uninspected garments available.
- Admin Delivery Ops supports batches for a selected active rider. Pending unassigned standard orders are grouped by postcode, delivery slot and order creation date. Every batch has actual assignment members. Repeated generation produces no duplicate or empty batches. SOS and cancelled orders are excluded.
- Batch state advances to In Progress and then Completed as member deliveries progress. The batch list shows persisted order IDs and rider, not placeholder route calculations.

## Migration and limits

Migration 0026 preserves records, normalizes known labels, populates assigned rider references, and enforces one assignment per order. It stops for manual reconciliation if duplicate historical assignments exist; it never deletes them silently. Unknown historical statuses require manual reconciliation.

Delivery dates are not yet a separate scheduling field; batching groups the existing creation date and slot. Route optimization, capacity planning and reassignment handover remain separate work. Old unrouted prototype timer/SOS/order functions are not part of these APIs. Admin Latest Status shows current assignments, not a full event history.

## Verification

Backend tests cover assignment ownership and uniqueness, inactive/terminal rejection, forward-only progression, payment and collection gates, grouping, batch membership, replay, concurrent generation, CSRF and role access. Frontend tests verify active-rider selection, batch membership display, and the no-refund checkout notice. Existing authentication, checkout and inventory suites remain regression coverage.
