# DoorDrape release and rollback

## Current state

Frontend: React on Vercel. Backend: Django ASGI/Daphne on Render. Application changes remain local; no push, code deployment or production migration was performed. Render configuration was updated on 2026-10-02 as recorded below. The UI finish gate remains HOLD; see ui-finish-gate.md.

## Automated checks

The three previously open-ended backend dependencies (PostgreSQL driver, database URL parser and Firebase Admin) are pinned to the versions verified in the local environment. Transitive dependencies still require CI audit and future lock-file maintenance.

`.github/workflows/ci.yml` runs on pushes, pull requests and manual dispatch. It uses an isolated SQLite database for the full backend suite, an isolated PostgreSQL 16 service for inventory/COD workflow tests, and a separate frontend job for npm ci, tests, production build and dependency audit. It has read-only repository permissions and no production credentials. No deployment is triggered by this workflow.

Make the three jobs required branch checks before enabling automatic production deployment. Existing Vercel/Render Git integrations can deploy independently of this workflow: configure their deployment gates or use manual promotion of the verified commit. A local test pass does not confirm that the new Actions workflow has run. Dependency audit findings should block release until triaged, not be automatically bypassed with force upgrades.

## Release procedure

1. Record the last good frontend deployment and backend deploy/commit IDs. Confirm a recoverable database backup and media backup before any schema change; never export credentials into build logs.
2. Run CI for the exact revision being released. Confirm the PostgreSQL job passes, not only SQLite. Resolve the outstanding UI checks with the same revision.
3. Render root directory: `sevenshades`. Build: `python -m pip install -r requirements.txt`. Start: `daphne -b 0.0.0.0 -p $PORT sevenshades.asgi:application`. Confirm Python 3.12 runtime compatibility.
4. Explicitly set `DJANGO_DEBUG=0` (manage.py otherwise opts into local debug), a strong `DJANGO_SECRET_KEY`, exact `DJANGO_ALLOWED_HOSTS`, durable `DATABASE_URL`, shared `REDIS_URL`, and the production `FRONTEND_ORIGINS`. Never store these values in Git. Keep existing Firebase server credentials and public frontend project settings consistent.
5. Run `python manage.py check --deploy --fail-level WARNING` with real production settings. Resolve warnings about shared Redis, SQLite and media persistence. `DJANGO_MEDIA_ROOT` must refer to durable media storage; changing it requires copying existing `static/` image paths. A frontend Cloudinary URL setting alone does not make backend uploads durable.
6. Review `python manage.py migrate --plan`. Apply `python manage.py migrate --noinput` once via a release/pre-deploy step when supported by the host plan; otherwise use a controlled maintenance release. Do not run migrations on every worker startup. This pass adds no migrations.
7. Use `/ready/` as the Render health check after deploying this endpoint. It executes only SELECT 1 and returns 503 on database failure without exposing details. `/health/` stays a lightweight process check suitable for wake-up pings. Readiness does not validate Redis, migrations, SMS/Firebase, media or the complete order workflow.
8. Vercel root directory: `sevenshadesfrontend`; install `npm ci`, build `npm run build`, output `build`. Set `REACT_APP_API_URL` to the HTTPS backend origin (no `/api` suffix), plus the existing public Firebase settings. Rebuild after changing build-time variables. No server secrets belong in REACT_APP variables.
9. Release the backwards-compatible backend first, then the frontend from the reviewed revision. Verify `/health/`, `/ready/`, catalog images, direct navigation to `/profile`, and customer/admin/rider sign-in. Use dedicated test accounts for an approved COD trial and receipt. Do not alter existing customer orders for smoke tests.

## Monitoring and recovery

- Enable Render health checks and deployment-failure notifications in the dashboard. Set an external monitor to alert on repeated `/ready/` failures; configure recipients explicitly. Those external alerts and cron-job.org settings were not activated in this pass.
- Retain stdout/stderr logs in the host. Local rotating files on ephemeral storage are not a durable audit archive. Monitor sustained 5xx responses, bill/return failures and missing order events.
- A failed readiness check during deployment should prevent the new instance receiving traffic according to Render health-check behavior. Verify this configuration in the dashboard; no custom automatic rollback bot is installed.
- For a frontend regression, restore the recorded good Vercel deployment. For a backend regression, use Render rollback to the recorded good deploy and pause automatic deploys while investigating. Recheck readiness and a test-account workflow.
- Application rollback does not undo database migrations or recover deleted media/data. Keep schema changes backwards-compatible; restore data only through an explicitly planned recovery, considering orders created after the backup. Never automate destructive database rollback from a failed HTTP probe.
- cron-job.org wake-up requests are not an uptime guarantee or a substitute for database readiness monitoring.

## References

- Render deploy stages: https://render.com/docs/deploys
- Render health-check semantics: https://render.com/docs/health-checks
- Render rollback scope: https://render.com/docs/rollbacks
- Vercel static caching: https://vercel.com/docs/caching/cache-control-headers
- GitHub PostgreSQL services: https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers

## Production configuration cleanup completed - 2026-10-02

Verified after saving and reloading Render settings:
- Auto-Deploy changed from On Commit to Off. Future code changes require a deliberate manual deploy until CI is activated and its gate is verified.
- Build command changed to `pip install -r requirements.txt && python manage.py migrate --noinput`. Removed `loaddata initial_data.json`; no fixture import or migration was executed during this settings edit.
- Free service has no available pre-deploy command field. Migrations remain in the build command for compatibility; review release-step separation when the hosting plan supports it.
- Health Check Path changed from blank to `/health/`, which is already live. Keep `/ready/` pending until its implementation is deployed.
- Last successfully deployed revision remained `c448af1716707bd6881a9e6bf6be57449e49b733` after reload.
- Post-change HTTPS checks: backend /health/ 200 (1.14s), frontend /home 200 (0.48s). These are single response samples, not sustained uptime evidence.
- Existing notification preferences unchanged. Local UI/SRE/backend changes and CI workflow have not been published.

Evidence: `.runtime/render-build-cleanup.jpg` and `.runtime/render-health-configured.jpg` (local screenshots, ignored by Git).
