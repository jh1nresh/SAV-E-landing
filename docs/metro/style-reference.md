# Deployed landing style applied to the metro page

Reference inspected on 2026-10-26 (Asia/Shanghai): https://sav-e-landing.vercel.app/.
Production deployment recorded by GitHub: `7220438085`, source commit `30933bd9b5e7958edd222d5662b3e819c9e000ac`.
Live computed styles and desktop/mobile screenshots were inspected, then matched to `app/globals.css` and `public/assets/`. No production settings or deployment were changed.

## Reference and implementation

| Element | Deployed value | Metro use |
| --- | --- | --- |
| Coral | `#f26b4a` | Full-width opening band and station title panel |
| Honey | `#ffcc4f` | Map surround, underline and published badges |
| Forest | `#0e4a33` | Buttons and headings |
| Paper | `#fff9eb` | Cards, page base and map panel |
| Ink | `#2f2e23` | Body text, coral-band text and drawing outlines |
| Muted / line | `#62594f` / `#dccfb9` | Supporting text and borders |
| Iansui | deployed `Iansui-SavvySubset.ttf` | Embedded WOFF2 subset for Chinese display headings |
| Caveat | deployed `Caveat-SemiBold.ttf` | Embedded WOFF2 subset for wordmark and numerals |
| Paper grain | deployed `paper-grain.png` | Embedded background texture |

Headings on coral use dark ink for readable contrast (the production reference uses white). Dense restaurant fields and map labels retain the embedded sans font. Unsupported glyphs in the deployed Iansui subset fall back to embedded Noto Sans TC. Font attribution and OFL terms remain in the HTML.

The metro map retains its geometry, line identities and station order. Buildings use three flat tones related to the deployed palette; short shadows remain warm gray `#ddd4c3`. The original prototype's navy/cream styling is superseded only for this explicitly requested visual update.

## Invariants and verification

- The embedded station data and images are byte-identical to the preceding version. No restaurant values, series numbers, publication status or links changed.
- The user-requested removal of the comment prompt and station-card grid leaves map-based station navigation. The grid renderer is removed, and the old `#stations` anchor now leads to the map without throwing an error.
- Four station pages and 19 cards remain; 小巨蛋 has four cards, 後山埤 remains scheduled with no post links, 雙連 retains Threads/XHS only.
- Source-date, inferred-price, missing-data, source-conflict and AI-image disclosures remain visible.
- Self-contained HTML; no external runtime assets. Next.js still serves it at `/`, and privacy/support remain available.
- Production-server Chromium checks at 390px and 1280px verify theme colors, loaded fonts, all station states, labels/disclosures, image loading, text/page fit, hash reload, keyboard and browser history. Full-page screenshots were inspected.
- A local offline HTML check also verifies embedded resources and station navigation. Real-device Safari is not part of this pass.

Delivery stays on PR #11; merge and deployment remain outside this update's authorization.
