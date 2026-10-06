# Architecture & Technical Design

## 1. System Overview
**Doordrape** is architected as a modern, decoupled full-stack e-commerce platform with a dedicated WhatsApp authentication microservice:
- **Frontend SPA:** React 18, Vite, React Router v6, Redux Toolkit, Material-UI (MUI v5), Slick Carousel. Deployed on **Vercel** (`https://try-and-buy-model.vercel.app/`).
- **Backend API:** Django 4.x / Django REST Framework (DRF), Gunicorn, Python 3.8+. Deployed on **Render** (`https://try-and-buy-model.onrender.com`).
- **WhatsApp OTP Microservice:** Node.js (Express), `@whiskeysockets/baileys` (self-hosted WhatsApp Web socket engine), multi-file auth persistence (`auth_info_baileys`). Deployed on **Render** (`https://whatsapp-service-xd5d.onrender.com/`).
- **Database:** PostgreSQL (Production on Render) / SQLite (Local development).
- **CDN & Media Pipeline:** Cloudinary dynamic fetch CDN + local optimized WebP pipeline with responsive multi-resolution fallbacks (480px, 960px, 1600px).
- **SEO & Search Indexing:** Semantic HTML5, Core Web Vitals optimizations, Open Graph/Twitter Cards, and Schema.org JSON-LD structured data (`WebSite`, `Organization`, `Service`, `FAQPage`).

---

## 2. High-Level Data Flow & Service Architecture
```
                         ┌────────────────────────────────┐
                         │   Customer / Rider / Admin     │
                         │   (Browser / Mobile Web SPA)   │
                         └───────────────┬────────────────┘
                                         │
                                         ▼
                         ┌────────────────────────────────┐
                         │      Vercel Edge Network       │
                         │   (React 18 + Vite Storefront) │
                         └───────────────┬────────────────┘
                                         │
                        HTTP / JSON REST │ (CORS + CSRF + Cookie Session)
                                         ▼
                         ┌────────────────────────────────┐
                         │      Render Web Service        │
                         │   (Django 4.x + DRF REST API)  │
                         └───────┬───────────────┬────────┘
                                 │               │
            Internal HTTP Webhook│               │ SQL Connection
     POST /send-otp, /status     ▼               ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     WhatsApp Microservice (Render)   │  │   PostgreSQL Database (Render)    │
│  - Express.js + Baileys Engine       │  │   - Customers, Addresses, Riders  │
│  - MultiFileAuthState (Persistent)   │  │   - Catalog (Categories, Products)│
│  - QR Pairing & Auto-Reconnect       │  │   - Orders, Trial Sessions, Bills │
└──────────────────┬───────────────────┘  │   - Dynamic Coupons & Redemptions │
                   │                      │   - Support Tickets & Analytics   │
   WhatsApp Sockets│ (Direct to Mobile)   └───────────────────────────────────┘
                   ▼
       ┌────────────────────────┐
       │ Customer WhatsApp App  │
       │ (Instant 6-Digit OTP)  │
       └────────────────────────┘
```

---

## 3. Directory Structure
```
sumit/
├── docs/                                # Project documentation, architecture & strategy
│   ├── ARCHITECTURE.md                  # System architecture, data flow & microservices (this file)
│   ├── PRD.md                           # Product Requirements Document
│   ├── DESIGN.md                        # Storefront design system & tokens
│   ├── RULES.md                         # Engineering rules & constraints
│   ├── TASKS.md                         # Milestone tracking & roadmap
│   ├── SECURITY.md                      # Security architecture & authentication policies
│   ├── TEST_PLAN.md                     # Backend & Frontend testing procedures
│   ├── SEO_STRATEGY_AND_CHECKLIST.md    # Target keywords, meta tags & on-page checklist
│   ├── LAUNCH_ROADMAP_AND_COPY.md       # High-converting hero copy & 0-budget growth roadmap
│   └── VIRAL_REEL_SCRIPTS.md            # 5 production-ready Instagram launch reel scripts
│
├── whatsapp_service/                    # Self-hosted WhatsApp OTP microservice (Baileys)
│   ├── auth_info_baileys/               # Multi-device session credentials (git-ignored)
│   ├── whatsapp.service.js              # Express server, Baileys socket lifecycle & endpoints
│   ├── package.json                     # Baileys & Express dependencies
│   ├── render.yaml                      # Render deployment specification
│   ├── .env                             # Environment configuration (API keys, ports)
│   └── .env.example                     # Environment template
│
├── sevenshadesfrontend/                 # React 18 Single Page Application (Vite toolchain)
│   ├── index.html                       # Entry HTML with SEO meta tags & Schema.org JSON-LD
│   ├── vite.config.mjs                  # Vite configuration & dev server proxies
│   ├── public/                          # Static assets, sitemap.xml, robots.txt, icons
│   └── src/
│       ├── administrator/               # Admin portal (Catalog workspace, coupons, analytics)
│       ├── diliveryinterface/           # Rider Partner portal (Trial Orders, OTP verification)
│       ├── services/                    # API services, WhatsApp auth client, image helpers
│       ├── storage/                     # Redux Toolkit root store & local storage persistence
│       └── userinterface/               # Customer storefront
│           ├── components/              # Header, HowItWorks, FAQ, BudgetBazaar, Showcase, Footer
│           └── screens/                 # Home, ProductPage, Details, Bag, CustomerAuth, Profile
│
└── sevenshades/                         # Django Backend & REST API
    ├── sevenshades/                     # Django project settings, wsgi, urls, middleware
    ├── sevenshadesapp/                  # Core application
    │   ├── models.py                    # Schema (SignUp, Products, Orders, Coupons, Delivery)
    │   ├── whatsapp_auth_views.py       # WhatsApp OTP generation, validation & auth sessions
    │   ├── coupon_views.py              # Dynamic coupon rules engine & discount calculations
    │   ├── views.py / user_views.py     # Catalog, checkout, cart & order management endpoints
    │   └── test_whatsapp_auth.py        # Automated test suite for WhatsApp auth & validations
    └── manage.py                        # Django CLI
```

---

## 4. Key Architectural Patterns & Modules

### A. Zero-Cost Self-Hosted WhatsApp OTP Authentication
- Replaces expensive SMS gateways and third-party Firebase Phone Auth.
- Communicates directly with the `whatsapp_service` microservice over authenticated HTTP (`x-api-key`).
- **Strict User Validation:**
  - `purpose='login'` / `'reset'`: Validates user exists in database (`SignUp.objects.filter(mobileno=phone).exists()`) before dispatching any message. Returns `404` with inline field error if unregistered.
  - `purpose='signup'`: Rejects already registered numbers (`409 Conflict`).
- **Session Continuity:** Employs Baileys `useMultiFileAuthState` to persist session keys across restarts.

### B. Dynamic Coupon & Discount Rules Engine
- **Granular Scopes:** Apply discount storewide (cart-level), to specific categories, subcategories, or individual products.
- **Value Limits:** Supports percentage discounts (`%`) with maximum caps (e.g. 20% up to ₹500) and flat discounts (`₹`).
- **Guardrails:** Enforces minimum order value, valid date ranges, total usage limits, and per-user redemption tracking.

### C. Vertical Slice Try & Buy Flow
- **Customer:** Selects up to 4 items/sizes → Checks out with ₹0 advance.
- **Backend:** Creates `Orders` and `DeliveryTask` records, reservations, and dispatch notices.
- **Rider Portal:** Rider accepts task, travels to destination (30–45 mins), starts 15-minute trial countdown.
- **Settlement:** Customer keeps desired sizes; rider marks kept items and accepts cash/UPI payment on the spot.

### D. Resilient Media Loading Pipeline
- Multi-tier asset resolution via `imageUrl.js`:
  1. Cloudinary dynamic transformation (`f_auto,q_auto,w_xxx`).
  2. Local WebP variant.
  3. Static Django media asset.
  4. Vector SVG placeholder fallback.

### E. Session, CSRF & Security Governance
- Session verification handled via Django signed sessions and cookies (`/api/auth_session`).
- Strict CSRF validation (`HTTP_X_CSRFTOKEN`) enforced on state-modifying requests (`POST`, `PUT`, `DELETE`).
- Zero plaintext passwords; administrative users hashed with PBKDF2. Zero API secrets checked into git.
