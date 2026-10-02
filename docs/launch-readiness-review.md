> Superseded status: the reviewed fixes were deployed in release `746ac68`. The historical observations below are retained; use [the post-deployment recheck](launch-recheck-2026-10-02.md) for current performance, accessibility findings and verification limits.

# DoorDrape readiness review — 2026-10-02

Status: needs work. Online payment is out of scope per the user's latest instruction; keep COD.

## Evidence

Code changes remain local and uncommitted. The last production build succeeded. Earlier scoped runs passed 36 delivery/payment/event tests, 45 security tests across two runs, and 20 catalog/image tests. These counts overlap with the broader suite and must not be added into a unique test total.

Accessibility checks were limited to selected form-label and button-name rules, plus component tests. There is no full screen-reader or cross-device certification. The skill's example screenshot script and test-results.json are not present in this repository; no complete browser journey evidence has been produced for the current changes.

## Outstanding findings

1. Fixed locally: Generate Bill no longer sends premature process_return requests. Explicit Good/Damaged collection controls require customer approval; failed collection leaves delivery disabled. Component regression tests cover failure and retry. Full browser journey verification remains outstanding.
2. Fixed locally: warehouse receipt and steam-press actions retired (old authenticated endpoint returns 410). Good-condition collection restores stock once; damaged/missing-tag returns stay unavailable. Legacy pending records remain unchanged and need stock reconciliation before sale. Historical audit fields are retained; no data migration or deletion performed.
3. Fixed locally: promotional copy and footer now describe COD; Browse Curated Styles opens the catalog. UI review found rider mobile overflow and misleading Completed Today count; local fixes need authenticated post-change visual verification. See ui-finish-gate.md.
4. Live deployment, complete customer/admin/rider browser journeys, mobile visual checks, and live speed measurements remain unverified.

## Recommended remaining skill sequence

1. agency-api-tester — role permissions, API contracts, approval/returns transitions.
2. agency-test-automation-engineer — complete customer/admin/rider COD journey and failure recovery.
3. agency-ui-finish-gate-reviewer — mobile and desktop visual checks after workflow fixes.
4. agency-devops-automator — deployment settings, build/release and rollback readiness.
5. agency-sre-site-reliability-engineer — health checks, logs, backend wake-up and failure recovery.
6. agency-reality-checker — repeat final verification after fixes and deployment.

Revisit agency-accessibility-auditor for keyboard/screen-reader tests and agency-performance-benchmarker for measured live-page performance. Optional later: agency-database-optimizer, agency-seo-specialist and agency-analytics-reporter. Not every installed skill is relevant to this project.
