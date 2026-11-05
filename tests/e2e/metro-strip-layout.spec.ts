import { expect, test } from '@playwright/test';
import { waitForMap } from './helpers';
import { readFileSync } from 'node:fs';

const STATION_COUNT = (JSON.parse(readFileSync('content/metro/stations.json', 'utf8')) as unknown[]).length;

for (const width of [1280, 1440]) {
  test(`desktop strip tabs clear the map and receive bottom-edge hits at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await waitForMap(page);
    await page.evaluate(() => document.fonts.ready);
    const map = page.getByTestId('metro-map');
    const tabs = map.locator('.strip .tab');
    await expect(tabs).toHaveCount(STATION_COUNT);
    const obstacles = map.locator('.mapcard, .mapcard .stamp, .mapcard .tape');
    await expect(obstacles).toHaveCount(3);
    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      for (const obstacle of await obstacles.all()) {
        const other = await obstacle.boundingBox();
        expect(other).not.toBeNull();
        const intersects = box!.x < other!.x + other!.width && box!.x + box!.width > other!.x
          && box!.y < other!.y + other!.height && box!.y + box!.height > other!.y;
        expect(intersects, `${await tab.textContent()} overlaps ${await obstacle.getAttribute('class')}`).toBe(false);
      }
      expect(await tab.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 2);
        return hit !== null && el.contains(hit);
      }), `${await tab.textContent()} bottom edge receives pointer hits`).toBe(true);
    }
  });
}
