# Design System & UI Guidelines

## 1. Design Philosophy
- **Aesthetic:** Modern, Slate / Neutral eCommerce with high contrast, crisp typography, and subtle micro-interactions.
- **Tone:** Professional, trustworthy, friction-free fashion shopping.
- **Mobile-First Responsiveness:** All components must look ultra-clean on 375px (mobile), 768px (tablet), and 1440px (desktop).

---

## 2. Standard Design Tokens (`index.css`)

### Typography Scale (Strict 8-Step System)
```css
:root {
  --font-xs: 12px;     /* Eyebrows, badges, secondary notes */
  --font-sm: 14px;     /* Body copy, button labels, form inputs */
  --font-base: 16px;   /* Standard reading text, product titles */
  --font-md: 18px;     /* Small section headings, subheaders */
  --font-lg: 20px;     /* Card titles, drawer headers */
  --font-xl: 24px;     /* Section titles (Budget Bazaar, Showcase) */
  --font-2xl: 30px;    /* Hero sub-headlines */
  --font-3xl: 36px;    /* Primary Hero headlines & Value headers */
}
```

### Corner Radii Scale (Consolidated 5-Token System)
```css
:root {
  --radius-sm: 6px;    /* Chips, small tags, sub-badges */
  --radius-md: 10px;   /* Buttons, form inputs, product cards */
  --radius-lg: 16px;   /* Section cards, showcase wrappers */
  --radius-xl: 20px;   /* Value banners, promo dialogs */
  --radius-full: 9999px; /* Status pills, circular action buttons */
}
```

### Color Palette
- **Primary / Dark Slate:** `#0f172a` (Headings, primary CTA backgrounds, footer)
- **Secondary Slate:** `#1e293b` (Hover states, dark container gradients)
- **Muted Text / Borders:** `#64748b` (Subtext), `#94a3b8` (Muted labels), `#e2e8f0` (Borders)
- **Backgrounds:** `#ffffff` (Card background), `#f8fafc` (Page background), `#f1f5f9` (Image placeholders)
- **Brand Accent Blue:** `#2563eb` (Value tags, active indicators, badges)
- **Success Green:** `#10b981` / `#34d399` (Rider indicators, free trial badges, kept items)
- **Warning Amber:** `#f59e0b` / `#d97706` (Budget Bazaar tier tags, trial countdown timers)

---

## 3. Standard Button Hierarchy
1. **Primary Action (`.btn-cta-primary`):**
   - Background `#0f172a`, Text `#ffffff`, Radius `10px`, Font `14px 700`, Padding `12px 20px`.
2. **Contrast White Action (`.btn-cta-white`):**
   - Background `#ffffff`, Text `#0f172a`, Radius `10px`, Font `14px 700`, Padding `12px 28px` (used inside dark gradient banners).
3. **View-All Action (`.csc-view-all-btn`):**
   - Inline flex text CTA with trailing arrow `→`, Radius `10px`, Font `14px 700`.
4. **Navigation Arrows (`.category-arrow`):**
   - Circular 38px button, Shadow `0 2px 8px rgba(15, 23, 42, 0.12)`, hover lift.

---

## 4. Mobile UX Rules
- Avoid long single-column vertical stacking: use balanced 2x2 grids (e.g. Footer and Budget Bazaar on mobile).
- Touch target minimum: `40px x 40px` for all interactive elements.
- Never use all-caps for labels longer than 12 characters; use clean Title Case.
- Always include loading, error, and empty states for every dynamic catalog list.
