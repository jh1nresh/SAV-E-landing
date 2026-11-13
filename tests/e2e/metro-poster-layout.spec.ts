import { test, expect } from '@playwright/test';
import { buildFoodStations } from '../../scripts/metro-content.mjs';

const STATION_COUNT = buildFoodStations('.').length;

type Box = { x: number; y: number; width: number; height: number };
// WebKit's getBoundingClientRect for SVG <text> ignores x/y, so map getBBox through getScreenCTM in every engine.
const svgBox = (el: SVGGraphicsElement) => {
  const b = el.getBBox(), m = el.getScreenCTM()!;
  const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
};
const intersects = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

for (const width of [390, 1280, 1440]) {
  test(`no-JS poster labels and title clear every photo pin at ${width}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await page.locator('.poster-vp').scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      const labels = page.locator('[data-testid^="metro-poster-label-"]');
      const pins = page.locator('[data-testid^="metro-poster-pin-"]');
      await expect(labels).toHaveCount(STATION_COUNT);
      await expect(pins).toHaveCount(STATION_COUNT);
      const title = (await page.getByTestId('metro-poster-title').boundingBox())!;
      const r = (b: Box) => [b.x, b.y, b.x + b.width, b.y + b.height].map(v => v.toFixed(1)).join(',');
      const labelBoxes = await Promise.all((await labels.all()).map(async l => ({ name: await l.textContent(), box: await l.evaluate(svgBox) })));
      const overlaps: string[] = [];
      for (const pin of await pins.all()) {
        const pinBox = await pin.evaluate(svgBox);
        const pinId = await pin.getAttribute('data-testid');
        if (intersects(pinBox, title)) overlaps.push(`${pinId} [${r(pinBox)}] overlaps title [${r(title)}]`);
        for (const { name, box } of labelBoxes) {
          if (intersects(box, pinBox)) overlaps.push(`${name} [${r(box)}] overlaps ${pinId} [${r(pinBox)}]`);
        }
      }
      expect(overlaps).toEqual([]);
    } finally { await context.close(); }
  });
}
