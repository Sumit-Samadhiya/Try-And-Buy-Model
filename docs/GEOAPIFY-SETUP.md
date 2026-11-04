# Optional Geoapify address assistance

Set GEOAPIFY_API_KEY only in the backend Render environment. Do not put it in frontend variables or commit the value. No database migration is required.

POST /api/geocoding supports mode=autocomplete with text (3-180 characters), or mode=reverse with numeric latitude/longitude. Searches are restricted to India. Existing API authentication/CSRF and request limits apply; no account or order details are sent to Geoapify.

Provider calls have a 3-second timeout. Successful results are cached for 5 minutes with hashed keys. HTTP 401/402/403/429 opens a 5-minute cooldown; other provider errors use 30 seconds. The frontend stops waiting after 5 seconds and applies a 30-second cooldown. These timers do not guarantee backend wake-up time.

Missing/invalid key, exhausted quota and provider outages return a recoverable unavailable result. Manual address entry and saved-address flows do not depend on this endpoint. Maps use the existing OSM tiles independently; if tiles fail, use manual entry. GPS never falls back to IP; device accuracy over 100m is rejected and customer pin confirmation is required. Geoapify suggestions are not proof of an exact address. Flat, floor and landmark remain user-supplied.

Use shared Redis caching for consistent multi-worker cooldown/request limits. Provider quota remains the final limit; local-memory cache does not enforce a fleet-wide budget. Existing cache infrastructure is not changed by this feature.

Verification: provider mocked tests cover invalid key/quota, timeout, missing key, caching, and invalid coordinates. Frontend tests cover location detection/address fallback and pin confirmation. A real-key smoke test and production verification are still required before claiming the provider is active.
