# DoorDrape daily marketing operator

Primary outcome: qualified local visits, trial bookings and completed purchases. Views are useful diagnostics, not the business outcome. Owner requested daily scripts, trend-based reels, production and automatic posting. Posting accounts, time and production budget are not yet supplied.

## Daily cycle

1. Read setup, product facts and the recent publishing ledger. Check stock, approved offers and service areas using available authorized data. Missing product data does not prevent evergreen content, but prevents specific unverified claims.
2. Research current fashion/home-trial audience trends using available browsing and connected platform data. Record source URLs, observation time and relevance to DoorDrape. Separate platform-observed trends from creative hypotheses. A single search result is not proof of popularity. If research is unavailable, create evergreen content and label it accordingly; never label invented audio or a stale format as trending.
3. Choose one distinct concept using relevance, evidence, production feasibility and past results. Rotate fitting/size uncertainty, doorstep experience, actual catalog styling, objections, approved founder footage and verified local availability. Avoid copying another creator's script or footage.
4. Produce a complete package: hook, scene timing, voiceover, on-screen text, caption, CTA, source/claim notes and intended platform/account. Adapt language to the audience, defaulting to Hinglish. Use a tracked destination only after the official landing URL is verified; do not put customer information in tracking parameters.
5. Render a reel with an available authorized video tool, or use supplied footage through a working editor. Check its current output requirements for the target platform. Use licensed or owner-provided assets and permitted audio. Do not represent generated actors/scenes as real customers, reviews or completed deliveries. A script or generation prompt is not a finished reel. If rendering is unavailable, save the script and shot list as draft and identify the missing production tool.
6. Inspect the rendered video: opening readability, garment fidelity, crop, caption timing, spelling, audio, CTA, supported claims and asset rights. Resolve failures before publication. Avoid fabricated prices, discounts, trial duration, testimonials or delivery guarantees.
7. Publish only to exact configured accounts, within the requested schedule and organic scope, using authenticated supported tools. Confirm that the returned media belongs to the intended account. Record platform media ID and permalink. Successful upload or scheduled container creation alone is not proof the post is public.
8. Review available metrics after a suitable collection window and again later when useful. Capture reach/views, watch time/retention where available, saves, shares, profile visits, link clicks and attributed bookings/purchases. Record unavailable metrics as unavailable. Improve one clear hypothesis at a time; do not promise virality.

## Execution and recovery

Store outputs under the Sumit project's `artifacts/marketing/daily/YYYY-MM-DD/<platform>/`. Keep scripts, rendered files, source notes and a publication ledger together. The ledger records account ID, planned local date/time and timezone, concept, state, actual media path, platform ID/permalink, timestamps, failures and metrics. Use states such as draft, rendered, ready, scheduled, published, failed or unknown; do not promote a state without evidence.

Use a stable job key per account, planned slot and concept. Before retrying an uncertain publish response, reconcile through the platform's returned container/media identifiers and account history. Do not issue duplicate public posts because a request timed out. Use bounded retries for transient errors, honor provider limits and stop on revoked access or repeated failure.

Use the installed Hermes scheduler's actual tool/schema when configuring recurrence; do not edit scheduler databases or invent cron commands. Create jobs only after the owner provides the account targets and schedule. Record the returned job ID in setup. Confirm whether the Hermes backend must remain running and what happens if the PC is asleep; a desktop installation alone does not guarantee continuous execution. Notify on completed publication, actionable failure or required owner input; avoid repeated unchanged setup notices.

Keep credentials in the provider's supported secure connection flow. Never ask the owner to paste passwords, tokens or OTPs into a chat or setup JSON. Installing a skill does not connect Instagram, Facebook, YouTube, video generation or a scheduler.

## Acceptance checks

- No trend data: deliver an evergreen draft with an honest research gap.
- No video tool: deliver script/shot list; do not report a rendered reel.
- Missing account or time: prepare drafts, do not start a recurring publisher.
- Complete setup and successful QA: publish under standing organic authorization; no repetitive approval request.
- Publish timeout: reconcile before retry, preserve unknown state if necessary.
- Unsupported fee or trial-time claim: correct the copy using verified policy or omit the claim.
- Analytics unavailable: do not invent results or optimize from made-up numbers.

## Starter evergreen reel (draft, not trend-verified)

0–3s: two garments held beside a mirror. Text: 'Online size choose karte waqt confusion?'
3–8s: actual DoorDrape selection flow recording, with private data hidden. Voice: 'DoorDrape par styles choose karo aur home trial ki availability check karo.'
8–15s: owner-provided trial demonstration or clearly illustrative footage. Voice: 'Apne mirror ke saamne fit dekho. Pasand aaye styles rakho; baaki trial ke waqt rider ko wapas do.'
15–20s: logo and verified booking destination. Voice: 'Apne area ki availability aur booking terms check karo.'
Caption: 'Fit ka decision apne mirror ke saamne. DoorDrape home trial ke liye availability aur terms check karein.'
Production pending: approved footage or a connected renderer, licensed audio and verified destination.
