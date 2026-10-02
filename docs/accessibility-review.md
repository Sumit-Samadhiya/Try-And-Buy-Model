> Superseded status: the reviewed fixes were deployed in release `746ac68`. The historical observations below are retained; use [the post-deployment recheck](launch-recheck-2026-10-02.md) for current performance, accessibility findings and verification limits.

# Focused accessibility review

Date: 2026-10-02. Scope: customer header, admin delivery forms, rider menu.

## Fixes

- Customer Sign In and Try Bag: replaced click-only divs with native button elements through MUI ButtonBase; added a visible keyboard focus outline. Addresses keyboard operability and focus visibility (WCAG 2.1.1, 2.4.7).
- Admin delivery forms: connected seven visible dropdown labels using labelId; added a visible delivery-date label. Addresses information relationships and accessible names (1.3.1, 4.1.2).
- Rider mobile menu: added an accessible button name and expanded state (4.1.2).

## Verification and limits

Targeted axe rules: label, select-name, button-name on the admin rider registration form. Programmatic label assertions also cover assignment fields and the delivery-date filter. Related app and delivery-operation tests pass.

This is not a full WCAG audit. Screen-reader behavior, complete keyboard journeys, contrast, zoom, mobile touch targets, dialogs, and all remaining screens have not been verified. WCAG conformance: not determined. Changes are local and not deployed.
