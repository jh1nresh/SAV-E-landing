import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mergeFoodStations, loadDesignStations, loadDailyStations } from '../../scripts/metro-content.mjs';

type Shop = {
  key?: string | null;
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
// Both cities are public guides, generated from stations.json + daily + DESIGN.
const designCatalog = loadDesignStations('content/metro');
const stations = mergeFoodStations(baseStations, dailyStations, designCatalog) as Station[];
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
  const city = station.city === 'shanghai' ? '上海' : '台北';
  await expect(page.locator('h1')).toHaveText(`${station.station.startsWith(city) ? '' : city}${station.station}${station.station.endsWith('站') ? '' : '站'}美食攻略`);
  await expect(page).toHaveTitle(new RegExp(`${station.station}.*美食攻略`));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://savvy.jeezlabs.io/metro/${station.slug}`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', new RegExp(`${station.shops.length}家店`));
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  const article = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'Article');
  const list = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'ItemList');
  expect(article.headline).toBe(await page.locator('h1').innerText());
  expect(article.url).toBe(`https://savvy.jeezlabs.io/metro/${station.slug}`);
  expect(list.numberOfItems).toBe(station.shops.length);
  expect(list.itemListElement.map((item: { name: string }) => item.name)).toEqual(station.shops.map(shop => shop.name));
  await expect(page.getByText(disclaimer, { exact: true })).toBeVisible();
  const cards = page.locator('.food-shops article');
  await expect(cards).toHaveCount(station.shops.length);
  for (const [index, shop] of station.shops.entries()) {
    const card = cards.nth(index);
    const anchor = await card.getAttribute('id');
    expect(list.itemListElement[index].url).toBe(`${article.url}#${anchor}`);
    await expect(page.locator('.food-quick-index a').nth(index)).toHaveAttribute('href', `#${anchor}`);
    const map = new URL((await card.locator('.food-map-link').getAttribute('href'))!);
    expect(map.protocol).toBe('https:');
    expect(map.hostname).toBe(station.city === 'shanghai' ? 'uri.amap.com' : 'maps.apple.com');
    const query = map.searchParams.get(station.city === 'shanghai' ? 'keyword' : 'query');
    expect(query).toContain(shop.name);
    if (shop.address) expect(query).toContain(shop.address);
    const photo = card.locator('.food-shop-photo img');
    if (await photo.count()) expect((await photo.getAttribute('src'))!.split('/').at(-1)?.replace(/\.[^.]+$/, '')).toBe(shop.key);
    if (shop.name) await expect(card.locator('h2')).toHaveText(shop.name);
    else await expect(card.locator('h2')).toHaveCount(0);
    for (const [key, label] of Object.entries(shopFields) as [keyof typeof shopFields, string][]) {
      const rowLabel = station.city === 'shanghai' && key === 'price' ? '價格（人民幣）' : label;
      const row = card.locator('.food-row').filter({ has: page.locator('dt', { hasText: new RegExp(`^${rowLabel.replace(/[()]/g, '\\$&')}$`) }) });
      const value = shop[key];
      if (value) {
        await expect(row.locator('dd')).toHaveText(value);
        for (const url of value.match(/https?:\/\/[^\s]+/g) ?? []) {
          await expect(row.locator('dd a').filter({ hasText: url })).toHaveAttribute('href', url);
        }
      }
      else if (key === 'price' && station.city !== 'shanghai') await expect(row.locator('dd')).toHaveText('價格待確認');
      else await expect(row).toHaveCount(0);
    }
  }
  await page.locator('.food-shop-photo img').evaluateAll(async images => {
    await Promise.all(images.map(img => new Promise<void>((resolve, reject) => {
      const image = img as HTMLImageElement;
      image.loading = 'eager';
      if (image.complete) return image.naturalWidth ? resolve() : reject(new Error(image.src));
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(image.src));
    })));
  });
}
