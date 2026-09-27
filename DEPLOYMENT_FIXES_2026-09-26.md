# Reliability fixes and rollout

The code now provides catalog loading/retry feedback, shareable collection filters, a populated default catalog, parallel homepage product requests, lazy-loaded routes, semantic footer links/buttons, dynamic header category IDs, India-time slot validation, and safe overdue stock release.

## Reservation policy

- Standard orders expire one hour after the scheduled slot ends.
- SOS orders expire three hours after creation (two-hour delivery promise plus one-hour grace).
- Only undispatched pending/assigned orders without a final bill, paid fee, or any gateway attempt can be automatically cancelled.
- Release is transactional and idempotent; future bookings retain their stock.
- Legacy orders with known schedules use the same deadline; unknown schedules need manual review.
- The existing `python manage.py expire_trial_reservations` command handles this policy. Run it every five minutes in the backend hosting scheduler. Checkout and customer order refresh also perform cleanup, but do not replace the scheduled job.

## Production configuration required before rollout

1. Set `DJANGO_DEBUG=0`, a strong `DJANGO_SECRET_KEY`, exact `DJANGO_ALLOWED_HOSTS`, and the production `FRONTEND_ORIGINS`. Debug now defaults off; local `runserver`/`test` opt into development unless explicitly overridden.
2. Confirm `DATABASE_URL` points to the persistent production database and `REDIS_URL` is shared by all processes.
3. Mount persistent storage and set `DJANGO_MEDIA_ROOT` to its directory. Copy the existing `static/` catalog subdirectory into that directory before switching; stored image paths include `static/`. Back up first. The code does not move or delete existing images automatically.
4. Run `python manage.py check --deploy`. Project checks flag missing Redis, SQLite fallback, and media stored inside the app checkout. Review all Django deployment warnings in the context of the host's HTTPS proxy.
5. Confirm all `REACT_APP_FIREBASE_*` build variables and backend Firebase credentials/project match; confirm the deployed domain is allowed in Firebase phone authentication.
6. Install requirements and deploy frontend/backend from the same reviewed revision. Check migration status as part of the normal release workflow.
7. Use dedicated customer/admin/rider test accounts for the complete trial, bill approval, cash settlement and inventory return sequence. This change does not create orders or charge payments in production.

## Test migration

The backend suite contained old Fast2SMS route tests despite those routes already returning HTTP 410 in the current application. Those tests now verify retired routes remain disabled and cannot send SMS/create accounts; bearer-token and signup security tests use mocked Firebase proof at the verification boundary. Firebase revocation, invalid proof, stale proof and reset tests remain covered by the existing Firebase suite. No retired authentication routes were re-enabled.

## Scope of completion

Local code and checks can be verified here. Hosting environment variables, persistent disk/Redis provisioning, scheduler activation, and authenticated live end-to-end verification require access to the hosting/Firebase dashboards and dedicated test accounts. No claim that those external settings were changed should be inferred from these code fixes.

## Verification completed

- Frontend: 17 suites / 46 tests passed.
- Backend: 154 tests passed after updating retired authentication expectations. The final cleanup-query adjustment and legacy deadline scenario were separately verified with 4 passing deadline tests.
- Production build passed after route splitting: main JavaScript about 139.5 kB gzip, down from 483.7 kB. This is the main bundle comparison, not total bytes required by every route.
- Local browser: catalog failure displays a retry action; footer navigation exposes links and policy controls expose buttons; the policy dialog opens successfully.
- Local Python virtual environment was repaired to use the available Python runtime and Firebase Admin imports successfully. Agent sandbox restrictions required dependency installation/testing outside the restricted execution context.
- Existing Node deprecation and stale Browserslist-data warnings are non-fatal; dependency upgrades were not mixed into the feature fixes.
