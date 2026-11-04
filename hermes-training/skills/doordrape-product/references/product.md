# DoorDrape knowledge — inspected 2026-10-31

Project root on this machine: `C:/Users/adesh/Desktop/SevenshadesProject-20250626T054447Z-1-001/SevenshadesProject/sumit`.

Owner update, 2026-11-03: service city is Jhansi, Uttar Pradesh, India. This confirms city-level targeting, not every pincode. Marketing uses AI-generated video, Instagram @doordrapeofficial, drafts first; production provider/budget are pending.

DoorDrape offers clothing selection, home trial, keeping selected garments and handing unselected garments back to a rider. Customer, rider and administrator journeys are separate.

## Implemented checkout evidence

`sevenshades/sevenshadesapp/checkout.py`, `create_trial`:
- 1–4 distinct variants; each quantity must be 1.
- Saved address must belong to the customer and be Residential or Gated Society.
- Pincode must be in configured DeliveryZone data and outside ExcludedArea data. No verified public city list has been established here.
- Modes: `standard` and `emergency_sos`.
- Standard fee: first eligible trial 0, subsequent trial 49 INR; SOS fee 99 INR. Recheck the first-order eligibility expression before quoting an offer.
- Standard slots: 10 AM–2 PM, 2 PM–6 PM, 6 PM–9 PM. Scheduling allows today through three days ahead, subject to slot validation.
- SOS slot text says 90–120 minutes; this is not a verified live service guarantee.
- New order records use `try_payment_mode='cash'`. `settlement.py` describes customer bill approval and rider cash collection; payment-recovery code also exists. Do not advertise UPI availability from an old marketing draft.

## Conflicts requiring care

`Idea-of-project.md` describes 49/99 INR upfront fees and a 15-minute trial. `docs/PRD.md` mixes zero upfront language with fee adjustment and COD-only policy. `docs/LAUNCH_ROADMAP_AND_COPY.md` says 30 minutes; `docs/VIRAL_REEL_SCRIPTS.md` also contains 30–45 minute copy. Do not promise a trial duration until current enforcement and owner-approved policy agree. Free-first-trial is conditional, not universal free service.

Do not reuse claims such as India's first, nationwide service, guaranteed instant delivery, active discount codes, live app-store availability, sterilization guarantees or achieved conversion metrics without evidence. Growth projections are plans, not results. Post-purchase return/refund policy needs owner confirmation; immediate rejection during trial is a different event.

## Source map

- Product intent: `docs/PRD.md`, `Idea-of-project.md`.
- Engineering: `docs/RULES.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/SECURITY.md`, `docs/TEST_PLAN.md`.
- Actual frontend stack: `sevenshadesfrontend/package.json` (React 18, Vite, MUI); backend: `sevenshades/requirements.txt` and Django source.
- Orders/fees/stock: `checkout.py`, `order_views.py`, `settlement.py`, `inventory_workflow.py`, `models.py` under `sevenshades/sevenshadesapp/`.
- Social: `docs/VIRAL_REEL_SCRIPTS.md`, `docs/LAUNCH_ROADMAP_AND_COPY.md`, `docs/SEO_STRATEGY_AND_CHECKLIST.md`, `docs/SHOPKEEPER_PARTNERSHIP_PLAYBOOK.md`.
- Brand assets: `sevenshadesfrontend/public/doordrape-logo.svg`, `doordrape-logo-light.svg`, `doordrape-mark.svg`; `docs/DRAPEY_MASCOT.md` includes third-party license context.
- Local startup: `RUN_PROJECT.md`, `START_PROJECT.bat`, `STOP_PROJECT.bat`, `scripts/start-project.ps1`.
- WhatsApp authentication service: `whatsapp_service/README.md`; OTP infrastructure is not a marketing broadcast system.
- Android: `android-app/README.md` describes a WebView preview; do not claim Play Store release or completed device QA.

The documented Vercel/Render URLs are repository records, not verified live endpoints in this pack.
