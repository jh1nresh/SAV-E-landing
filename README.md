# SAV-E landing

Next.js landing for **Savvy** (`sav-e-landing` on Vercel). Coral hero (App claim + App Store + five official stickers + interactive Doodle metro food map), then Passport / Friends / Day-Night bands, a download CTA, and the footer. zh/en toggle.

This GitHub repo (`jh1nresh/SAV-E-landing`) is what Vercel project `jhinreshs-projects/sav-e-landing` deploys. Next.js is auto-detected; `.vercel` project metadata stays gitignored.

## Config

Public TestFlight invite (defaults to the public join URL if unset):

```bash
NEXT_PUBLIC_TESTFLIGHT_URL="https://testflight.apple.com/join/aSVm9hRJ"
```

App Store badges keep `data-swap="appstore-url"` so the href can be swapped at launch. The current TestFlight destination is identified by a visible localized beta note and the badge's accessible description; update that release-status copy with the destination at launch.

## Language

- Default: Traditional Chinese (`zh-Hant`)
- English: `?lang=en` or the EN chip
- The toggle sets `<html lang>` to `zh-Hant` or `en`

## Product lock (copy)

- Free = 50 saved places
- Pro = unlimited saved places
- AI is not a Pro feature
- No pixel tile-town imagery or wording

## Metro map data

Homepage map, station strip, photos, store counts and cards are generated from the same `content/metro/stations.json` / daily article records as the food pages. The public `mapStores` projection is consumed by both the live map and no-JS poster. `data/metro.json` remains a validated legacy dataset; it no longer supplies the homepage cards.

- In the legacy `data/metro.json` schema, every store has a `kind`: `"example"` (illustrative sample) or `"post"` (grown from a real founder post). Labels follow each entry's `kind`, not a page-wide flag (`_meta.example` is retired and rejected by the build). Example entries are labelled **範例資料 · 示意** / prices **示意**; a `post` entry has no price number (shown 價格待查), carries no example label, and needs only `id`, `kind`, `stationId`, `name`, `sourcePosts`, `addedAt`. The map-level 範例資料 stamp shows only while every entry is an example.
- Unverified example prices are labelled **示意** (`verified: false`).
- Private `notes` fields are stripped by `scripts/build-metro.mjs` before anything is imported by the app. The public payload is `app/metro/metro.public.json`.
- Adding a station requires `map: {"line": "L_red|L_blue|L_green|L_orange", "at": [x, y]}` in `stations.json`. The generated station `mapPos` is a hand-drawn schematic point (not a geographic coordinate). The build snaps it onto the doodle line.
- NEW / “本週新增” are computed in the browser from the Asia/Taipei calendar date. Only `kind: post`, non-backfill entries qualify: latest source post date ≥ `NEW_FLOW_START` (2026-10-27), and go-live is 0–3 days after it (`MAX_POST_TO_LIVE_DAYS`). Eligible entries show NEW for **strictly fewer than 7 days** after `addedAt` (day 6 = NEW, day 7 and 8 = not NEW). Inject a clock with `?clock=YYYY-MM-DD`.
- Legacy store post links must exactly match `https://www.instagram.com/savvysave_/p/<id>/` or `https://www.threads.com/@savvysave_/post/<id>` with the correct platform. Validation is offline. The same rule applies to examples; canonical links must be supplied from verified records, never constructed by prepending an account.
- No-JS HTML does not print a stale “本週新增 N 家” or NEW badge. “更新於 M/D” may be static from the data.

```bash
npm run check
```

## Pages

- `/` landing
- `/privacy`
- `/support`
- `mailto:support@sav-e.app`

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Build and test

```bash
npm run check
npm run typecheck
npm run build
npm test
```

## Metro food content

`/metro` lists the published food guides; `/metro/<slug>` is generated statically for every station. These pages share the existing Metro public payload, site navigation/footer, and guide styles. The homepage schematic uses every published content station and keeps its illustrative labels.

Put station records in `content/metro/stations.json`, or add a single station object at `content/metro/daily/YYYY-MM-DD/web.json`. Daily directories are processed in date order; the later record merges fields into the station with the same `n`, inheriting `map` and `map_id` when omitted. No manual station registry is needed. See `content/metro/schema.md` for fields. Keys beginning with `_` are ignored recursively. Missing display fields are hidden. Each shop needs a unique `key` matching exactly one photo filename (without its extension); the build rejects missing, ambiguous or duplicate matches rather than silently omitting a shop. Photos are paired by key, never gallery order. Map popup cards show only the shop name, full address and original price wording beside the photo, with shop-switching controls. Every station uses this compact layout without internal scrolling. Full details, source links and the confirmation disclaimer remain on the food pages; no price or address is invented.

Put images in `content/metro/images/NN-slug/photos/` and `slides/`. References may use `images/NN-slug/photos/name.webp` or `photos/name.webp` (similarly for slides). The build supports existing JPG/PNG references whose committed counterpart is WebP, validates file containment/existence, and copies referenced files to generated `public/metro/images/`. Research sources and extraction metadata remain in the content files; only display fields enter the public payload. Existing predev/prebuild/pretest/typecheck hooks run this pipeline.

A pull request touching `content/metro/**` triggers Metro content validation and auto-merge. The workflow compares **all changed files against the base**, including deletions and renames. Only content-only PRs run the dedicated validation/build/tests and then request GitHub squash auto-merge with `GITHUB_TOKEN`. Non-content changes need human review and skip auto-merge. The gate runs from the reviewed base; this implementation PR therefore requires human review. Fork PRs validate but cannot enable auto-merge through the restricted fork token. Repository auto-merge must be enabled and existing branch protections/required reviews and checks still apply. No protection bypass is used. After merge, the existing Vercel Git integration builds and deploys the site.

## Public agent access

The canonical site is `https://savvy.jeezlabs.io`. Public pages support
`Accept: text/markdown` and `Accept: text/html`, honor media quality values,
and Markdown responses include `Vary: Accept`. Unsupported representations return 406.
HTML and Markdown responses use `private, no-store`: Next.js 16.4.3 overwrites
the custom HTML `Vary` value, so negotiated pages must not be cached by URL alone. Missing
pages keep HTTP 404 and provide Markdown recovery links when requested.
Explicit Markdown URLs are `/index.md` for the homepage and `<page>.md` for
other public pages. `/llms.txt` follows the llms.txt Markdown file-list format;
`/sitemap.xml` enumerates curated public pages, never private account/share data.

`/docs` explains this read-only HTTP interface and its boundaries. This landing
site advertises no supported public account API, MCP server, SDK or CLI.
Organization postal address and email are intentionally omitted from new content
and structured data; existing support links remain in place.

Endpoint, no-JS, metadata, schema and discovery checks live in
`tests/e2e/agent-readiness.spec.ts`; Accept edge cases also have unit coverage.
Run against a production build with `npm run build` followed by `CI=true npm test`.
After a separately approved production deployment, rerun the HTTP checks against
the canonical domain and repeat the Is Agentic audit. Code changes cannot promise
search ranking or a new readiness score.
