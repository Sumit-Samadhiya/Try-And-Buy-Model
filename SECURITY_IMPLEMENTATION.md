# Account security implementation

Customer, custom administrator and rider accounts use Django's database-backed sessions. The browser receives an HttpOnly session cookie; localStorage is display-only and never grants API access. One role is active per browser session. Login rotates the session and CSRF token. Logout revokes the server session; password changes and inactive riders invalidate access, including WebSocket events.

## API permissions

- Public: signup/login, CSRF bootstrap, session inspection, logout, customer catalog and review reads. Unsafe methods require CSRF validation, including login.
- Customer: own addresses, own orders, own trial creation and purchase-linked reviews. Caller-supplied foreign phone numbers are rejected; identity comes from the session.
- Rider: own tasks and assigned-order selection/payment/status and assigned-item operations.
- Administrator: catalog management, operational lists, rider creation/assignment, inventory and analytics.
- Unclassified API routes default to administrator access. Paths match exactly. WebSocket subscriptions also require order ownership and an allowed Origin.

## Password migration

Migration 0023 widens account password columns and hashes existing plaintext values without changing the user's password. New passwords are validated and hashed. Account serializers never return passwords or hashes. The current local database has been migrated. Historical tracked SQL dumps, old commits and external copies are NOT rewritten by this migration; exposed credentials still need rotation before any real deployment.

## Payments

Client-declared online paid flags are rejected. Paid upfront trials are unavailable until a real gateway integration exists; free introductory trials remain eligible. Customers cannot mark final bills paid. An assigned rider or administrator may record a cash collection. This is manual cash recording, not online payment verification. Settled bills cannot be rewritten through either selection endpoint. Final quantities are bounded by trial quantities and duplicate selections are rejected. Unverified legacy fee flags and mutable wallet balances do not grant credit.

## Configuration and remaining scope

- Development generates an ignored local signing secret in sevenshades/.local-secret. Production requires DJANGO_SECRET_KEY and DJANGO_DEBUG=0.
- Configure FRONTEND_ORIGINS, DJANGO_ALLOWED_HOSTS and REACT_APP_API_URL for the deployment. Credentials and CSRF are limited to configured frontend origins.
- Production requires HTTPS and a shared cache for consistent login rate limiting across workers; the default local cache is per-process. This change does not certify production readiness.
- Remaining checkout size/stock problems, fulfillment state transitions, customer bill approval, cash reconciliation/audit trail, hygiene workflow and historical sensitive-file cleanup are separate work. The existing customer-side trial simulation route is disabled.

## Regression checks

Run Django tests with: python manage.py test sevenshadesapp.test_security
Run frontend tests with: npm test -- --watchAll=false --runInBand
