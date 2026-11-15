# DoorDrape SEO implementation and keyword plan

Updated: 2026-10-14. Search Console has no verified property/data available yet.

## Research and query ownership

These are relevant keyword candidates, not measured search volumes or difficulty scores. The previous estimates were unsupported and are removed.

| Owner | Query intent | Candidates |
| --- | --- | --- |
| / | Brand and doorstep trial | DoorDrape, Door Drape fashion, DoorDrape try and buy |
| / | Home trial service | try and buy clothes, try clothes at home, doorstep clothes trial, try before you buy clothing |
| /productpage | Browse inventory | DoorDrape clothing collections |
| Future verified category URLs | Specific inventory | men's casual shirts, women's kurtis, oversized t-shirts (only where actual inventory supports them) |
| Future service-area pages | Local trial availability | clothes trial at home + confirmed service city |

Do not target "pay later" (can imply credit), claim nationwide availability, or create city pages before checking actual service areas. Homepage /home is an alias with canonical /. Login, cart and account URLs are excluded from sitemap. Collection filters should not compete with the general catalog. Product-specific indexing needs validated product metadata and a generated inventory sitemap before launch of that phase.

## Completed local changes

- One canonical homepage, rendered directly at / without a client redirect.
- Clean sitemap: homepage, catalog and two policy pages; removed fabricated last-modified dates.
- Route-specific titles, descriptions, canonical URLs and social metadata for public landing pages.
- Noindex for account, checkout, internal and unknown pages, with server headers for known private routes.
- Robots permits crawling so Google can see noindex directives; this does not replace authentication.
- Removed unsupported meta keywords, nationwide delivery and premier-brand claims from metadata.
- Retained Organization and WebSite schema; removed unsupported search action and FAQ-rich-result expectations.

## Remaining release gates

- DNS ownership verification, sitemap submission and homepage URL inspection in Search Console.
- Production deployment and live response verification.
- JavaScript rendering is still required for catalog/body content. Static metadata is not full server rendering.
- Product metadata and crawlable inventory sitemap are a separate remaining improvement.
- Review real GSC impressions/queries after sufficient data arrives; update keyword priorities from evidence.
- Confirm service areas before local SEO. Google Business Profile eligibility and ranking are not automatic.
- Use official social profiles only; add sameAs links after URLs are verified. No outreach or accounts created.

## Sources

- Google technical requirements: https://developers.google.com/search/docs/essentials/technical
- Google structured-data guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- FAQ rich-result limitations: https://developers.google.com/search/blog/2023/08/howto-faq-changes
- Market terminology: https://modaapp.co/ and https://play.google.com/store/apps/details?hl=en-US&id=app.slikk.club

Indexing, position #1 and a 24–48 hour turnaround are not guaranteed. Requesting indexing is a request, not proof of inclusion.

## 2026-11-15 technical follow-up

Pre-GSC ownership review: homepage retains brand/home-trial intent; catalog retains collection browsing; policies retain legal intent. No new competing keyword landing pages were introduced. GSC ownership and performance remain unverified in this session.

- Shared route metadata now generates public HTML heads during production builds, including canonical and social tags. This fixes all routes initially receiving homepage metadata.
- Public sitemap is generated from that same allowlist without invented dates.
- A separate noindex application shell serves private/unknown routes before JavaScript executes. Unknown routes still need genuine HTTP 404 handling; noindex is not an HTTP status fix.
- Product titles now expose actual crawlable links while product indexing remains gated on validated metadata/inventory.
- No visual redesign or unsupported service/payment promises added.
- Static heads are not server-rendered body content. Product schema, inventory sitemap, full rendering and production/GSC verification remain release work.

Measurement plan: after verification, export GSC page + query data, separate branded searches (DoorDrape / Door Drape) from service searches, compare comparable 28-day periods, and inspect indexing before interpreting missing impressions. Do not invent volume/difficulty or assume zero impressions means zero demand.

### Release continuation — 2026-11-15
- User confirmed mixed/demo inventory: product indexing/schema and inventory sitemap intentionally remain disabled. This is a release constraint, not an uncompleted product rollout.
- Public DNS includes a google-site-verification TXT record. Owner access and sitemap submission cannot be inferred from DNS alone; authenticated GSC verification remains necessary.
- Homepage FAQs are shared between the React UI and build-generated HTML, visible to all clients before JavaScript mounts. Catalog/policy HTML includes only a summary and navigation; this is not full React SSR or full policy-body prerendering.
- Removed unsupported delivery-time and payment guarantees from the homepage FAQ/how-it-works copy. Checkout determines fees, payment options and availability.
- Run `node scripts/verify-seo.mjs` after production build to verify the generated documents and intentional product exclusion.
