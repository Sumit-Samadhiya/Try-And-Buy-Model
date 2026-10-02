# Product Requirements Document (PRD)

## Product
**Doordrape** | *Try & Buy Fashion at Your Doorstep*  
Live URL: `https://try-and-buy-model.vercel.app`

---

## 1. Problem Statement
Online fashion shopping suffers from high return rates (~35-40%), size uncertainty, color discrepancies, and the friction of prepaid returns where customer money remains blocked for days. Customers hesitate to buy premium or multiple sizes online due to refund delays.

---

## 2. Target Users
- **Primary Shoppers:** Urban online fashion buyers (Tier-1 & prime residential hubs) who want to touch, fit, and test styles at home before committing money.
- **Delivery Fleet / Rider Partners:** Hyperlocal delivery agents with mobile app interfaces to manage deliveries, conduct 15-minute doorstep trials, collect UPI/Cash, and instantly retrieve rejected items.
- **Store Administrators & Catalog Managers:** Operations and catalog admins managing inventory, brands, doorstep trial batches, and settlement reconciliations.

---

## 3. Core Value Proposition
- **Try Up to 4 Styles at Home:** Zero upfront payment required.
- **15-Minute Doorstep Trial Window:** Customers try items in privacy while the delivery partner waits.
- **Instant Doorstep Handover:** Keep only what fits and you love; immediately return unselected items to the rider.
- **Flexible Post-Trial Payment:** Pay via Cash on Delivery or live UPI QR code at the doorstep.
- **No Refund Hassles:** Since only kept items are paid for, there are zero return delays or refund tracking headaches.

---

## 4. Core 5-Step Order Flow
1. **Step 1: Trial Order Placement (Customer App):**
   - Customer selects up to 4 items from catalog and books "Try & Buy".
   - Delivery slot selected, upfront trial fee processed (COD only).
   - Order status marked as `TRY_REQUESTED`.
2. **Step 2: Admin Order Dispatch (Admin Dashboard):**
   - New order alert triggers on Admin Dashboard.
   - Admin reviews order and assigns it to nearest active rider.
   - Status updates to `ASSIGNED`.
3. **Step 3: Real-Time Multi-Panel Tracking (WebSockets / Polling):**
   - Rider begins journey: status updates to `OUT_FOR_TRIAL` (`On Route`).
   - Live sync across customer and admin dashboards.
   - Doorstep arrival: status updates to `TRIAL_IN_PROGRESS` and 15-minute countdown starts on Rider app.
4. **Step 4: Doorstep Selection & Digital Billing (Rider App):**
   - Customer keeps preferred items (e.g. 2 items) and returns rest to rider.
   - Rider marks items as "Purchased" (retained) and "Returned" (handed back).
   - Rider taps "Generate Bill":
     - Retained items price calculated.
     - Upfront trial fee deducted/adjusted.
     - System creates dynamic final bill and sends in-app approval request to customer.
5. **Step 5: Customer In-App Approval & Payment (Customer App):**
   - Customer phone receives itemized bill popup (selected items, adjusted fee, final payable).
   - Customer reviews and taps "Approve & Pay" (Cash on Delivery).
   - Rider collects cash and marks order status as `DELIVERED`.
   - Customer app updates to delivered and "Download Tax Invoice" button becomes available.

> **Payment Policy:** Only Cash on Delivery (COD) allowed.
> **Warehouse Inventory:** Completely removed for initial launch. Direct return to inventory on physical handover.

---

## 5. Out of Scope (Future Roadmap)
- International shipping outside India.
- Prepaid escrow wallets.
- Peer-to-peer wardrobe resale.
- Algorithmic 3D virtual try-on / avatar simulation (real physical trial takes priority).

---

## 6. Success Metrics
- **Trial Conversion Rate:** > 65% of doorstep trials result in at least 1 kept item.
- **Doorstep Turnaround Time:** Average trial duration <= 15 minutes.
- **Return Processing Cost:** Zero return courier fees compared to traditional e-commerce models.
- **Customer Satisfaction:** > 4.7/5 rating on doorstep trial experience.
