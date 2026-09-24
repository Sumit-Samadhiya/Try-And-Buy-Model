# Admin workspace

- Quick Dashboard: booking-period metrics, order progress, recent orders and links to operational queues. Rider availability, low stock and open ticket counts show the current store-wide state.
- Sales Report: customer/contact information, order status, item value, verified trial fees, fee adjustment, settled final balance and outstanding generated bills. Search, inclusive date range, status, final-payment status and payment-method filters; pagination supports 10, 20 or 50 rows. Summary totals cover every matching order, not just the visible page.
- Support Tickets: database-backed customer submissions, customer identity, search/date/status/priority filters, pagination, detail view and customer-visible responses. Concurrent edits require refreshing the ticket instead of overwriting a newer update.
- Responsive admin navigation and shared cards, tables, loading, empty and error states.

Date filters use UTC booking/creation dates. These are order-cohort reports, not payment-transaction-date accounting reports. Collected = verified trial fee + paid final balance; adjusted fees are not added again. An order without a final bill has zero generated outstanding balance.

Migration 0031_support_tickets adds persistence. Previously browser-local tickets are not automatically uploaded; new submissions are available to administrators. Existing browser storage is not deleted.

Access controls restrict reports and ticket updates to administrators; customers can submit and view only their own tickets. Mutation requests retain CSRF protection. The new automated tests cover report totals/filter validation, access controls, ticket ownership, replies and stale updates; frontend tests cover report filtering, dashboard metrics and ticket updates.
