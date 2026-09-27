# Performance work and verification — 27 September 2026

## Implemented

- Generated deduplicated, versioned WebP catalog assets in 480/960/1600 sizes. Current manifest: 216 source names, 390 unique files, 9,999,690 bytes total across all sizes. This is an asset-library size, not initial page transfer size.
- Hero WebP source files verified: men 37,382 bytes; women 60,318 bytes. The storefront uses responsive generated derivatives, so delivered sizes differ from these source sizes.
- Heavy source-photo compression verified in the current checkout: entire static directory 47,540,293 bytes (about 45.3 MiB). Original hero PNGs remain available but storefront URLs map to optimized versions.
- Cloudinary fetch delivery configured for cloud `t9rzdhin`. Allowed source domains restricted to this project's Vercel and Render origins. Public cloud name configured in Vercel Production; no API secret shipped to browsers.
- Hero and product-card responsive URLs use Cloudinary auto format/quality. Catalog files are hosted on Vercel as the origin and fallback. This is CDN fetch integration, not permanent migration of future admin uploads into Cloudinary storage.
- Versioned catalog files have one-year immutable browser caching. Backend public media has a one-hour cache policy.
- Public catalog reads use a 60-second memory cache and share concurrent identical requests. Failed reads are not cached; checkout/payment writes are not cached or retried by this mechanism.
- Homepage requests six base products per category. SQL LIMIT verified by test; ordering is stable by primary key. Color listings can yield more than six response rows. Full catalog pages do not pass the homepage limit.
- Lazy loading and asynchronous decoding verified in SubcategoryComponent, BudgetBazaarComponent, MainCategoryComponent, BrandsComponent, MyBag, DrawerComponent, and product detail thumbnails/swatches. First main detail image and first hero are eager.
- Upload optimization connected to banner, product, and variant upload paths. Fixed loss of format after EXIF orientation and JPEG bytes being stored under PNG/WebP filenames. PNG transparency is preserved. File sizes vary by image; a fixed 30–150 KB result is not guaranteed.
- Connected compact WebP thumbnails to product-card delivery for uploads not in the static manifest. Thumbnails fit within 400×500, use a bounded process cache, and invalidate when the source file changes. File size is content-dependent.
- Added database-free `/health/` with `Cache-Control: no-store`.
- Cron-job.org job `8522752` enabled every ten minutes. Initially tested the existing category endpoint (200, 3.7 seconds), then switched to the live `/health/` endpoint.
- Fixed deployment seed banner paths to WebP so redeploys do not restore PNG references.

## Validation

- Frontend: 18 suites, 50 tests passed after integrating the user's changes.
- Backend: 16 targeted performance/upload-safety tests passed, including SQL LIMIT, full-catalog behavior, image format/transparency, and thumbnail MIME/dimensions.
- Django system check and process-health test passed.
- All generated image manifest references resolve to files.
- First performance release: live Vercel catalog image returned 200 and the expected immutable cache header; Cloudinary fetch returned 200; rendered homepage hero images were confirmed loaded from Cloudinary.
- Final follow-up deployment verification is recorded below when completed.

## Claims not established by these checks

- Initial total homepage transfer below 500 KB: not measured. JavaScript, CSS, fonts, API responses, and images all count.
- Database response 80% faster: no comparable before/after benchmark; SQL LIMIT alone cannot establish this percentage or rule out a table scan.
- Asynchronous decoding guarantees no freeze: it is a browser hint and cannot guarantee smoothness or prevent all main-thread work.
- Keep-alive eliminates all downtime: missed pings, restarts, free-tier quotas, and deployments can still cause interruptions.

## Maintenance

- Run `scripts/optimize-catalog.py` after changing bundled source images, then deploy the new generated manifest/assets together.
- New admin uploads still use backend storage with optimized originals and on-demand card thumbnails. Durable external upload storage remains a separate infrastructure task.
- Monitor Cloudinary credits and Render shared free-instance hours. No paid plan was purchased.
