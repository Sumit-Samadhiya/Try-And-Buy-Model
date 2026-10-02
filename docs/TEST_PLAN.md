# Test Plan & Verification Matrix

## 1. Testing Philosophy
Define what "working" actually means before changing any code. Never rely only on localhost; verify across viewports, user roles, and network conditions.

---

## 2. Test Suites & Commands

### Frontend Test Suite
```bash
$env:CI="true"; npm test -- --watchAll=false
```
- **Coverage Areas:**
  - `TrialInventoryControls.test.js` (Trial limit, slot reservation, item limits)
  - `BudgetBazaarComponent.test.js` (Fallback image resolution, de-duplication)
  - `CustomerAuth.test.js` (Phone input validation, login session)
  - `PaymentRecovery.test.js` (Doorstep payment recovery, UPI / Cash logic)
  - `DeliveryOps.test.js` & `DeliveryOrderDetails.test.js` (Rider dispatch, trial status updates)
  - `CheckoutFlow.test.js` (Trial order creation, address selection)
  - `CatalogWorkspace.test.js` & `AdminReports.test.js` (Admin management)

### Backend Test Suite
```bash
python sevenshades\manage.py test sevenshadesapp
```
- **Coverage Areas:**
  - Storefront catalog API endpoints (`user_main_category_list`, `user_banner_list`, `user_budget_bazaar_list`)
  - Order state machine (`save_order`, `save_order_items`, `update_order_status`)
  - Admin & Rider authentication decorators (`check_admin_login`, `delivery_login`)
  - CSRF token validation and session protection.

---

## 3. Responsive & Device Breakpoints
Always test UI across:
- **Mobile (375px):** iPhone / Android viewport (Drawer navigation, 2x2 footer, 2x2 Budget Bazaar).
- **Tablet (768px):** iPad / portrait view (Collapsible menu, 2-column showcase).
- **Desktop (1440px):** Large monitor (Full top navigation, 4-column showcase, 4x1 Budget Bazaar, expanded hero banner).

---

## 4. Manual QA Verification Checklist
- [ ] User can add up to 4 items to Try Bag.
- [ ] Attempting to add a 5th item displays clear limit alert.
- [ ] Customer can log in with phone verification.
- [ ] Direct page refresh maintains session without crash.
- [ ] Drawer navigation opens smoothly, shows correct bag badge, and dismisses on item click.
- [ ] Footer renders balanced 2x2 grid on mobile screens.
- [ ] Rider portal accepts delivery OTP and updates trial billing correctly.
