# Trial returns and cancellation

## Available screens

- Customer profile: cancel an unassigned, unpaid trial. The server rejects assigned, dispatched or settled orders. Repeating a successful cancellation never releases stock twice.
- Rider order details: save customer selection, then record physical collection of unselected trial items in Good or Damaged condition. Only the assigned rider or an admin may record collection.
- Admin dashboard > Returns & Stock: record collection, confirm warehouse receipt, confirm steam-press completion for good items with intact tags, then approve hygiene or reject the return. Eligible items release their reservation once. Damaged or rejected items remain unavailable.

## Integrity

TrialReturn has one record per trial item, with collection, receipt and review actors/timestamps. Order-row writes serialize transitions, including SQLite, and stock increments share the same transaction as the final state change. Selection writers lock the same order and reject returned items. Cancelled orders cannot be assigned through the delivery assignment API. Purchased goods consume reservations and cannot enter this trial-return workflow.

The existing process_return endpoint now requires try_order_item_id, condition and explicit tag_intact boolean. update_hygiene_status now requires return_id and action (receive, steam_press, approve, reject). These endpoints no longer accept arbitrary hygiene strings or create unverified purchased returns. Legacy ReturnedItem records are preserved unchanged and never used to infer stock credits. Invalidated tags are rejected by scanning.

## Limits

- Business policy: finalized purchases are non-refundable. Customers choose items during the home trial. No purchased-item refund or return option is provided.
- Historical orders without stock reservations need physical reconciliation. Cancellation only restores reservations actually recorded by the new checkout.
- Rejected stock remains unavailable; repair, disposal or later reinspection needs a separate audited workflow.
- Cancellation is limited to unassigned trials. A dispatched trial follows collection/receipt/hygiene review.
- Existing absolute admin stock editing must be coordinated with physical reconciliation. See WORKFLOW_VERIFICATION.md for current delivery and settlement behavior.

## Verification

Backend coverage includes ownership/role/CSRF checks, duplicate collection and approval, approval-before-receipt rejection, damaged/rejected items, cancellation replay and assignment restrictions, legacy/purchased stock rejection, returned-item purchase rejection, and simultaneous approvals. Frontend coverage includes cancellation, rider collection, and warehouse receipt before approval.
