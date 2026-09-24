# Reservation and payment recovery

## Customer rules

- Customers may cancel before dispatch, including an Assigned order whose rider has not moved to On Route.
- Dispatch records a persistent dispatched_at timestamp. Cancellation after dispatch remains blocked.
- A cancellation before dispatch does not consume an otherwise unused introductory offer. A previous dispatched/completed trial still consumes it; cancelling a later order does not grant another free trial.
- Stock releases atomically and only once; assigned riders see Cancelled and cannot progress the order. Empty completed/cancelled batches are closed.
- Collected trial fees and any existing online payment attempt require financial reconciliation. No automatic refund or unverified cancellation was introduced.

## Safe expiry

An upfront-fee order gets a 30-minute reservation deadline. Expiry only cancels AWAITING_TRIAL_PAYMENT orders with no captured trial fee, no gateway attempt and no delivery progress/final bill. Expiry is processed on customer order refresh, settlement refresh, new checkout and the admin release action. It is not an exact wall-clock background timer. The expire_trial_reservations management command is available for a deployment scheduler; no recurring job was installed in this local session.

If an online attempt exists (even a timeout/failed-looking attempt), stock is held because the same provider order could still receive a late payment. Such holds are explicitly listed in Admin > Payment recovery.

## Admin recovery

- Search by order ID/mobile and page through pending orders.
- Release only safe expired reservations or cancel an eligible pre-dispatch order.
- Payment setup now persists a unique receipt reference before the provider request.
- For a lost provider response, find the original Razorpay order using that reference and enter its order ID. The server fetches the order and checks ID, currency, amount, local_payment_id notes and the persisted receipt reference. Admin identity and recovery time are recorded.
- Recovery resumes that same provider order; it does not create another payment or mark it paid from the typed ID. Captured payments are reconciled against the expected amount/order/currency and bill approval. Uncaptured orders stay reserved and can resume online checkout.
- For older attempts with no stored receipt reference, provider local_payment_id notes must still match.
- If no original provider order can be identified, there is deliberately no force-clear/mark-unpaid button. Provider confirmation/manual financial investigation is still required; live provider testing remains deferred by the owner.

Provider contract reference: [Razorpay Fetch an Order With ID](https://razorpay.com/docs/api/orders/fetch-with-id/) and [official SDK order API documentation](https://github.com/razorpay/razorpay-node/blob/master/documents/order.md). No live payment was made for this change; provider responses were mocked in tests.

## Migration

0033 adds dispatch/cancellation/deadline metadata and payment reference/recovery audit fields. Existing awaiting-payment deadlines derive from creation time; progressed orders get a conservative dispatch timestamp. The migration itself does not cancel or release any order.

## Startup collection decision

Normal payment receipts remain in place. The ₹49/₹99 collection method is not changed until the owner chooses admin-confirmed manual upfront collection or rider doorstep cash. Current fee-bearing checkout still requires gateway configuration; this is separate from safe cancellation/recovery.

Verification: 91 backend tests and 40 frontend tests passed. Migration 0033 applied locally; backend restarted. Admin browser visual verification still requires an authenticated browser session.
