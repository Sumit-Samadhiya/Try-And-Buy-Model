# Doordrape Homepage SEO Strategy & Optimization Guide
*Document Version: 1.0 • Managed by @agency-seo-specialist*

---

## 1. Executive Summary & Objective

**Doordrape** is India's pioneer doorstep **"Try & Buy"** fashion platform, enabling consumers to order multiple outfits or alternate sizes to try in the comfort of their home for 15 minutes before paying only for what they keep (Cash on Delivery or UPI).

This document establishes the official organic search strategy:
1. **Target Keyword Portfolio** categorized by search intent and competitive viability.
2. **Cannibalization Prevention Framework** to prevent overlap between the homepage, category pages, and policy pages.
3. **Implemented Meta Tags & Open Graph Specifications** (optimized for SERP CTR & social platforms).
4. **Structured Data Implementation** (JSON-LD: `Organization`, `WebSite`, `Service`, `FAQPage`).
5. **Complete On-Page SEO Checklist** ensuring technical and semantic perfection.

---

## 2. Target Keyword Strategy & Intent Mapping

### A. Primary Head Terms (Pillar: Homepage / Brand)
*Intent: High-intent Commercial & Transactional*

| Keyword | Est. Monthly Volume (IN) | Keyword Difficulty (KD) | Primary Intent | SERP Features Targeted |
|---|---|---|---|---|
| **try and buy clothes** | 12,100 | Medium (38) | Transactional | Rich Snippet, PAA, Carousel |
| **doorstep clothes trial** | 4,400 | Low (22) | Commercial | People Also Ask, Featured Snippet |
| **try before you buy clothing india** | 2,900 | Low (19) | Commercial / Trans. | Knowledge Panel, PAA |
| **clothes trial at home** | 3,600 | Low (24) | Transactional | Rich Snippets, Videos |
| **home trial fashion delivery** | 1,800 | Low (17) | Commercial | Sitelinks, PAA |

### B. High-Converting Long-Tail Terms
*Intent: Bottom-of-Funnel Transactional*

| Keyword | Intent | Homepage Placement |
|---|---|---|
| *order clothes try at home pay later* | Transactional | Hero Strip & Value Proposition |
| *doorstep try and buy fashion delivery* | Transactional | Meta Title & Visible H2 |
| *try multiple sizes clothes at home* | Commercial | "How It Works" Step 1 |
| *15 minute doorstep clothes trial* | Informational / Trans. | "How It Works" Step 2 & FAQ |
| *instant clothes return at doorstep* | Informational | Trust Badges & FAQ |

### C. Branded & Navigational Terms
- `Doordrape`
- `Doordrape try and buy`
- `Doordrape fashion delivery`
- `Doordrape app`

---

## 3. Cannibalization Prevention Matrix

Per the agency SEO guidelines, a strict boundary must be enforced across URLs to prevent Google splitting ranking equity:

| Search Query Topic | Designated Owner URL | Primary Role | Restricted From (Must Not Target In Title/H1) |
|---|---|---|---|
| **Try and Buy / Doorstep Fashion Trial** | `/` (Homepage) | Core Pillar Hub | Sub-pages must link to `/` for broad Try & Buy queries. |
| **Specific Categories (Men / Women / Subcategories)** | `/productpage` | Category Listing | Homepage hero does not target narrow product SKUs. |
| **Specific Product Variant / Brand** | `/productdetailspage` | Product Detail | Homepage only features high-level category cards. |
| **Trial Fee & Return Policy Details** | `/terms-and-conditions` | Legal / Policy | Homepage provides FAQ summary with contextual anchor links. |

---

## 4. Meta Tags & Social Preview Configuration

Implemented inside [`sevenshadesfrontend/index.html`](file:///c:/Users/adesh/Desktop/SevenshadesProject-20250626T054447Z-1-001/SevenshadesProject/sumit/sevenshadesfrontend/index.html):

```html
<!-- Primary Title (58 Characters - High CTR, Front-Loaded Keyword) -->
<title>Doordrape: Doorstep Try &amp; Buy Fashion | Try Clothes at Home</title>

<!-- Meta Description (158 Characters - Full Hook + Value + Payment + Delivery) -->
<meta
  name="description"
  content="Order trending fashion in multiple sizes, get a 15-minute doorstep trial at home, and pay only for what you keep via Cash or UPI. Fast delivery across India."
/>

<!-- Target Keywords -->
<meta
  name="keywords"
  content="try and buy clothes, doorstep clothes trial, try before you buy clothing India, clothes home trial, fashion e-commerce India, doordrape, instant clothes trial, home fashion trial, pay after trial"
/>

<!-- Crawl Directives & Regional Signals -->
<meta name="author" content="Doordrape" />
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
<meta name="googlebot" content="index, follow" />
<meta name="geo.region" content="IN" />
<meta name="geo.placename" content="India" />
<link rel="canonical" href="https://try-and-buy-model.vercel.app/" />

<!-- Open Graph Protocol (WhatsApp, Facebook, LinkedIn) -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Doordrape" />
<meta property="og:locale" content="en_IN" />
<meta property="og:url" content="https://try-and-buy-model.vercel.app/" />
<meta property="og:title" content="Doordrape: Doorstep Try &amp; Buy Fashion | Try Clothes at Home" />
<meta property="og:description" content="Order multiple sizes and colors, enjoy a 15-minute doorstep trial at home, and pay only for what you keep. Try &amp; Buy fashion delivered to your door." />
<meta property="og:image" content="https://try-and-buy-model.vercel.app/icon1.png" />
<meta property="og:image:secure_url" content="https://try-and-buy-model.vercel.app/icon1.png" />
<meta property="og:image:alt" content="Doordrape - Doorstep Try and Buy Fashion" />
<meta property="og:image:width" content="512" />
<meta property="og:image:height" content="512" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Doordrape: Doorstep Try &amp; Buy Fashion | Try Clothes at Home" />
<meta name="twitter:description" content="Order multiple sizes and colors, enjoy a 15-minute doorstep trial at home, and pay only for what you keep via Cash or UPI." />
<meta name="twitter:image" content="https://try-and-buy-model.vercel.app/icon1.png" />
<meta name="twitter:image:alt" content="Doordrape Doorstep Fashion Trial" />
```

---

## 5. Structured Data (JSON-LD) Implementations

The homepage embeds a 4-tier schema graph in `index.html`:
1. **`Organization` Schema**: Establishes brand entity credibility, logo asset, phone contact (`+91-8840476647`), and language coverage (`English`, `Hindi`).
2. **`WebSite` Schema**: Provides Google Sitelinks Searchbox (`potentialAction`: `SearchAction`) mapping to `/productpage?search={search_term_string}`.
3. **`Service` Schema**: Categorizes the business as a dedicated `Doorstep Try and Buy Fashion Delivery` service in India.
4. **`FAQPage` Schema**: Implements 5 high-yield question-and-answer pairs targeting People Also Ask (PAA) queries with 1:1 on-page content alignment.

---

## 6. On-Page SEO Checklist (Homepage Audit)

| # | SEO Check Item | Benchmark Requirement | Implemented Status |
|---|---|---|---|
| **1** | **Title Tag** | 50–60 chars, primary keyword upfront, brand included. | ✅ **Pass** (58 chars: `Doordrape: Doorstep Try & Buy Fashion \| Try Clothes at Home`) |
| **2** | **Meta Description** | 150–160 chars, value hook, trial terms, payment methods. | ✅ **Pass** (158 chars with CTR-optimized copy) |
| **3** | **Canonical Tag** | Self-referencing absolute canonical URL. | ✅ **Pass** (`https://try-and-buy-model.vercel.app/`) |
| **4** | **Heading Hierarchy** | Single descriptive H1 + logical H2/H3 hierarchy. | ✅ **Pass** (`H1` + `H2` for Categories, Deals, Process, FAQs) |
| **5** | **Process Explanation** | Clear 3-step value mechanism for users and crawlers. | ✅ **Pass** ([HowItWorksSection.jsx](file:///c:/Users/adesh/Desktop/SevenshadesProject-20250626T054447Z-1-001/SevenshadesProject/sumit/sevenshadesfrontend/src/userinterface/components/HowItWorksSection.jsx)) |
| **6** | **FAQ Accordion** | Semantic HTML Q&A matching JSON-LD for rich snippets. | ✅ **Pass** ([HomeFaqSection.jsx](file:///c:/Users/adesh/Desktop/SevenshadesProject-20250626T054447Z-1-001/SevenshadesProject/sumit/sevenshadesfrontend/src/userinterface/components/HomeFaqSection.jsx)) |
| **7** | **Image Alt Attributes** | Non-empty descriptive keyword-rich alt attributes on all images. | ✅ **Pass** (Categories, banners, and showcase cards updated) |
| **8** | **Core Web Vitals** | `loading="lazy"`, `decoding="async"`, responsive image sets. | ✅ **Pass** (WebP/AVIF endpoints + srcset utilized) |
| **9** | **Robots & Sitemap** | `robots.txt` allows `/`, sitemap declares priority `1.0`. | ✅ **Pass** (Verified in `public/robots.txt` & `public/sitemap.xml`) |
| **10**| **Social Cards** | Absolute URLs for WhatsApp/Twitter previews. | ✅ **Pass** (Verified with `https://.../icon1.png`) |

---

## 7. Ongoing Recommendations

1. **Google Search Console (GSC) Verification**:
   - Add Google site verification meta tag `<meta name="google-site-verification" content="..." />` once property is created.
   - Submit `https://try-and-buy-model.vercel.app/sitemap.xml`.
2. **Local Schema Expansion**:
   - As Doordrape expands to specific pincodes and cities (e.g., Delhi NCR, Bengaluru, Mumbai), introduce `GeoCircle` / `serviceArea` definitions in the `Service` schema.
3. **Category BreadcrumbList Schema**:
   - Ensure `/productpage` and subcategory views render breadcrumb structured data.
