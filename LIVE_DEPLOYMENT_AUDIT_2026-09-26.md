# SevenShades Live Deployment Audit — 26 September 2026

## Deployment under test

- Frontend: `https://try-and-buy-model.vercel.app`
- Backend: `https://try-and-buy-model.onrender.com`
- Test origin: `https://try-and-buy-model.vercel.app`

## Completed live checks

| Area | Check | Result |
|---|---|---|
| Frontend | `/home` | 200; page renders after the backend is warm |
| Frontend | `/signindisplay` | 200; password and OTP choices render |
| Frontend | `/adminlogin` | 200; admin form renders |
| Frontend | `/delivery/login` | 200; rider form renders |
| Frontend | `/productpage` | 200; SPA fallback works |
| Backend | `/api/auth_csrf` | 200; secure CSRF cookie returned |
| Backend | CORS from Vercel origin | Allowed with credentials |
| Backend | CORS preflight for JSON POST | 200; content type and CSRF header allowed |
| Catalog | Main categories | 200; Women and Men present |
| Catalog | Subcategories | 200; 9 rows present |
| Catalog | Banners | 200; 2 banners present |
| Catalog | Men products | 200; 33 products present |
| Catalog | Women products | 200; 19 products present |
| Catalog | Invalid category request | 400 with field-level validation message |
| Security | Anonymous admin dashboard | 401 with `Please sign in.` |
| Security | Anonymous rider tasks | 401 with `Please sign in.` |
| Routing | Unknown backend endpoint | 404 JSON response |
| Password login | Controlled invalid credentials | Clean `Invalid credentials` response; no uncaught browser error |
| Media | Sample category, product and banner images | 200 with image content types |
| Customer account | Supplied password login | 200; authenticated session works |
| Admin account | Supplied password login | 200; authenticated session works |
| Rider account | Supplied mobile/password login | 401 `Invalid credentials` |
| Customer data | Saved addresses and order history | 200; 3 addresses and 2 orders returned |
| Admin data | Order lifecycle and rider list | 200 without unsupported query fields |

## Blocking findings

### P1 — Live OTP authentication is unavailable

`POST /api/auth/send-otp/` returns HTTP 503:

```json
{"status": false, "message": "SMS delivery is not configured.", "data": []}
```

The Render deployment does not currently have a usable `FAST2SMS_API_KEY`. OTP login, OTP signup, and OTP-based password recovery cannot complete until the environment variable is configured and the backend redeployed.

### P1 — Authenticated end-to-end workflow needs live test accounts

Customer order placement, admin assignment, rider status transitions, customer selection approval, cash settlement, delivery completion, and cross-panel synchronization require valid temporary live credentials for all three roles. No plaintext live credentials are stored in the repository, and credentials were not guessed or brute-forced.

Required test accounts:

- Customer mobile number and password
- Admin email and password
- Rider ID or mobile number and password

Customer and admin credentials were subsequently supplied and verified. The rider record exists as active rider `RDR-0001` with the supplied mobile number, but the supplied rider password is rejected. The end-to-end workflow is therefore blocked at rider authentication.

The customer already has an active order `TRL-B8A58EAE81CE4A5CB74B` with one item. It is assigned to `RDR-0001` as `On Route`, so a new order cannot be placed until this active workflow reaches a terminal state. The existing order was left unchanged while rider authentication is unresolved.

## Other live findings

### P2 — Render cold start leaves the first storefront load incomplete

On the first visit, only fallback Budget Bazaar content and the footer appeared. After the Render backend was warmed and the page reloaded, banners, categories and product sections loaded. The frontend currently has a 20-second request timeout and does not retry failed public catalog requests, so a slow cold start can produce a misleading partial storefront.

Recommended fix: keep the Render service warm or add a visible loading/error state with a bounded retry for the read-only catalog calls.

### P2 — Some live product cards have blank or repeated-looking media

The full live-page render contains blank placeholders in the Men/Women showcase and repeated-looking product photography. The media endpoints themselves respond successfully, so the remaining issue is catalog image quality/assignment and card presentation rather than a general media-hosting outage.

### P2 — Deployed frontend bundle is behind the current workspace

The deployed bundle still routes Budget Bazaar clicks through the generic subcategory handler, while the current workspace includes the dedicated budget-deal handler and other recent fixes. A fresh frontend deployment is required before the live environment can be certified against the current codebase.

### P2 — Documented admin `limit` query is rejected

The admin order lifecycle view reads a `limit` query parameter, but the request-validation schema does not permit it. `/api/admin_order_lifecycle_list?limit=20` returns 400, while the same endpoint without `limit` returns 200. Add `limit` to the endpoint's allowed fields and validate it as a bounded integer.

## Pending authenticated scenario

The following sequence remains pending until temporary credentials are supplied:

1. Customer password login and session persistence
2. Add 1–4 available variants to the try bag
3. Address/serviceability validation and order placement
4. Admin dashboard/database sync and rider assignment
5. Rider receives the assigned order
6. `Assigned → On Route → Trial In Progress → Trial Completed`
7. Rider submits purchased/returned selection
8. Customer approves the selection and generated bill
9. Cash settlement confirmation without a real payment gateway transaction
10. Rider completes delivery and return collection
11. Customer history, admin metrics, inventory and receipt synchronization

No real Razorpay transaction will be initiated during this test.
