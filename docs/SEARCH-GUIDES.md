# Search entry pilot — 2026-10-28

Goal: add three useful, indexable Traditional Chinese guides to the existing metro-food homepage. Preserve the map, source-backed station records, private data boundaries, existing CTA configuration and other projects. User supplied the search-intent pilot, original copy and website-session handoff from the Savvy app checkout; this implementation owns only SAV-E-landing.

## Routes and content

The suggested paths are retained without trailing slashes, following Next.js's existing convention. Slash URLs redirect to the canonical form.

- `/zh-tw/guides`: guide index.
- `/zh-tw/guides/instagram-restaurants-to-map`: one shared post, branch identity and missing-address FAQ.
- `/zh-tw/guides/import-google-maps-saves`: JSON/GeoJSON/KML and supported ZIP contents, preview/selection, CSV and sync limitations.
- `/zh-tw/guides/plan-from-saved-places`: confirmed places, time constraints, adjustable drafts and reservation/route limitations.

Homepage and footer links lead to the index/articles. Related links connect all three. Core content is server-rendered/static and does not need JavaScript; examples are explicitly fictional. Existing source clue → review candidate → user-confirmed Map Stamp distinctions are retained. No city/category combination pages, private examples, ratings, tracking or forms were added.

## Capability and CTA evidence

Reviewed app source remains `617b90f69e190c2723cd40ec867e8038980a2290`: ShareViewController, GoogleTakeoutImportService/View and SavePlanView, plus DESIGN state language. The supplied research used this same revision. This is source evidence, not a claim that every public beta build exposes these features. No native app build or device acceptance was performed in this website task. Each article labels itself an iOS beta reference, warns that entry points vary by version and links support when missing.

On 2026-10-28 the existing TestFlight URL `https://testflight.apple.com/join/aSVm9hRJ` returned the title “Join the Savvy: Turn links into pins beta - TestFlight - Apple”. The guide CTA accurately opens that invitation rather than claiming an App Store release, completed install or in-app deep link. Availability, exact build and installation remain determined by Apple/device state. The existing environment override is retained for CI.

Vercel project-domain readback confirmed `sav-e-landing.vercel.app` as the verified production domain. Canonical URLs use it. Sitemap is an explicit allowlist of the homepage and these four public content pages; it never enumerates metro records, user payloads, tokens or share URLs. This landing repository has no share/App Clip/Universal Links handlers; no rewrites, association files or routes in the separate app repository were modified. Missing fixture paths keep returning 404. Robots is crawl guidance, not access control.

The prior vendor-name prohibition now permits only the editorial strings `Google Maps`, `Google Takeout` and the one guide slug. External service/font hosts and private metro source fields retain their checks. No external service was added.

## Acceptance and evidence

Required checks: `npm run check`, `npm run typecheck`, `npm run test:unit`, production build and the repository's full Chromium/WebKit suite. `tests/e2e/guides.spec.ts` exercises direct routes, metadata, no-JS content, 390/1280 layouts, keyboard links, CTA destinations, sitemap allowlist and unknown-path 404s. CI uploads guide screenshots for inspection. Local browser preflight was below 10 GiB, so no local browser was started; hosted checks and their artifacts provide the runtime evidence. Inspect each screenshot before declaring visual acceptance. Current-head independent review and CI remain merge gates.

## Observation plan (not activated)

After publication, use existing authorized Search Console/reporting access, if available, to compare indexed pages, queries, impressions and clicks by canonical slug. Treat CTA clicks, installations and first confirmed Map Stamps as different stages. There is no new tracking or attribution chain in this change: CTA conversion, installs and activation are unknown. Only add event collection after separate consent/privacy review; never collect source links, content, coordinates, place names or Takeout files. A 28-day review is a suggested decision point, not a scheduled job or ranking guarantee. Expand only with distinct demand and useful source-backed content.
