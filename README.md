# SAV-E landing

## Metro food homepage

The `/` route serves `public/metro/index.html` via a Next.js rewrite. This is the self-contained Savvy MRT food map: four station pages, 19 restaurant cards, embedded fonts and AI food illustrations. The HTML can also be opened directly without a server or network. Existing `/privacy` and `/support` routes remain available.

The metro page now uses the deployed landing's coral, honey, forest and cream palette, Iansui headings, Caveat wordmark and embedded paper texture. Station data and embedded images are byte-identical to the reviewed 2026-10-25 prototype. The homepage opens stations directly from the map; the duplicate station-card grid and comment prompt have been removed. Current HTML SHA256: `0a275d82866d6491eb3663d4ef55b9fd2b451e9829928ade900c37a2e7dfb9ef`. See [style reference](docs/metro/style-reference.md), [route sources](docs/metro/sources.md) and [data audit](docs/metro/data-audit.md); the latter two preserve the original data-delivery history. The source JSON is not loaded at runtime.

Delivery scope: push a branch and PR for review, without merging or deploying. `vercel.json` disables automatic deployment for `codex/metro-food-landing` only; other branches retain their existing behavior.

## Previous app landing

Next.js landing for **Savvy** (`sav-e-landing` on Vercel). Four full-width color bands (coral, yellow, deep green, cream), live-text headings, uncropped iPhones, zh/en toggle.

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

## Build

```bash
npm run build
```
