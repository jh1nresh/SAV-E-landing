import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const stations = JSON.parse(readFileSync('app/metro/metro.public.json', 'utf8')).foodStations;
const disclaimer = '營業時間、價格可能調整，出發前再確認';
test('food list and every static station page show source content and working images', async ({ page }) => {
  await page.goto('/metro');
  await expect(page.getByText(disclaimer, { exact: true })).toBeVisible();
  await expect(page.locator('main .guide-card')).toHaveCount(stations.length);
  for (const station of stations) {
    await page.goto(`/metro/${station.slug}`);
    await expect(page.locator('h1')).toHaveText(station.station);
    await expect(page.getByText(disclaimer, { exact: true })).toBeVisible();
    const cards = page.locator('.food-shops article');
    await expect(cards).toHaveCount(station.shops.length);
    for (const [index, shop] of station.shops.entries()) {
      const card = cards.nth(index);
      if (shop.name) await expect(card.locator('h2')).toHaveText(shop.name);
      else await expect(card.locator('h2')).toHaveCount(0);
      for (const [key, label] of Object.entries({ dish: '推薦菜', price: '價格', price_source: '價格出處', address: '地址', exit_walk: '出口／步行', hours: '營業時間' })) {
        const row = card.locator('.food-row').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) });
        if (shop[key]) await expect(row.locator('dd')).toHaveText(shop[key]);
        else await expect(row).toHaveCount(0);
      }
    }
    await expect(page.locator('main')).not.toContainText('未取得');
    await page.locator('.food-gallery img').evaluateAll(async images => {
      await Promise.all(images.map(img => new Promise<void>((resolve, reject) => {
        const image = img as HTMLImageElement;
        image.loading = 'eager';
        if (image.complete) return image.naturalWidth ? resolve() : reject(new Error(image.src));
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(image.src));
      })));
    });
  }
});
test('food pages fit a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/metro', '/metro/xiaojudan']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
