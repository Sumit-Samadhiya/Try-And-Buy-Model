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
