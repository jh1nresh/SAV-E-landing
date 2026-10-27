import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ttfCmapCodepoints } from "../../scripts/ttf-cmap.mjs";

const FONT = "public/assets/fonts/Iansui-SavvySubset.woff2";

test("Iansui subset is served as WOFF2 and its cmap is readable", () => {
  const buf = readFileSync(FONT);
  assert.equal(buf.toString("ascii", 0, 4), "wOF2");
  const cps = ttfCmapCodepoints(FONT);
  assert.ok(cps.size >= 4870, `expected at least 4870 codepoints, got ${cps.size}`);
  for (const ch of ["万", "菓", "雙", "連", "站"]) {
    assert.ok(cps.has(ch.codePointAt(0)), `${ch} missing from subset`);
  }
});
