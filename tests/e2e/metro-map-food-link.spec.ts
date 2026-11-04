import { expect, test } from "@playwright/test";
import { getPublicMetroData, getFoodStations } from "../../lib/metro";
import { foodShopRows, FOOD_DISCLAIMER } from "../../lib/metro-logic.mjs";
import { openStation, waitForMap } from "./helpers";

const metro = getPublicMetroData();
const articles = getFoodStations();
for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  for (const station of metro.stations) {
    test(`article map ${station.id}: photos, count, all shops and guide at ${viewport.width}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto('/?reduce=1');
      await waitForMap(page);
      const article = articles.find(s => s.slug === station.slug)!;
      const stores = metro.stores.filter(s => s.stationId === station.id);
      expect(stores.length).toBe(article.shops.length);
      const pin = page.getByTestId(`metro-pin-${station.id}`);
      await expect(pin).not.toHaveClass(/content-only|nophoto/);
      await expect(pin).toHaveAttribute('aria-label', new RegExp(`共 ${article.shops.length} 間`));
      await expect(pin.locator('img')).toHaveAttribute('src', stores[0].image!);
      await expect.poll(() => pin.locator('img').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await openStation(page, station.id);
      await expect(page.locator('#card .upd')).toContainText(`共 ${article.shops.length} 間`);
      await expect(page.locator('#card .thumbs button')).toHaveCount(article.shops.length);
      for (const [i, shop] of article.shops.entries()) {
        if (i) await page.locator('#card .thumbs button').nth(i).click();
        await expect(page.locator('#card .fc h4')).toHaveText(shop.name!);
        await expect(page.locator('#card .fc h4')).toBeInViewport();
        const image = page.locator('#card .fc img');
        await expect(image).toHaveAttribute('src', stores[i].image!);
        await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        for (const [label, value] of foodShopRows(shop)) {
          await expect(page.locator('#card .article-details div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd')).toHaveText(value);
        }
        await expect(page.locator('#card .cfoot')).toHaveText(FOOD_DISCLAIMER);
      }
      const link = page.getByTestId(`metro-food-link-${station.id}`);
      await expect(link).toHaveAttribute('href', `/metro/${station.slug}`);
      const response = await page.request.get(`/metro/${station.slug}`);
      expect(response.status()).toBe(200);
      if (['ximen', 'zhongxiao-fuxing'].includes(station.id)) {
        await page.locator('#card .thumbs button').first().click();
        await expect(page.locator('#card .fc h4')).toHaveText(article.shops[0].name!);
        await page.screenshot({ path: testInfo.outputPath(`${station.id}-${viewport.width}.png`) });
      }
      expect(errors).toEqual([]);
    });
  }
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`no-JS poster receives every article photo at ${viewport.width}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport });
    try {
      const page = await context.newPage();
      await page.goto('/');
      for (const station of metro.stations) {
        const image = metro.stores.find(s => s.stationId === station.id)!.image;
        await expect(page.getByTestId(`metro-poster-marker-${station.id}`).locator('image')).toHaveAttribute('href', image!);
      }
    } finally { await context.close(); }
  });
}
