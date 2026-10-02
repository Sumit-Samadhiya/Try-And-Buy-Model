# Frontend toolchain migration — 2026-10-02

Create React App/react-scripts has been removed, including its webpack development server, Workbox, old SVGR/SVGO, and node-forge dependency paths. Builds use Vite 8.3.2 with the React plugin 6.1.1; tests use Jest/babel-jest/jsdom 30.5.2 and Babel 7. The application stays on React 18.

## Compatibility

- JSX-bearing `.js` files are renamed to `.jsx`; extensionless application imports and all existing test assertions are preserved.
- The HTML entry moves from `public/index.html` to `index.html`. Public assets retain their URLs, and output remains `build/`.
- Vite only imports environment variables prefixed `REACT_APP_`, retaining current API, Firebase and Cloudinary settings. Server-side environment variables are not copied into the browser bundle.
- Vercel configuration explicitly selects Vite, `npm ci`, `npm run build` and `build`; existing SPA rewrites and catalog cache headers remain.
- Jest has explicit DOM, Babel, stylesheet and asset configuration. Accessibility tests now declare `axe-core` directly instead of relying on CRA's transitive dependency.
- MUI styles 5.18.0 supports the existing React 18 application. Material-table stays at the verified 6.3.2 with the application's MUI 5 dependency ranges.
- Removed `legacy-peer-deps`; `strict-peer-deps=true` and CI's `npm ls --all` reject dependency conflicts.
- CI audits **all** dependencies, including development/build/test tools. No security exclusions or severity downgrades were introduced.

## Commands

Use Node 24 (CI); minimum supported Node is 22.12. Run these in `sevenshadesfrontend`:

```sh
npm ci
npm ls --all
npm run test:ci
npm run build
npm audit --audit-level=high
```

`npm start` serves development on port 3000; `npm run preview` serves the production build on port 4173. A localhost preview requires an available API and an allowed backend origin to load catalog/session data.

## Audit interpretation

The first migrated full-tree audit reports 0 Critical, 0 High, 4 Moderate, 0 Low findings. Remaining Moderate paths are React Router and material-table/uuid; these are disclosed and not suppressed. The production build reports a size advisory for the lazily loaded admin bundle; this is a performance advisory, not a compile failure. Production release requires fresh final local checks and GitHub CI on the release revision.

References: https://vite.dev/guide/ and https://jestjs.io/docs/getting-started .

## Verified release

Release revision: `746ac68c2c32fa83b5040f363e39e2bd30aa9a76`.

- Clean `npm ci`: passed. Strict full dependency tree: passed, no invalid or missing required peers.
- All 25 Jest suites / 72 tests passed after the clean install; no assertions removed.
- Production build passed (10.62 seconds locally); the admin chunk size advisory remains.
- Full audit: **0 Critical, 0 High, 4 Moderate, 0 Low**. Raw report: [frontend-security-audit-2026-10-02.json](frontend-security-audit-2026-10-02.json).
- Existing public environment names and exclusion of unprefixed secrets verified with temporary probe values.
- [GitHub CI run 36999958259](https://github.com/Sumit-Samadhiya/Try-And-Buy-Model/actions/runs/36999958259): frontend tests/build/full audit, Python 3.12, Python 3.14, and PostgreSQL workflow all passed before promotion.
- Vercel production deployment `5noMdKtenfXNTcLynuk2RMKq4nz4`: Ready for this revision.
- Render deployment `dep-davp63h42hec73dl71ng`: Deploy succeeded / Live for this revision.
- Production `/home` serves Vite module assets with HTTP 200. Catalog and banners render; customer password login/profile and admin password login/dashboard verified.
- Backend `/health/` and `/ready/` both return HTTP 200 with `status: ok`.
- Rider login and task dashboard verified at 390px mobile width, without horizontal overflow. An initial connection timeout recovered on one retry; this is not evidence of sustained availability. Role checks were performed sequentially because browser sessions are shared between tabs.
- Preview catalog is blocked by the existing exact-origin CORS policy; production catalog works. No wildcard origin was added.
- Existing orders, account data, catalog records and banners were not reset or deleted during this release.

Prior rollback targets: Vercel `yzbx5VdaQFLNk5nkqCsxUbFQWF47`, Render `dep-davll85g1s2s73fqbvl0`, both at `c448af1716707bd6881a9e6bf6be57449e49b733`. The release introduces no database migrations. Full live order placement/payment was not performed as a smoke test.
