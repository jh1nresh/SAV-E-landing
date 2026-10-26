# SAV-E landing

## Metro food homepage

The `/` route serves `public/metro/index.html` via a Next.js rewrite. This is the self-contained Savvy MRT food map: four station pages, 19 restaurant cards, embedded fonts and AI food illustrations. The HTML can also be opened directly without a server or network. Existing `/privacy` and `/support` routes remain available.

This imports the reviewed 2026-10-25 prototype, removing only two trailing spaces in license comments. Imported HTML SHA256: `37c90ea1e109ff2cd4a85e679ee3255252790f86d2d036918b53272f0ef4e882`; the original hash remains in the historical data audit. Restaurant fields, scheduled publication state, source warnings and social links are preserved; the nearby source JSON is not loaded at runtime. Source provenance and data limitations are recorded in [sources](docs/metro/sources.md) and [data audit](docs/metro/data-audit.md); those documents retain the original local-delivery history.

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
