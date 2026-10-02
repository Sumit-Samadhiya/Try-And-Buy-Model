# Architecture & Technical Design

## 1. System Overview
Doordrape is architected as a decoupled, modern full-stack web application:
- **Frontend SPA:** React 18, React Router v6, Redux Toolkit, Material-UI (MUI v5), Slick Carousel. Deployed on **Vercel**.
- **Backend API:** Django 4.x / Django REST Framework (DRF), Gunicorn, Python 3.8+. Deployed on **Render**.
- **Database:** PostgreSQL (Production on Render) / SQLite (Local development).
- **CDN & Media Asset Optimization:** Cloudinary dynamic fetch CDN + local optimized WebP pipeline with responsive multi-resolution fallbacks (480px, 960px, 1600px).

---

## 2. High-Level Data Flow
```
User (Browser / Mobile)
       │
       ▼
Vercel Edge Network (React 18 SPA)
       │
       │ HTTP / JSON (CORS + CSRF + HttpOnly Session)
       ▼
Render Web Service (Django / Gunicorn REST API)
       │
       ├──► Session Store & PostgreSQL Database
       │      ├── Customer Profiles & Addresses
       │      ├── Catalog (MainCategory, SubCategory, Product, ProductDetails)
       │      ├── Orders & Trial Sessions (Orders, DeliveryTask, OrderItems)
       │      └── Support Tickets & Reviews
       │
       └──► Media Engine / Cloudinary CDN
              └── Pre-optimized WebP catalog assets
```

---

## 3. Directory Structure
```
sumit/
├── docs/                           # Architecture, PRD, Rules, Tasks, Memory
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DESIGN.md
│   ├── RULES.md
│   ├── TASKS.md
│   ├── DECISIONS.md
│   ├── MEMORY.md
│   ├── TEST_PLAN.md
│   └── SECURITY.md
│
├── sevenshadesfrontend/             # React 18 Single Page Application
│   ├── public/                     # Static assets, WebP catalog, manifest, favicon
│   └── src/
│       ├── administrator/          # Admin portal (Catalog, Delivery Ops, Reports)
│       ├── diliveryinterface/      # Rider Partner portal (Trial Orders, Delivery Shell)
│       ├── services/               # API clients, auth session, image optimization, analytics
│       ├── storage/                # Redux RootReducer & local persistence
│       └── userinterface/          # Customer-facing storefront
│           ├── components/         # Header, Drawer, Carousel, BudgetBazaar, Showcase, Footer
│           └── screens/            # Home, ProductPage, Details, Bag, Auth, Profile, Policies
│
└── sevenshades/                    # Django Backend & REST APIs
    ├── sevenshades/                # Django project config, settings, wsgi, urls
    ├── sevenshadesapp/             # Core app models, views, serializers, tests, management
    │   └── management/commands/    # Data repair & storefront validation scripts
    └── manage.py                   # Django CLI
```

---

## 4. Key Architectural Patterns
1. **Vertical Slices:** Features encompass end-to-end integration:
   - Example: Doorstep Trial Flow connects UI Bag (`MyBagDisplay.js`) → Django Checkout (`save_order`) → Rider Dashboard (`DeliveryOrderDetails.js`) → Payment Recovery.
2. **Resilient Media Loading:** 
   - Uses `imageUrl.js` with multi-tier fallback: Cloudinary auto-format → Local WebP variant → Local static media → Placeholder SVG.
3. **Session & Security:**
   - Stateless or signed session verification (`/api/auth_session`).
   - CSRF token handshake (`/api/auth_csrf`) required on all state-changing mutations.
   - Zero hardcoded API keys in client-side bundles.
