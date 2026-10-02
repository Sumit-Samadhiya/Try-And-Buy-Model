# COD journey automation

## Component integration

`sevenshadesfrontend/src/services/CodJourney.test.js` renders the real rider and customer billing components in sequence with a simulated API boundary. It verifies selection, bill display, customer-only approval, cash confirmation, physical return collection, completion gating and the customer receipt link. Remounting panels checks loading authoritative state on revisiting a screen. It does not test WebSocket delivery.

Run from the frontend directory:

```powershell
$env:CI='true'
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand CodJourney.test.js
```

## Real backend integration

The Django workflow suite creates isolated accounts, inventory and orders and uses role-specific API clients with CSRF checks. Verified scenarios:

- Four-item trial, admin assignment, two purchases, cash settlement, return collection and receipt.
- No purchase: customer approval and returns required before completion.
- SOS COD: waived delivery fee when purchasing, then cash collection and receipt.

These are in `sevenshades/sevenshadesapp/test_workflow.py`. They run against an isolated test database; no live orders are used.

## Limits

Component tests use mocked HTTP responses; backend tests do not run a browser. Their success is not proof of deployed cross-panel, cookie, proxy, WebSocket or mobile behavior. A full browser journey and CI execution are still outstanding. Warehouse/steam-press steps have been removed locally. Good-condition collections restore stock atomically; damaged or missing-tag items stay unavailable. Legacy pending return records are preserved and require stock reconciliation before sale.

## Return simplification verification (2026-10-02)

40 isolated backend tests passed across inventory, workflow and delivery suites, including concurrent return collection, repeat requests, damaged/missing-tag handling and complete COD settlement. Three frontend suites passed (9 tests): TrialInventoryControls, CodJourney and DeliveryOrderDetails. Existing Collected/Received return rows are not automatically restocked on retry; their historical condition must be reconciled separately. No production data was changed.
