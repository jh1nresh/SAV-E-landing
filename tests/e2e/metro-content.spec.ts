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

test('line, time and dining filters can be combined and cleared', async ({ page }) => {
  await page.goto('/metro');
  const results = page.locator('.food-city-section .guide-card');
  await page.getByLabel('捷運路線').selectOption('紅線');
  await page.getByLabel('用餐時段').selectOption('早餐');
  await page.getByLabel('用餐情境').selectOption('銅板小吃');
  await expect(results.locator('h3')).toHaveText(['雙連站', '士林站']);
  await page.getByLabel('捷運路線').selectOption('上海 14 號線');
  await expect(page.getByRole('status')).toContainText('沒有符合的攻略');
  await page.getByRole('button', { name: '清除篩選' }).click();
  await expect(results).toHaveCount(stations.length);
});

test('Shuanglian offers weekday and weekend picks and expandable sources without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 780 } });
  try {
    const page = await context.newPage();
    await page.goto('/metro/shuanglian');
    const table = page.getByRole('region', { name: '雙連站小吃與甜點速查' });
    await expect(table.getByRole('row')).toHaveCount(6);
    await expect(table.getByRole('row', { name: /滋奶谷/ })).toContainText('外送 NT$175／5入');
    await table.focus();
    await expect(table).toBeFocused();
    expect(await table.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await table.getByRole('link', { name: '雙連圓仔湯' }).click();
    await expect(page).toHaveURL(/#shop-yuanzai$/);
    const plan = page.getByRole('region', { name: '平日和週末怎麼吃' });
    await expect(plan.getByText('週日下午')).toBeVisible();
    await plan.getByRole('link', { name: '阿田麵', exact: true }).click();
    const shop = page.locator('#shop-atian');
    await expect(shop.getByText('平日午餐 · 15:00 前')).toBeVisible();
    await expect(shop.getByText('價格出處')).toBeHidden();
    await shop.locator('summary').press('Enter');
    await expect(shop.getByText('價格出處')).toBeVisible();
    await expect(page.getByRole('link', { name: '查看 Savvy App 測試名單 →' })).toHaveAttribute('href', '/#app');
    await expect(page.getByRole('link', { name: /查看 iOS TestFlight/ })).toHaveAttribute('href', /^https:\/\/testflight\.apple\.com\/join\//);
    const related = page.getByRole('navigation', { name: '同線延伸推薦' });
    await expect(related.getByRole('link', { name: '中山站美食 →' })).toHaveAttribute('href', '/metro/zhongshan');
    await expect(related.getByRole('link', { name: '士林站美食 →' })).toHaveAttribute('href', '/metro/shilin');
    const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText())['@graph'];
    const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    const visibleFaq = page.getByRole('region', { name: '常見問題' });
    expect(faq.mainEntity).toHaveLength(3);
    await expect(visibleFaq.locator('h3')).toHaveText(faq.mainEntity.map((item: { name: string }) => item.name));
    await expect(visibleFaq.locator('p')).toHaveText(faq.mainEntity.map((item: { acceptedAnswer: { text: string } }) => item.acceptedAnswer.text));
    const businesses = graph.find((node: { '@type': string }) => node['@type'] === 'ItemList').itemListElement;
    expect(businesses).toHaveLength(5);
    expect(businesses[0].item).toMatchObject({ '@type': 'FoodEstablishment', openingHours: 'Mo-Fr 10:00-15:00', address: { streetAddress: '台北市大同區赤峰街44巷20號1樓' } });
    expect(businesses[1].item).not.toHaveProperty('openingHours');
    for (const { item } of businesses) expect(item).not.toHaveProperty('priceRange');
  } finally { await context.close(); }
});

for (const station of stations) {
  test(`${station.slug} shows source content and working images`, async ({ page }) => {
    await expectStationContent(page, station);
  });
}

test('food pages fit a narrow viewport', async ({ context }) => {
  for (const path of ['/metro', '/metro/xiaojudan']) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.close();
  }
});

async function expectStationContent(page: Page, station: Station) {
  await page.goto(`/metro/${station.slug}`);
  const city = station.city === 'shanghai' ? '上海' : '台北';
  await expect(page.locator('h1')).toHaveText(station.slug === 'shuanglian' ? '台北雙連站美食攻略：早餐、赤峰街午餐與甜點' : `${station.station.startsWith(city) ? '' : city}${station.station}${station.station.endsWith('站') ? '' : '站'}美食攻略`);
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
    const google = new URL((await card.locator('.food-search-link').getAttribute('href'))!);
    expect(google.origin + google.pathname).toBe('https://www.google.com/maps/search/');
    expect(google.searchParams.get('api')).toBe('1');
    expect(google.searchParams.get('query')).toBe(query);
    const photo = card.locator('.food-shop-photo img');
    if (await photo.count()) expect((await photo.getAttribute('src'))!.split('/').at(-1)?.replace(/\.[^.]+$/, '')).toBe(shop.key);
    if (shop.name) await expect(card.locator('h2')).toHaveText(shop.name);
    else await expect(card.locator('h2')).toHaveCount(0);
    for (const [key, label] of Object.entries(shopFields) as [keyof typeof shopFields, string][]) {
      const rowLabel = station.city === 'shanghai' && key === 'price' ? '價格（人民幣）' : label;
      const row = card.locator('.food-row').filter({ has: page.locator('dt', { hasText: new RegExp(`^${rowLabel.replace(/[()]/g, '\\$&')}$`) }) });
      const value = shop[key];
      if (value) {
        await expect(row.locator('dd')).toHaveText(value.replace(/https?:\/\/[^\s]+/g, url =>
          '查看來源 ↗' + (url.match(/[。，；、）]+$/u)?.[0] ?? '')));
        for (const url of value.match(/https?:\/\/[^\s]+/g) ?? []) {
          expect(await row.locator('dd a').evaluateAll(links => links.map(link => link.getAttribute('href'))))
            .toContain(url.replace(/[。，；、）]+$/u, ''));
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

test('Shuanglian comparison and FAQ are available as Markdown and through the public API', async ({ request }) => {
  const markdown = await request.get('/metro/shuanglian.md');
  expect(markdown.ok()).toBe(true);
  expect(markdown.headers()['content-type']).toContain('text/markdown');
  const body = await markdown.text();
  expect(body).toContain('| 店家 | 推薦菜 | 時段 | 參考價 | 週末 | 出口／步行 |');
  expect(body).toContain('### 週末去雙連站，哪些店有開？');
  const response = await request.get('/api/public/content', { params: { path: '/metro/shuanglian' } });
  expect(response.ok()).toBe(true);
  expect((await response.json()).markdown).toBe(body);
});
