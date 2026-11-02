# SAV-E landing

Next.js landing for **Savvy** (`sav-e-landing` on Vercel). Coral hero (App claim + App Store + five official stickers + interactive Doodle metro food map), then Passport / Friends / Day-Night bands, a download CTA, and the footer. zh/en toggle.

This GitHub repo (`jh1nresh/SAV-E-landing`) is what Vercel project `jhinreshs-projects/sav-e-landing` deploys. Next.js is auto-detected; `.vercel` project metadata stays gitignored.

## Config

Public TestFlight invite (defaults to the public join URL if unset):

```bash
NEXT_PUBLIC_TESTFLIGHT_URL="https://testflight.apple.com/join/aSVm9hRJ"
```

App Store badges keep `data-swap="appstore-url"` so the href can be swapped at launch.

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

Homepage map, station strip, NEW badges, and “本週新增” are generated from one file: `data/metro.json`.

- Every store has a `kind`: `"example"` (illustrative sample) or `"post"` (grown from a real founder post). Labels follow each entry's `kind`, not a page-wide flag (`_meta.example` is retired and rejected by the build). Example entries are labelled **範例資料 · 示意** / prices **示意**; a `post` entry has no price number (shown 價格待查), carries no example label, and needs only `id`, `kind`, `stationId`, `name`, `sourcePosts`, `addedAt`. The map-level 範例資料 stamp shows only while every entry is an example.
- Unverified example prices are labelled **示意** (`verified: false`).
- Private `notes` fields are stripped by `scripts/build-metro.mjs` before anything is imported by the app. The public payload is `app/metro/metro.public.json`.
- Station `mapPos` is a hand-drawn schematic point (not a geographic coordinate). The build snaps it onto the doodle line.
- NEW / “本週新增” are computed in the browser from the Asia/Taipei calendar date. Only `kind: post`, non-backfill entries qualify: latest source post date ≥ `NEW_FLOW_START` (2026-10-27), and go-live is 0–3 days after it (`MAX_POST_TO_LIVE_DAYS`). Eligible entries show NEW for **strictly fewer than 7 days** after `addedAt` (day 6 = NEW, day 7 and 8 = not NEW). Inject a clock with `?clock=YYYY-MM-DD`.
- Post links must exactly match `https://www.instagram.com/savvysave_/p/<id>/` or `https://www.threads.com/@savvysave_/post/<id>` with the correct platform. Validation is offline. The same rule applies to examples; canonical links must be supplied from verified records, never constructed by prepending an account.
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

`/metro` lists the published food guides; `/metro/<slug>` is generated statically for every station. These pages share the existing Metro public payload, site navigation/footer, and guide styles. The homepage schematic keeps its existing map data and illustrative labels.

Put station records in `content/metro/stations.json`, or add a single station object at `content/metro/daily/YYYY-MM-DD/web.json`. Daily directories are processed in date order; the later record replaces the entire station with the same `n`. No manual station registry is needed. See `content/metro/schema.md` for fields. Keys beginning with `_` are ignored recursively. Missing display fields are hidden.

Put images in `content/metro/images/NN-slug/photos/` and `slides/`. References may use `images/NN-slug/photos/name.webp` or `photos/name.webp` (similarly for slides). The build supports existing JPG/PNG references whose committed counterpart is WebP, validates file containment/existence, and copies referenced files to generated `public/metro/images/`. Research sources and extraction metadata remain in the content files; only display fields enter the public payload. Existing predev/prebuild/pretest/typecheck hooks run this pipeline.

A pull request touching `content/metro/**` triggers Metro content validation and auto-merge. The workflow compares **all changed files against the base**, including deletions and renames. Only content-only PRs run the dedicated validation/build/tests and then request GitHub squash auto-merge with `GITHUB_TOKEN`. Non-content changes need human review and skip auto-merge. The gate runs from the reviewed base; this implementation PR therefore requires human review. Fork PRs validate but cannot enable auto-merge through the restricted fork token. Repository auto-merge must be enabled and existing branch protections/required reviews and checks still apply. No protection bypass is used. After merge, the existing Vercel Git integration builds and deploys the site.
