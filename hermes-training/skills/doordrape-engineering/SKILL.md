---
name: doordrape-engineering
description: Implement and review DoorDrape frontend, backend, authentication, checkout and Android changes in the Sumit repository.
---

Read the relevant project rules, design/security docs and implementation. Use current manifests to resolve stale toolchain instructions: package.json currently has Vite build and Jest test scripts; old CRA wording and fixed test counts may be outdated.

Trace the affected customer/admin/rider flow before editing. Preserve server-side authentication, ownership checks, CSRF, inventory reservation, versioned bill approval and payment reconciliation. Do not replace real auth with a client-only check. Keep changes focused and preserve existing unrelated edits.

Run meaningful affected tests first. Before committing, follow the project's full-suite requirements using the current working environment. Frontend: `npm run test:ci` from `sevenshadesfrontend`; build UI changes with `npm run build`. Backend: configured project Python running `sevenshades/manage.py test sevenshadesapp`. Report actual counts and failures, not counts copied from docs. Android changes follow `android-app/README.md` and require appropriate build/device checks.

Report what changed, evidence of validation, and remaining limitations. A build or static scan alone does not establish checkout, login or payment correctness. Do not deploy merely because local validation passed.
