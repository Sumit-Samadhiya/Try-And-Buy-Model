# Project Tasks & Roadmap

## Phase 1: Security & Compliance (Completed)
- [x] Rotate and remove leaked Firebase API keys from repository.
- [x] Configure `.env.example` with strict placeholders for Firebase, Cloudinary, and Django Secret Keys.
- [x] Implement Cookie Consent Banner (`CookieConsent.js`) with persistent user preferences.
- [x] Enforce CSRF protection and HttpOnly session cookies across customer, rider, and admin flows.
- [x] Add Privacy Policy (`/privacy-policy`) and Terms & Conditions (`/terms-and-conditions`).

---

## Phase 2: Performance & Catalog Optimization (Completed)
- [x] Optimize heavy banners (1.8MB) and catalog photos (10MB) to WebP format with multi-resolution breakpoints (480px, 960px, 1600px).
- [x] Implement Cloudinary auto-format fetch CDN for production deployment on Vercel.
- [x] Build resilient multi-tier fallback pipeline in `imageUrl.js`.
- [x] Create automated catalog data repair management command (`repair_storefront_data.py`).
- [x] Rebrand entire storefront, catalog, and legal text from legacy brand to **Doordrape**.

---

## Phase 3: Storefront Usability & Heuristics Fixes (Completed)
- [x] Standardize type scale to strict 8-step token system in `index.css` (Issue 1).
- [x] Consolidate corner radii to 5 standard tokens (Issue 2).
- [x] Unify button hierarchy and eliminate inconsistent button styles (Issue 3).
- [x] Bump small body text to readable 12px+ (Issue 4).
- [x] Remove long all-caps text from hero banner eyebrow (Issue 5).
- [x] Replace long all-caps footer headers with semantic Title Case headings (Issue 6).
- [x] Add top-level `<h1>` heading to Home page for SEO and screen readers (Issue 7).
- [x] Fix subcategory carousel dot density from 9 dots down to 2-3 page dots (Issue 8).
- [x] Resolve repetitive model imagery in Budget Bazaar with keyword fallback mapping (Issue 9).
- [x] Unify primary CTA shapes to standard 10px radius (Issue 10).
- [x] Balance Budget Bazaar grid to 4x1 desktop and 2x2 mobile (Issue 11).
- [x] Replace tiny circular arrow with prominent, accessible "View All →" button (Issue 12).

---

## Phase 4: Navigation & Mobile Polish (Completed)
- [x] Redesign Drawer Navigation (`DrawerComponent.js`, `DrawerComponent.css`):
  - [x] Remove confusing "Your Opinion" placeholder and cartoon icons.
  - [x] Add User Profile / Welcome card with dynamic auth status.
  - [x] Add Try Bag shortcut with live item count badge.
  - [x] Add My Orders & Active Trials shortcut.
  - [x] Add Budget Bazaar value deals shortcut.
  - [x] Add Category collection links (Women & Men) with auto-drawer dismissal.
  - [x] Add Services & Help shortcuts (Trial Policy, Support, Rider Portal).
  - [x] Add secure conditional Logout button.
- [x] Optimize Mobile Footer:
  - [x] Transform long vertical columns into clean, compact 2x2 responsive grid.
  - [x] Reduce padding and spacing by > 50%.
  - [x] Make payment and social icon bar sleek and mobile-proportional.

---

## Phase 5: Next Iterations & Ongoing Enhancements
- [ ] Implement live SMS / WhatsApp delivery status updates for rider arrival.
- [ ] Add real-time rider GPS tracking map for active 15-minute trial countdown.
- [ ] Expand residential society pincode manager for instant address autocompletion.
- [ ] Add customer feedback & doorstep fit review ratings post-trial.
