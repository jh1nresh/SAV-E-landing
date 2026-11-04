import { test, expect } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };
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
      await expect(labels).toHaveCount(14);
      await expect(pins).toHaveCount(14);
      const title = (await page.getByTestId('metro-poster-title').boundingBox())!;
      const r = (b: Box) => [b.x, b.y, b.x + b.width, b.y + b.height].map(v => v.toFixed(1)).join(',');
      const labelBoxes = await Promise.all((await labels.all()).map(async l => ({ name: await l.textContent(), box: (await l.boundingBox())! })));
      const overlaps: string[] = [];
      for (const pin of await pins.all()) {
        const pinBox = (await pin.boundingBox())!;
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
