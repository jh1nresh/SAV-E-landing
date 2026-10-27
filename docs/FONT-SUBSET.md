# Iansui subset (`public/assets/fonts/Iansui-SavvySubset.ttf`)

The landing serves a CJK subset of **Iansui 芫荽** (SIL OFL 1.1, © The Iansui Project Authors,
https://github.com/ButTaiwan/iansui). License text: `docs/OFL-Iansui.txt` (the copyright and
license strings are also kept in the font's `name` table; no Reserved Font Name is declared).

## Source
- Repo `ButTaiwan/iansui`, commit `18aa2c34e4147e5d1e965ace4518352ea224075a`, file `fonts/ttf/Iansui-Regular.ttf` (Version 1.012, sha256 `be9f258178995b67d898f400594a0cae8ca8a08b5148eecdd2a5abc984f891f0`).
- Every existing glyph outline in the subset is identical to this file (checked glyph by glyph).
  Later upstream commits (e.g. `9d9a8e68b`, "Ver 1.020") change some outlines; do not use them as the source.

## Adding characters
When `npm run check` (`check-glyphs`) reports a missing glyph:

1. `pip install fonttools`
2. Fetch the source file above (`git clone https://github.com/ButTaiwan/iansui && git -C iansui checkout 18aa2c34e`).
3. `scripts/subset-iansui.sh <path>/fonts/ttf/Iansui-Regular.ttf "<missing chars>"`
   (keeps every codepoint already in the subset, adds the given ones; same `pyftsubset` options each time).
4. Add the characters to the required list at the bottom of `scripts/check-glyphs.mjs` if they are not yet in `data/metro.json`.
5. Open a non-data PR; report font bytes before/after.

Do not change names to look-alike characters to get past the guard. If a character is not in Iansui, stop and ask rather than falling back to a different font.

## History
- #12: initial subset, 4870 codepoints (万／菓 included).
- Adds 双 (U+53CC) and ㄦ (U+3126), needed by 士林 entry 「双胞胎手工蛋餅捲ㄦ」: +648 bytes (3,723,732 → 3,724,380).
