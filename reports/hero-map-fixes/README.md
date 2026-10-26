# Hero map N1 / N2 / N3 verification

Baseline: PR #12, `55898127b56a07aabbd372dd7079f3f1c0e400f6`. Captured 2026-10-26 against local production builds. No merge or production deployment.

The map now has a server-rendered poster, loads without user input, keeps station cards inside its frame, and reserves the same space before and after hydration. Data, prices, text, source links, product images, fonts, and CI configuration are unchanged.

## Verification

- `npm run check`, `npm run typecheck`, `npm run build`: PASS.
- `CI=true npm test -- --workers=2`: 10 unit tests and 98 Chromium/WebKit tests PASS, including 26 new N1/N2/N3 cases.
- `npm audit --omit=dev --audit-level=high`: PASS; the baseline's moderate `baseline-browser-mapping` advisory remains (no dependency edits).
- Four target viewports: initial page without input; four live stations; every shop; coming-soon station; card/title boundaries, desktop chip row, internal scrolling and stamp visibility. Keyboard, swipe, resize, failed images, source links, and existing LCP checks also pass.
- Independent actual-touch check: 375×667 mobile context, tall-card fixture, CDP touchStart + 12 touchMove + touchEnd. Body scrollTop 0 → 165, card remains open, sticky station title remains visible. This is browser emulation, not a physical iPhone Safari test.
- Static posters are additionally captured with JavaScript disabled. Their date comes from existing data; they do not invent a current-week count.

## Performance and geometry

Same local production-server harness: fresh Chrome contexts, 390×844, DPR 1, CDP 4× CPU slowdown, 150 ms network latency, 1.6 Mbps download / 750 Kbps upload. No input. Observe buffered LCP through load plus 6 seconds.

| Measurement | Before | After |
| --- | --- | --- |
| LCP samples (ms) | 1304, 600, 608 | 620, 592, 592 |
| Median LCP | 608 ms | 592 ms |
| Final LCP element | Headline | Headline in every run |
| Map height, desktop | 520 → 566 px | 566 → 566 px |
| Map height, mobile | 500 → 559 px | 559 → 559 px |
| Total page CLS | 0.00472 | 0.02128 |

The original first sample includes a cold-server outlier. A separate first run immediately after rebuilding the final candidate measured 1244 ms, also the headline; repeated warmed-server runs are shown above. These are local comparison results, not field-performance guarantees. The reserved map slot has zero measured mount displacement; total page CLS is not zero.

The original CSS paper-grain background became an LCP candidate when the map auto-mounted. Both poster and live frame now tile the same image via SVG `feImage`/`feTile`, preserving the texture without creating a large CSS/SVG image candidate. No image file was changed.

Raw results: [before geometry](before/geometry.json), [after geometry](after/geometry.json), [before performance](before/performance.json), [after performance](after/performance.json).

## Screenshots

Each size below is the browser viewport. Images are full-page captures at that viewport, converted from PNG to WebP for repository size. `initial` is captured without pointer, keyboard, or scroll input. Card states are captured after selection and animation settling. Poster links are viewport-only captures with JavaScript disabled. The existing below-the-fold product screenshots and example data are intentionally unchanged.

### 1280 × 800

| State | Before | After |
| --- | --- | --- |
| Initial, no input | [Screenshot](before/1280-initial.webp) | [Screenshot](after/1280-initial.webp) |
| 小巨蛋 | [Screenshot](before/1280-arena.webp) | [Screenshot](after/1280-arena.webp) |
| 雙連 | [Screenshot](before/1280-shuanglian.webp) | [Screenshot](after/1280-shuanglian.webp) |
| 東門 | [Screenshot](before/1280-dongmen.webp) | [Screenshot](after/1280-dongmen.webp) |
| 後山埤 | [Screenshot](before/1280-houshanpi.webp) | [Screenshot](after/1280-houshanpi.webp) |

[Server-rendered poster, JavaScript disabled](after/1280-poster.webp)

### 1440 × 900

| State | Before | After |
| --- | --- | --- |
| Initial, no input | [Screenshot](before/1440-initial.webp) | [Screenshot](after/1440-initial.webp) |
| 小巨蛋 | [Screenshot](before/1440-arena.webp) | [Screenshot](after/1440-arena.webp) |
| 雙連 | [Screenshot](before/1440-shuanglian.webp) | [Screenshot](after/1440-shuanglian.webp) |
| 東門 | [Screenshot](before/1440-dongmen.webp) | [Screenshot](after/1440-dongmen.webp) |
| 後山埤 | [Screenshot](before/1440-houshanpi.webp) | [Screenshot](after/1440-houshanpi.webp) |

[Server-rendered poster, JavaScript disabled](after/1440-poster.webp)

### 390 × 844

| State | Before | After |
| --- | --- | --- |
| Initial, no input | [Screenshot](before/390-initial.webp) | [Screenshot](after/390-initial.webp) |
| 小巨蛋 | [Screenshot](before/390-arena.webp) | [Screenshot](after/390-arena.webp) |
| 雙連 | [Screenshot](before/390-shuanglian.webp) | [Screenshot](after/390-shuanglian.webp) |
| 東門 | [Screenshot](before/390-dongmen.webp) | [Screenshot](after/390-dongmen.webp) |
| 後山埤 | [Screenshot](before/390-houshanpi.webp) | [Screenshot](after/390-houshanpi.webp) |

[Server-rendered poster, JavaScript disabled](after/390-poster.webp)

### 375 × 667

| State | Before | After |
| --- | --- | --- |
| Initial, no input | [Screenshot](before/375-initial.webp) | [Screenshot](after/375-initial.webp) |
| 小巨蛋 | [Screenshot](before/375-arena.webp) | [Screenshot](after/375-arena.webp) |
| 雙連 | [Screenshot](before/375-shuanglian.webp) | [Screenshot](after/375-shuanglian.webp) |
| 東門 | [Screenshot](before/375-dongmen.webp) | [Screenshot](after/375-dongmen.webp) |
| 後山埤 | [Screenshot](before/375-houshanpi.webp) | [Screenshot](after/375-houshanpi.webp) |

[Server-rendered poster, JavaScript disabled](after/375-poster.webp)
