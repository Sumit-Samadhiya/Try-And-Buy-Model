# Hyperlocal "Try & Buy" Fashion Model

## Executive Pitch & Operational Framework

---

## 1. Executive Summary

Online shopping ka sabse bada barrier hota hai sizing, fabric trust, aur return ka jhanjhat. Dusri taraf offline shopping mein traffic, time waste, aur bheed hoti hai.

Yeh model dono ka perfect solution hai: **Hyperlocal Fashion E-Commerce with Doorstep Trial & SOS Delivery**.

* **Standard Try & Buy:** Customer ghar baithe 4 kapde select karega, delivery boy kapde lekar pahuchega, 15 minute mein trial hoga, jo pasand aaya uska on-the-spot payment hoga, aur baaki kapde rider turant wapas le aayega.


* **Emergency SOS Fashion (Instant Fit):** Achanak shaadi, party ya function ka plan banne par customer ko same day 90-120 minutes ke andar doorstep trial aur delivery provide ki jayegi.



---

## 2. Core Problem & Solution

* **Customer Pain Points:** Sizing issues, 5-7 din ka delivery aur return wait, fabric quality ka fake nikalna, aur achanak kisi event/shaadi ke liye kapde na hona.


* **Our Solution:**
* **15-Minute Home Trial:** Pasand aaye toh lo, nahi toh rider ko wapas thamao. Final purchase ke baad no return / no refund.


* **SOS Fashion Delivery:** Shaam ko party hai aur kapde nahi hain? 2 ghante mein trial room customer ke ghar par.





---

## 3. Order Modes, Pricing & Payment Flow

| Feature | Standard Try & Buy | Emergency SOS Fashion (Same Day / Urgent) |
| --- | --- | --- |
| **Delivery Time** | Same Day (Fixed Route Slots)

 | Within 90-120 Minutes

 |
| **Upfront Fee** | ₹49

 | ₹99

 |
| **Purchase Benefit** | Agar 1 bhi item liya, toh ₹49 final bill se minus (Effectively FREE)

 | Agar 1 bhi item liya, toh ₹99 final bill se minus (Effectively FREE)

 |
| **Zero Purchase Rule** | ₹49 delivery charge ke roop mein deduct honge

 | ₹99 urgent fleet charge ke roop mein deduct honge

 |
| **Introductory Offer** | Eligible

 | Strictly Excluded (No Free First Order)

 |
| **Item Limit** | Max 4 items per order

 | Max 3-4 curated items

 |
| **Post-Purchase Policy** | No Return / No Replacement (Fitting check ke baad purchase)

 | No Return / No Replacement

 |

---

## 4. Operational & Delivery Architecture

* **A. Standard Batched Slots (Route Optimization):** Standard orders ko fixed zones mein dispatch kiya jayega taaki travel time bache:


* **Slot 1 (10:00 AM – 2:00 PM):** North Zone


* **Slot 2 (4:00 PM – 8:00 PM):** South Zone




* **B. Emergency SOS Fleet (Fast-Track Dispatch):** Dedicated priority order jahan order aane ke 15 minute ke andar pack aur dispatch hoga. Urgency ke chalte dedicated rider bina batching ke point-to-point jayega, jiska cost ₹99 upfront fee se securely hedged rahega.


* **C. Fleet & Route Efficiency:** 100% Electric Two-Wheelers (EV) se runs honge, jisse per-kilometer delivery cost negligible rahegi aur quick traffic navigation aasan hoga.


* **D. Address Filtering (Safety & Access):**
* **Eligible Locations:** Independent houses, gated societies, aur private residential apartments.


* **Excluded Locations:** College hostels aur restricted commercial buildings (wahan trial room access aur delivery waiting practically possible nahi hoti; wahan sirf standard prepaid parcel delivery milegi).





---

## 5. Security, Inventory & Hygiene Protocol

* **15-Minute Strict Hard Cap:** Rider ke app par doorstep par pahunchte hi 15 minute ka countdown timer run karega. Customer ko upfront clear guidance di jayegi.


* **Tamper-Proof Barcode Tags:** Har kapde par ek non-removable security tag hoga. Trial ke baad rider tag aur cloth condition check karega, tabhi return accept hoga.


* **Instant Steam-Pressing:** Wapas aane wale pieces shop par aate hi UV-sterilize aur steam-press honge, taaki stock agle order ke liye turant available ho sake.



---

## 6. Financial Viability (Unit Economics)

* **Average Order Value (AOV):** ₹1,200 – ₹2,500 (Festive/Emergency orders mein basket size aur zyada hota hai).


* **Gross Retail Margin:** 40%-50% (~₹600 to ₹1,000 per successful order).


* **Per-Trial Operational Cost:** ₹35-₹45 (EV charging, packaging, steam press).


* **Worst-Case Scenario (Zero Purchase):** Standard par ₹49 aur SOS par ₹99 upfront received hain — business kabhi pocket se burn nahi karega.


* **Best-Case Scenario (Purchase Done):** ₹600+ gross profit mein se operational cost nikalne ke baad bhi ₹500+ net cash profit per delivery banega.



---

## 7. Scaling Roadmap

* **Phase 1 (Pilot City - Months 1-3):** Single city launch, curated fast-fashion & party wear catalog, 2-3 EV delivery boys, standard + emergency trial options.


* **Phase 2 (Catalog Expansion - Months 4-6):** Women's festive wear aur ethnic collections ka complete rollout, automated WhatsApp tracking.


* **Phase 3 (Multi-City Expansion):** Tier-2/Tier-3 cities mein replicate karna jahan quick-commerce fashion ka koi direct competitor nahi hai.



---

## 8. End-to-End Order & Doorstep Settlement Flow

1. **Step 1: Trial Order Placement (Customer App):**
* Customer catalog se 4 items select karke "Try & Buy" order book karega.


* Slot ke anusaar upfront fee process hoti hai aur system par order status `TRY_REQUESTED` mark hota hai.




2. **Step 2: Admin Order Dispatch (Admin Dashboard):**
* Admin dashboard par new order alert trigger hota hai.
* Admin order review karke nearest active delivery partner (rider) ko assign karega; status badal kar `ASSIGNED` ho jayega.


3. **Step 3: Real-Time Multi-Panel Tracking (WebSockets):**
* Rider dispatch hone par status `OUT_FOR_TRIAL` set karega.
* Delivery boy jese-jese status update karega, customer aur admin dono dashboards par live sync hoga.
* Doorstep par pahunchte hi status `TRIAL_IN_PROGRESS` hoga aur rider app par 15-minute countdown timer shuru ho jayega.




4. **Step 4: Doorstep Selection & Digital Billing (Rider App):**
* Customer 4 items me se pasand aaye kapde (e.g., 2 items) rakh lega aur baaki return dega.


* Delivery boy rider app par selected items ko "Purchased" aur unselected ko "Returned" mark karega.
* Rider **"Generate Bill"** par tap karega:
* Retained items ka price calculate hoga.
* Upfront trial fee minus/adjust hogi.


* System dynamic final bill create karke customer app par approval request send karega.




5. **Step 5: Customer In-App Approval & Payment (Customer App):**
* Customer ke phone par itemized bill popup aayega jisme selected items, adjusted fee, aur final payable balance dikhega.
* Customer bill review karke **"Approve & Pay"** karega (via UPI/Online ya Cash/Rider QR).


6. **Step 6: Delivery Confirmation & Tax Invoice (Admin, Rider & Customer Sync):**
* Payment complete hote hi rider order status ko `DELIVERED` mark karega aur return kapde secure tag check karke collect karega.


* Customer app par order success details update ho jayengi aur **"Download Tax Invoice"** button available ho jayega.
* Admin panel par delivered summary update ho jayegi aur returned kapde warehouse inventory me steam-press aur restocking ke liye schedule ho jayenge.