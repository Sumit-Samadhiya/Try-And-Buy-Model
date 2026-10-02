# Release verification — 2026-10-02

Release branch: `codex/cod-reliability-release`. Production promotion is blocked.

## Initial CI evidence

Run https://github.com/Sumit-Samadhiya/Try-And-Buy-Model/actions/runs/36995614464 checked commit `31d57d67115cbe0882221499752e5bcc97d98706`.

- PostgreSQL workflow passed.
- Frontend tests and production build passed; dependency audit failed.
- Both Python 3.12 and 3.14 failed the same filename sanitization test. Linux does not treat backslashes as directory separators. The fix normalizes incoming separators before extracting the basename; the existing Windows-path regression now passes locally (13 upload safety tests).

## Dependency remediation

Compatible lockfile updates reduced the full audit from 74 findings (including 2 critical and 39 high) to 29 (0 critical, 13 high, 7 moderate, 9 low). Axios is 1.20.0 and React Router DOM is 6.30.6. Explicit compatible overrides select grpc-js >=1.13.6 (installed 1.14.5) and underscore >=1.13.8 because parent packages retain affected versions.

Remaining high findings belong to the Create React App build/development tool chain: SVGR/SVGO, nested PostCSS, workbox/serialize-javascript, webpack-dev-server/middleware, and selfsigned/node-forge. Dependency findings include affected parents, so 13 findings do not represent 13 independent vulnerabilities. They are not evidence that all these packages execute in the deployed static browser bundle, but build and development exposure still require review.

The node-forge advisory has no patched version: https://github.com/advisories/GHSA-86w9-cpqp-85rv . Blind `npm audit fix --force` proposes react-scripts 0.0.0 and is not a valid remediation. Do not disable the audit gate or force incompatible overrides merely to obtain a green check.

The remaining release work requires a maintained frontend build/test toolchain migration or separately reviewed, evidence-backed dependency replacements. Preserve existing environment variable handling, SPA routes, public assets, Jest coverage, Vercel output settings and CSS behavior during that work. Then rerun clean install, complete tests/build/audit and authenticated mobile/desktop smoke checks before production promotion.

No production database records were modified by these checks. No main-branch merge or production code deployment is included in this review.
