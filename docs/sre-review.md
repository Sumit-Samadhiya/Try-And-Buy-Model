# SRE review - 2026-10-02

## Verified observations

- Single read-only HTTPS probe: frontend /home 200 in 0.44s; backend /health/ 200 in 0.59s (no-store); /ready/ 404 in 0.48s. These are one-machine samples, not page-load times or an uptime SLO.
- cron-job.org job 8522752, "SevenShades backend keep-alive", is enabled against /health/ every 10 minutes (UTC schedule). Visible history from 07:20 to 15:30 UTC contained successful 200 responses, roughly 0.87-1.60s; scheduler jitter was about 31-69s. No duplicate job was created.
- Failure and recovery notifications are unchecked. Notification on automatic disable is checked. No notification preferences were changed.
- Render service is Free. Current health-check path is blank; automatic deploy is On Commit. Root is sevenshades/, start command uses Daphne correctly.
- Render build command is `pip install -r requirements.txt && python manage.py migrate && python manage.py loaddata initial_data.json`. Reapplying fixtures can overwrite existing matching records. Remove the fixture load before the next release. Do not run seeding to repair a live incident.
- Captured logs include catalog POST 403 responses and a /api/product_list request that exceeded ASGI shutdown time. The snippet does not establish the underlying cause or a sustained error rate. Do not disable CSRF or increase timeouts blindly.
- Recent Render logs were absent in the default one-hour window; the four-hour view contains older output. No conclusion that errors are absent is justified.
- Logs identify Python 3.14.3 on Render, while local tests use 3.12.14. CI backend matrix now covers 3.12 and 3.14, but neither GitHub execution nor runtime alignment is confirmed.

## Local recovery fixes

Failed rider refreshes previously became an empty task array, erasing the cache and showing "No tasks". They now reject explicitly; the dashboard shows an error and Retry, retains cached tasks, and hides stale task actions and counters until refreshed. Concurrent refresh calls are coalesced to avoid polling races. A successful empty response still clears tasks correctly.

Removed unconditional "Radar Live" / "Sync Active" wording from the rider shell: those labels were not based on a measured connection state. Existing WebSocket reconnect and 15-second polling remain; neither has been certified under production disruption.

## Release actions still required

1. Remove `loaddata initial_data.json` from Render's build command. Review moving migrations to a controlled release step as described in deployment-runbook.md. Preserve existing production data.
2. Configure /health/ as the current liveness check; switch to /ready/ after that endpoint is deployed and verified. Do not select the currently missing /ready/ path before deployment.
3. Require successful CI before production promotion; On Commit currently bypasses the new local workflow's intended gate.
4. Enable failure/recovery notifications only with the account owner's chosen recipients/channels. Monitoring configuration has not been changed in this pass.
5. Investigate the catalog 403/shutdown warnings with request timing and origin context using a test account. Never reproduce by load-testing production or altering real orders.
6. Verify deployed rider recovery UI and all remaining UI HOLD checks. No deployment or production order mutation occurred during this pass.

## Proposed reliability targets (not measured attainment)

For commercial service, target 99.5% successful valid API responses over a rolling 30 days, including timeouts as failures; monitor catalog, authentication, approval and return operations separately. This is a proposed initial target, not a promise supported by the current free service. A 30-day 99.5% availability budget is 216 minutes.

Record request duration and status without bodies, credentials or phone numbers. Track p95 latency separately for cold starts and ordinary requests. Alert after three consecutive readiness failures and on sustained 5xx/timeouts, then notify once on recovery. Use synthetic test accounts for full workflow checks only after approved test-data arrangements. Monitoring collection, recipients and targets remain to be configured; sparse keep-alive history cannot establish API availability.

## Sources

- Render free-instance behavior: https://render.com/docs/free
- cron-job.org failure/recovery notifications: https://docs.cron-job.org/rest-api.html
- Existing deployment guide: deployment-runbook.md

## Validation

Four focused frontend tests passed across DeliveryHome and deliverySessionStore: initial failure/retry, stale-action hiding/recovery, cache preservation, and successful empty responses. Production build succeeded. Existing outdated Browserslist and Node deprecation notices remain. These do not certify live browser recovery.

## Follow-up production configuration update
On 2026-10-02, fixture loading was removed from the Render build command, /health/ was configured, and Auto-Deploy was set to Off pending verified CI. Settings persisted after reload; frontend/backend remained reachable. See deployment-runbook.md for exact settings. Original observations above describe the pre-change state. Alerts and application deployment remain pending.
