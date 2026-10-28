# Iansui subset (`public/assets/fonts/Iansui-SavvySubset.woff2`)

The landing serves a CJK subset of **Iansui 芫荽** (SIL OFL 1.1, © The Iansui Project Authors,
https://github.com/ButTaiwan/iansui) as **WOFF2** (Brotli). The copyright and license strings are
kept in the font's `name` table; no Reserved Font Name is declared. The full license is in `docs/OFL-Iansui.txt`.

## Source
- Repo `ButTaiwan/iansui`, commit `18aa2c34e4147e5d1e965ace4518352ea224075a`, file `fonts/ttf/Iansui-Regular.ttf` (Version 1.012, sha256 `be9f258178995b67d898f400594a0cae8ca8a08b5148eecdd2a5abc984f891f0`).
- Every glyph outline in the subset is identical to this file. Later upstream commits (e.g. `9d9a8e68b`, "Ver 1.020") change some outlines; do not use them as the source.

## Format
Until this change the subset was shipped as a 3.72 MB TTF. The same glyphs are now shipped as WOFF2
(1.46 MB): same cmap, outlines, advances, GSUB/GPOS/GDEF/BASE, `name` and all other tables; WOFF2
only adds Brotli and the lossless `glyf`/`loca` transform. The font has no hinting tables
(`fpgm`/`prep`/`cvt`), so nothing was stripped. `scripts/compare-fonts.py` proves it (see below).

## Adding characters
When `npm run check` (`check-glyphs`) reports a missing glyph:

1. `pip install fonttools brotli`
2. Fetch the source file above (`git clone https://github.com/ButTaiwan/iansui && git -C iansui checkout 18aa2c34e`).
3. `scripts/subset-iansui.sh <path>/fonts/ttf/Iansui-Regular.ttf "<missing chars>"`
   (reads the codepoints already in the subset, adds the given ones, and writes the `.woff2` with the
   same `pyftsubset` options every time. Output is deterministic: same inputs, same bytes.)
4. Add the characters to the required list at the bottom of `scripts/check-glyphs.mjs` if they are not yet in `data/metro.json`.
5. Verify preserved codepoints, outlines and advances against the previously shipped font,
   mapping glyphs by codepoint; verify new glyphs against the pinned source. The exact-format
   comparison below is not a glyph-addition verifier, because additions change tables and glyph IDs.
6. Open a non-data PR; report font bytes before/after.

Do not change names to look-alike characters to get past the guard. If a character is not in Iansui, stop and ask rather than falling back to a different font.

## Integrating font changes

Convert the latest main TTF rather than the original PR snapshot. Verify the conversion with
`python3 scripts/compare-fonts.py <main.ttf> public/assets/fonts/Iansui-SavvySubset.woff2`.
Do not drop codepoints added by other PRs.

## History
- #12: initial subset, 4870 codepoints (万／菓 included), TTF.
- #27: adds 双 (U+53CC) and ㄦ (U+3126); TTF 3,723,732 → 3,724,380 bytes.
- #31: adds 莆 (U+8386) and ＋ (U+FF0B); TTF 3,724,380 → 3,726,460 bytes.
- #28: converts all 4874 current codepoints to WOFF2; 3,726,460 → 1,460,828 bytes. All outlines, advances and compared tables match.
