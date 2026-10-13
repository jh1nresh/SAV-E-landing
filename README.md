# Savvy landing

Single-page Atlas Postcard landing for Savvy: Instagram/link → Map Stamp → map.

## Config

Copy `.env.example` and set names only in the host (Vercel preview/prod). Do not commit secrets.

```bash
NEXT_PUBLIC_TESTFLIGHT_URL=
WAITLIST_FORM_URL=
WAITLIST_LOCAL_PATH=
```

- `NEXT_PUBLIC_TESTFLIGHT_URL` — public TestFlight join URL. Unset = disabled placeholder.
- `WAITLIST_FORM_URL` — HTTPS Formspree-style endpoint for durable waitlist storage.
- `WAITLIST_LOCAL_PATH` — optional local JSONL for `npm run dev` only.

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
