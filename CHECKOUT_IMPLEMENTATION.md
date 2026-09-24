# Checkout and inventory validation

- The product selector uses actual catalog variant IDs, sizes and colors. The bag carries size through checkout, with one piece per variant and at most four variants.
- Checkout requires an address_id owned by the signed-in customer. The server uses the saved address, validates the exact six-digit delivery postcode and rejects excluded areas.
- Names, brand, price, size and color come from the database. A positive offer is used only when no greater than the regular price. Invalid base prices are rejected.
- New TryOrderItem and FinalOrderItem rows preserve size/color snapshots. Historical rows remain blank because their original selected sizes cannot be reconstructed reliably.
- ProductDetails.qty now represents stock available to reserve. Checkout atomically decrements it and creates the order; any failure rolls back all reservations. A customer-row write serializes SQLite checkouts; conditional stock updates prevent negative stock. Database contention returns a retryable error.
- An active order, including Final Payment Pending, prevents another checkout. Paid trials remain disabled until a verified gateway exists.
- New trial items have stock_reserved=True. A completed cash purchase consumes the reservation without another decrement and marks the item PURCHASED.

## Still pending

- Trial returns and unassigned cancellation now use the workflow documented in INVENTORY_IMPLEMENTATION.md. Returned garments remain unavailable until warehouse receipt and hygiene approval. Finalized purchases are non-refundable. Historical stock reconciliation remains separate.
- Historical orders were never reserved. Existing catalog quantities need physical reconciliation before production use. Admin stock editing still sets an absolute quantity and must be coordinated with inventory operations.
- Missing catalog variants and invalid catalog prices need merchant data; no sizes, quantities or prices were invented.
- Delivery status normalization and batch assignment remain separate work. Delivery slots are currently display labels, not capacity reservations.

## Validation

Backend tests cover authoritative snapshots, invalid size/quantity, duplicates, rollback when another item is unavailable, exact postcode/address ownership, pending orders, paid-trial rejection, price rules, authenticated final selection and purchase, and concurrent last-unit reservation. Frontend tests cover actual variant selection, out-of-stock controls, the bag-to-checkout size/address payload and double-click prevention.
