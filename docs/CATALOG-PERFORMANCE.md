# Catalog loading measurement

Measured on 2026-10-31 from the developer machine, three sequential GET requests per endpoint. These are API transfer times, not browser page-load or LCP scores. No authenticated customer operations were performed.

| Live endpoint | Runs (ms) | Response body bytes |
|---|---|---|
| auth_csrf | 45588, 678, 730 | 97 |
| user_maincategory_list | 3062, 2035, 2019 | 172 |
| user_product_list | 2960, 2465, 2915 | 47902 |

The first session response is consistent with a cold start, but server logs were not inspected to prove its cause. Catalog median: 2915 ms. No Server-Timing header existed in these responses.

## Change

Opt-in GET pagination on user_product_list: page=1&page_size=12. Maximum page size 24. Category, subcategory and brand filters run before pagination. Ordering uses product primary key. All color cards for each selected product are returned together, so 12 products can yield more than 12 cards. One extra product ID determines next_page without a COUNT query. Legacy callers without page retain their existing response.

Main catalog/category/subcategory/brand views fetch one batch and append on Load more. Budget and search retain their existing specialized behavior in this release. Catalog responses include Server-Timing: catalog;dur=... measuring view processing and serialization, excluding earlier middleware/authentication and network overhead.

## After-deployment check

Deploy backend first, then frontend. Repeat three GETs to the same API origin for user_product_list and user_product_list?page=1&page_size=12; compare median latency, body bytes, and Server-Timing. Keep first-request wake-up measurements separate from warm measurements. Verify later pages have no repeated product/color listing IDs. Run again with category/subcategory/brand filters. Do not present local test timings as live improvements.

Live after-deployment measurements are pending; current baseline was captured before deployment.

## Live after deployment (21e88f8)

Paginated first page: 3838, 4002, 3081 ms (median 3838); 22133 bytes; 25 color cards from 12 products. Server-Timing: 1965.2, 1945.7, 1947.1 ms.
Full catalog under the same release: 2690, 2415, 2771 ms (median 2690); 47902 bytes; Server-Timing: 1776.6, 1779.2, 1806.1 ms.
Payload fell 53.8%, but this small three-sample observation does NOT show faster responses. Pagination adds an ID lookahead query; database/network latency and backend serialization require further investigation. No production speedup percentage is claimed. The earlier 45.6-second initial session request remains a separate cold-start concern.
