# Development Rules & AI Rulebook

## 1. General Principles
- **Minimal, Surgical Fixes:** Find the root cause first. Propose and apply the smallest possible fix that solves the problem.
- **Maintain Documentation Integrity:** Keep comments, docstrings, and existing architectural patterns intact unless specifically asked to refactor.
- **No Unrelated Modifications:** Never touch or refactor files unrelated to the active task.
- **Compatibility:** Keep Python code compatible with Python 3.8+ (avoid `str.removeprefix()`, use slice checks). Keep React code compatible with React 18 and standard CRA/Webpack builds.

---

## 2. Before Coding Checklist
1. Read the relevant documentation (`PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `MEMORY.md`).
2. Inspect the existing implementation before making changes.
3. Check existing tests to understand expected behavior and avoid regressions.
4. Formulate a clear, step-by-step implementation plan.

---

## 3. Frontend Rules (React & CSS)
- **Design Tokens:** Always use predefined CSS variables (`var(--font-*)`, `var(--radius-*)`) defined in `index.css`.
- **Accessibility:** 
  - Every page must have a top-level `<h1>`.
  - All interactive buttons must have accessible names (`aria-label` or visible text).
  - Images must have meaningful `alt` attributes or `alt=""` for decorative icons.
- **State Management:** Keep Redux state minimal (`product` for Try Bag, `user` for customer session).

---

## 4. Security Rules
- **Zero Secrets in Git:** Never hardcode API keys, passwords, or secret tokens in frontend files or git commits. Use `.env` with `.env.example`.
- **Server-Side Authorization:** All sensitive endpoints (checkout, orders, delivery operations, admin tools) must authenticate server-side via session cookies or tokens.
- **CSRF Protection:** Always include `X-CSRFToken` from `/api/auth_csrf` on state-changing POST/PUT/DELETE requests.
- **Input Sanitization:** Sanitize and validate mobile numbers, emails, and address inputs before submission.

---

## 5. Testing & Verification Rules
- **Run Tests Before Committing:** 
  - Frontend: `$env:CI="true"; npm test -- --watchAll=false` (All 19 test suites must pass).
  - Backend: `python sevenshades\manage.py test sevenshadesapp` (All 158 tests must pass).
- **Never Assume:** Do not assume code works just because it compiles without syntax errors; run unit and integration tests to verify.
