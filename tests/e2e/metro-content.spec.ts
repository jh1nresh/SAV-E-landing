import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mergeFoodStations, loadDesignStations, loadDailyStations } from '../../scripts/metro-content.mjs';

type Shop = {
  name?: string | null;
  dish?: string | null;
  price?: string | null;
  price_source?: string | null;
  address?: string | null;
  exit_walk?: string | null;
  hours?: string | null;
};

type Station = {
  city?: string;
  station: string;
  slug: string;
  shops: Shop[];
};

const shopFields = {
  dish: '推薦菜',
  price: '價格',
  price_source: '價格出處',
  address: '地址',
  exit_walk: '出口／步行',
  hours: '營業時間',
} as const;

const baseStations = JSON.parse(readFileSync('content/metro/stations.json', 'utf8')) as Station[];
const dailyStations = loadDailyStations('content/metro') as Station[];
// stations.json + daily + DESIGN. The public pages serve Taipei; Shanghai stays in the content layer.
const designCatalog = loadDesignStations('content/metro');
const stations = (mergeFoodStations(baseStations, dailyStations, designCatalog) as Station[])
  .filter((station) => (station.city ?? 'taipei') === 'taipei');
const disclaimer = '營業時間、價格可能調整，出發前再確認';

test('food list shows source disclaimer and every station', async ({ page }) => {
  await page.goto('/metro');
  await expect(page.getByText(disclaimer, { exact: true })).toBeVisible();
  await expect(page.locator('main .guide-card')).toHaveCount(stations.length);
});

for (const station of stations) {
  test(`${station.slug} shows source content and working images`, async ({ page }) => {
    await expectStationContent(page, station);
  });
}

test('food pages fit a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/metro', '/metro/xiaojudan']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

async function expectStationContent(page: Page, station: Station) {
  await page.goto(`/metro/${station.slug}`);
  await expect(page.locator('h1')).toHaveText(station.station);
  await expect(page.getByText(disclaimer, { exact: true })).toBeVisible();
  const cards = page.locator('.food-shops article');
  await expect(cards).toHaveCount(station.shops.length);
  for (const [index, shop] of station.shops.entries()) {
    const card = cards.nth(index);
    if (shop.name) await expect(card.locator('h2')).toHaveText(shop.name);
    else await expect(card.locator('h2')).toHaveCount(0);
    for (const [key, label] of Object.entries(shopFields) as [keyof typeof shopFields, string][]) {
      const row = card.locator('.food-row').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) });
      const value = shop[key];
      if (value) await expect(row.locator('dd')).toHaveText(value);
      else if (key === 'price') await expect(row.locator('dd')).toHaveText('價格待確認');
      else await expect(row).toHaveCount(0);
    }
  }
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
