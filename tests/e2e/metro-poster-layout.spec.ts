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
      for (const pin of await pins.all()) {
        const pinBox = (await pin.boundingBox())!;
        const pinId = await pin.getAttribute('data-testid');
        expect(intersects(pinBox, title), `${pinId} overlaps title`).toBe(false);
        for (const label of await labels.all()) {
          expect(intersects((await label.boundingBox())!, pinBox), `${await label.textContent()} overlaps ${pinId}`).toBe(false);
        }
      }
    } finally { await context.close(); }
  });
}
