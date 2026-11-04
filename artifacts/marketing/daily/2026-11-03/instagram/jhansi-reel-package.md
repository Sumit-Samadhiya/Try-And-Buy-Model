# DoorDrape — Jhansi reel package (2026-11-03)

Status: marketing draft. Nothing posted, scheduled or logged in. Account target: Instagram @doordrapeofficial (not connected). Audience: Jhansi, Uttar Pradesh. Language: Hinglish.

## Verified product facts used (source: Sumit repo, inspected 2026-10-31 / 2026-11-03)
- Flow: choose styles → doorstep delivery slot → try at home → keep selected, hand rest back to rider (`checkout.py create_trial`, `settlement.py`).
- Order rules: 1–4 distinct variants, quantity 1 each; saved Residential/Gated-Society address; pincode inside configured DeliveryZone and outside ExcludedArea.
- Slots (standard): 10 AM–2 PM, 2 PM–6 PM, 6 PM–9 PM; bookable today to +3 days.
- Fees in code: first eligible trial ₹0, later trials ₹49, SOS ₹99. NOT mentioned in this reel — eligibility is conditional and owner policy is unresolved; avoided per claim-light rule.
- Trial duration: NOT claimed. Repo docs conflict (15/30/45 min); live homepage meta says "15-minute" but no enforcement found. Do not state any duration until owner confirms.
- Payment: new orders use cash mode. UPI NOT claimed (marketing drafts mentioning UPI are unverified).
- Jhansi availability: NOT claimed as fact. Reel uses a viewer-check CTA ("apne area mein check karo") because the public serviceable-pincode list is unverified.
- doordrape.com currently serves the SPA only; API calls fall back to index.html (Vercel rewrite missing). Until fixed, treat the site as a brochure destination; booking flow verification pending.

## Trend research (observed 2026-11-03, via web search; Instagram app itself not browsed)
Sources:
1. Later — Instagram Reels trends, updated weekly: https://later.com/blog/instagram-reels-trends
2. Postdom — Instagram trends week 26 Oct–1 Nov 2026 (audio counts read on IG): https://postdom.com/blog/instagram-trends
3. ETNO — "Me in my hometown vs fashion week" Indian model reels trend: https://etnownews.com/trending-news/me-in-my-hometown-vs-fashion-week-indian-models-instagram-viral-reels-show-how-they-went-from-village-life-to-the-runway-watch-article-156440418
4. Buffer — reels get ~36% more reach than carousels: https://buffer.com/resources/trending-reels-on-instagram
5. Competitor signal: ZILO (@shopzilo, Mumbai home-trial fashion, verified, 81K followers) posts daily reels incl. founder-explainer episodes — PicMany mirror: https://picmany.com/shopzilo ; Sevora luxury home-trial content: https://blog.sevora.com/try-before-you-buy/

Observations relevant to us:
- "Money can't buy happiness but…" (eresdigna original audio, 343K reels as of 30 Oct): one clip + few lines of text, ~7s, low production, built for products/services. Business-account caution: original audios are not royalty-free; add IG's licensed trending version when posting.
- Fashion-specific formats from October: "Fan transition" (outfit swap per fan blade, fashion creators), "Fall outfits" fast-cut week-of-looks with repeated action, "OOTD Stop" walk-and-details, "Ramalama costume walk" reveal-on-beat-drop (101K reels, marked Trending 30 Oct).
- India-local emotional format: hometown-vs-glamour contrast reels ("Me in my hometown versus…"), huge traction with UP/Bihar/small-town audiences.
- Founder-explainer episode series is the proven play for Indian home-trial competitors (ZILO episodes 1–3, 86K–148K plays).
- Gap note: trend counts come from third-party trackers reading Instagram; no direct IG Professional-dashboard access yet. Single results are signals, not proof of local Jhansi popularity.

## Three reel ideas
A. "Pickle jar vs party fit" — money-can't-buy-happiness-style quick gag + outfit payoff. Fast, cheap, timely-ish; weak on explaining the actual service.
B. "Jhansi se runway tak" — hometown-vs-glam contrast using real customer/model footage. High emotion, strong local identity; needs good human footage we don't have yet.
C. "Trial room ka scene khatam" — problem→solution micro-story: online-fit fail → doorstep delivery → mirror check → keep/hand-back. Directly demonstrates the differentiator; works with AI-generated illustrative scenes plus real logo end card; evergreen beyond audio trends.

Chosen: **C**. It sells the exact mechanic (doorstep try & keep/return), matches verified behavior, is producible now with ffmpeg + TTS + AI scene prompts, and rotates the fitting-uncertainty concept from the operator playbook. A and B kept as follow-ups (B once real footage exists).

## Final reel spec (rendered draft: reel_jhansi_v1.mp4, 1080×1920, 26.5s, VO-driven timing)
| Time | Scene | Voiceover (actual rendered track) | On-screen text |
| --- | --- | --- | --- |
| 0–4s | Hook: shopper opens online-order packet, face falls | "Online order kiya, photo dekh ke dil khush. Par ghar pe packet khola, aur fitting ne kiya dhokha?" | Size sahi hoga? 🤔 |
| 4–9.5s | Phone: styles chosen, delivery checked for own area | "DoorDrape le aaye try-before-buy, seedha aapke sheher mein. Styles choose karo, delivery apne area mein check karo." | Ghar par trial · Apne sheher mein |
| 9.5–13.5s | Rider hands bag at doorstep | "Packet seedha aapke darwaze tak." | Doorstep delivery |
| 13.5–18s | Mirror check in own room | "Ab fitting ka decision mall ke trial room mein nahi, apne kamre ke sheeshe ke saamne." | Apne sheeshe mein try |
| 18–21.5s | Keeps one outfit, hands rest back | "Jo pasand aaye, woh rakho. Baaki kapde trial ke waqt rider ko wapas." | Rakho jo pasand aaye |
| 21.5–26.5s | End card: real logo + handle | "Ghar par try karo, phir buy karo. Jhansi walon, doordrape.com pe availability check karo." | @doordrapeofficial · doordrape.com |

Caption (draft):
"Jhansi walon 🙏 ab online kapdon ka fit test mall ke trial room mein nahi — apne kamre mein. Styles choose karo, packet ghar mangwao, sheeshe ke saamne try karo. Jo pasand aaye rakho, baaki rider ko wapas. Apne area mein availability check karo 👉 doordrape.com · @doordrapeofficial #Jhansi #DoorDrape #TryAndBuy #HomeTrial #DoorstepFashion"

CTA: single practical action — check availability at doordrape.com (booking deep-link pending Vercel API fix).

AI disclosure: scenes are AI-generated illustrations, not recorded customers or real deliveries — overlay "Illustrative AI demo" kept small in v1; apply Instagram's AI-generated-media label toggle at publish time.

## Per-scene AI video prompts (for Veo/Kling/Runway when budget approved)
Global style string: "Vertical 9:16 cinematic realism, contemporary ordinary middle-class Indian home in a small city, natural daylight, warm neutral tones with subtle green accents, adult Indian shopper fully clothed, realistic fabric movement, consistent same actor and wardrobe across scenes, no on-screen text, no logos, no watermarks, shallow depth of field, handheld documentary feel."
1. Hook (4s): "Same young Indian woman holds up an online-order parcel beside a bedroom mirror, unfolds a dress against herself, expression falls, uncertain about fit."
2. Selection (5.5s): "Close-over-shoulder of a person browsing a clean clothing catalog on a phone thumb-scrolling size options, tapping a delivery-slot choice; generic UI, no readable brand names."
3. Doorstep (4s): "Delivery rider in plain casual uniform hands a neat garment bag at a modest apartment doorway, receives it, rider stays outside; respectful distance."
4. Mirror (4.5s): "Woman tries two full outfits comparing herself in her own room mirror, relaxed confident, side-by-side cuts."
5. Keep/return (3.5s): "At the doorway she hands folded unused garments back to the waiting rider, keeps one bag, small smile."
6. End card: no AI needed — real logo512.png on brand gradient (already rendered in v1).

## Audio plan
- v1 voiceover: edge-TTS generated (provider 'edge'), free, timings extracted by silence detection. Verify pronunciation before publishing; re-record with a licensed human voice if possible.
- Music bed: none baked in. At publish, pick a current IG-licensed trending audio in-app (low volume under VO) so the reel joins an audio page without commercial-license risk.

## Cost notes before paid generation
- v1 draft cost: ₹0 (ffmpeg + free TTS + real brand assets).
- AI video generators (Veo 3 / Kling / Runway): roughly $0.5–$2 per usable vertical clip after retries; 5 scenes ≈ $5–$25 depending on tier and retakes. Needs owner approval before any spend.

## Blocked / pending
- No Instagram account connected → cannot post, schedule, read IG-native trend lists, or apply the AI-label at publish. Drafts-first per owner choice.
- No authorized AI video renderer connected → v1 is a motion-graphics animatic (Ken-Burns AI-image style placeholders), not photoreal footage.
- Jhansi pincode serviceability list unverified → copy deliberately says "check karo", never "we deliver in Jhansi".
- doordrape.com/api fallback bug (see engineering analysis) → booking CTA may dead-end; fix Vercel rewrite before running traffic.
- Trial-duration fee/UPI claims unresolved → omitted; needs owner policy decision.
