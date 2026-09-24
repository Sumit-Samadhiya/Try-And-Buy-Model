# Razorpay activation

Provider selected by the owner: Razorpay. Local environment currently has no configured gateway credentials. Never paste secret keys into chat or commit them.

## Server configuration

Set these environment variables in the environment that launches the Django backend, then restart it:

- RAZORPAY_KEY_ID: use a Razorpay test-mode key first.
- RAZORPAY_KEY_SECRET: matching server-only secret.
- RAZORPAY_WEBHOOK_SECRET: independent secret matching the configured webhook.
- RECEIPT_SELLER_NAME and RECEIPT_SELLER_ADDRESS: accurate business details when available. These do not activate tax invoices.

The backend reads process environment variables; merely creating a .env file does not load them automatically. Client receives only the public key ID and provider order options. Use test and live credentials/webhooks consistently and never mix modes.

Configure Razorpay payment capture and subscribe to payment.captured at the backend HTTPS URL /payments/razorpay/webhook (outside /api/). Razorpay cannot reach a localhost URL; use an approved reachable test deployment for webhook acceptance. Checkout callback and Check Existing Payment Status also verify capture directly on the server.

## What must pass before live activation

1. Paid trial: verified upfront capture changes AWAITING_TRIAL_PAYMENT to TRY_REQUESTED and permits assignment.
2. Final bill: owning customer approves the current revision, then checkout uses server-calculated INR paise amount after verified upfront adjustment.
3. Capture callback, signed webhook and later status reconciliation produce one payment result. An authorized-only payment remains pending. Invalid signatures, amount/currency mismatch and refunded entities are rejected.
4. Dismiss/reopen checkout resumes the existing provider order. Provider creation timeouts enter REVIEW; investigate against provider records/local_payment_id before making any administrative correction. Do not delete attempts or retry charges blindly.
5. Finish rider collection/delivery and confirm receipt access and admin totals.

Cash final settlement works without Razorpay configuration, but a fee-bearing trial still requires online upfront capture. Rider QR is not a manual payment-verification bypass.

## References

- [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Webhook validation](https://razorpay.com/docs/webhooks/validate-test/)
- [Fetch a payment](https://razorpay.com/docs/api/payments/fetch-with-id/)
- [Fetch payments for an order](https://razorpay.com/docs/api/orders/fetch-payments/)
