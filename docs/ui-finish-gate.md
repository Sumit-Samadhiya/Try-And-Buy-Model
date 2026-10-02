# DoorDrape UI finish gate — 2026-10-02

## Design contract
Customer: choose up to four trial items, understand applicable fees, approve the retained-item bill and pay cash. Admin: identify orders needing assignment and manage the rider. Rider: see the assigned order, current status and next permitted action, then record condition and cash collection. Keep the green brand and existing MUI components. Use compact operational rows for staff and image-led browsing for customers; prioritize readable status, totals and touch actions on narrow screens. Do not add decorative dashboards or advertise unavailable payments. Errors must offer recovery and disabled actions must retain their explanation.

## Reference patterns
- Shopify order details: keep products, subtotal and timeline together, preserving the order snapshot. https://help.shopify.com/en/manual/fulfillment/managing-orders/managing-order-details
- Zara payment methods: communicate options available for the actual order. https://www.zara.com/es/en/help-center/PaymentMethods
- Uber delivery instructions: separate collection and handover into explicit operational steps. https://help.uber.com/driving-and-delivering/article/what-is-shop--deliver-and-how-does-it-work?nodeId=48bc54ee-19ac-4b44-836e-0f31d72dbb0a

## Initial evidence
Live homepage desktop and 390px screenshots inspected. Hero action and category browsing are visible. Homepage advertises UPI and footer displays Paytm/Google Pay/Visa despite COD-only scope. Promotional Browse action scrolls to a fixed coordinate instead of opening the catalog. Live admin login succeeded; dashboard metrics and navigation rendered. Rider review and local verification in progress.

## Decision: HOLD
Final mobile/desktop verification and authenticated workflow states must be recorded before PASS. Live pages do not include local uncommitted fixes.

## Implemented and verified in this pass
- Customer marketing: removed UPI claims, replaced payment/social-logo strip with cash-after-trial text, disclosed applicable fees. Local desktop screenshot saved at `.runtime/ui-cod-desktop.jpg`; 390px footer inspected with document width 375px (no horizontal overflow).
- Browse Curated Styles now navigates to `/productpage`; verified by clicking in the local browser.
- Live rider dashboard at 390px showed vehicle/status chips extending beyond the card and horizontal scrolling. Updated the rider identity row to wrap, constrained vehicle chip width and allowed the main grid child to shrink. Post-fix authenticated browser verification is still required.
- Completed Today counted all completed tasks, without a date filter. Renamed to Completed Trials and shortened the completed tab label.
- Live admin desktop dashboard and live rider dashboard loaded through authorized accounts. Signing into another role replaces the shared browser session; no order changes were made.

## Remaining before PASS
- Local backend is unavailable: catalog error/retry state is visible locally, but authenticated local admin/rider screens cannot yet be visually verified.
- Recheck rider wrapping at 390px and desktop with real long names/vehicle labels after local backend setup or deployment.
- Complete narrow-screen admin assignment and populated customer bill/receipt screenshots, keyboard traversal and error-state verification.
- Review unconditional Sync Active / Radar Live indicators against actual connection state, and unsupported footer claims (such as Zero-Emission Fleet).
- Production has not received these changes. Do not interpret component tests or the development preview as full launch approval.

## Validation result
Production build compiled successfully. Initial concurrent build/test run timed out in three tests. After stopping the development server and finishing the build, the unchanged three suites passed all 9 tests in 22.4 seconds (DeliveryOps, DeliveryOrderDetails, CodJourney). A React TransitionGroup act warning remains in DeliveryOps tests; browserslist metadata is outdated. These checks do not prove post-fix rider layout.
