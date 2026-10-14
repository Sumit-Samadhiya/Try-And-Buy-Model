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
