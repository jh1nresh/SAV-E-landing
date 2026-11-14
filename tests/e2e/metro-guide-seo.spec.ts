import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const metro = JSON.parse(readFileSync('app/metro/metro.public.json', 'utf8'));
const stations = [...metro.foodStations, ...metro.shanghaiFoodStations];

test('both-city directory and complete guide content work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  try {
    await page.goto('/metro');
    for (const station of stations) await expect(page.locator(`a.guide-card[href="/metro/${station.slug}"]`)).toHaveCount(1);
    await page.locator('a.guide-card[href="/metro/shanghai-south-huangpi-road"]').click();
    await expect(page.locator('h1')).toContainText('美食攻略');
    await expect(page.locator('.food-map-link')).toHaveCount(5);
    await page.locator('.food-quick-index a').nth(1).click();
    const target = page.locator('.food-shops article').nth(1);
    await expect(target).toBeInViewport();
    await expect(target).toBeFocused();
  } finally { await context.close(); }
});

test('all station guides have unique search metadata and matching Markdown facts', async ({ request }) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const station of stations) {
    const response = await request.get(`/metro/${station.slug}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    expect(title).toContain('美食攻略');
    expect(title).toContain(station.city === 'shanghai' ? '上海' : '台北');
    expect(description).toContain(`${station.shops.length}家店`);
    expect(titles.has(title!)).toBe(false);
    expect(descriptions.has(description!)).toBe(false);
    titles.add(title!); descriptions.add(description!);
    const markdown = await request.get(`/metro/${station.slug}.md`);
    expect(markdown.status()).toBe(200);
    const text = await markdown.text();
    for (const shop of station.shops) {
      expect(text).toContain(shop.name);
      if (shop.price) expect(text).toContain(shop.price);
      if (shop.price_source) expect(text).toContain(shop.price_source);
    }
  }
});

for (const width of [320, 390, 1280]) {
  test(`guide navigation and long source links fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const slug of ['shuanglian', 'xiangshan', 'shanghai-south-huangpi-road']) {
      await page.goto(`/metro/${slug}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (slug === 'shuanglian' || slug === 'shanghai-south-huangpi-road') {
        await page.locator('.food-shop-photo img').evaluateAll(async images => {
          await Promise.all(images.map(async image => {
            const photo = image as HTMLImageElement;
            photo.loading = 'eager';
            await photo.decode();
          }));
        });
        mkdirSync('guide-screenshots', { recursive: true });
        await page.screenshot({ path: `guide-screenshots/${slug}-${width}-${test.info().project.name}.png`, fullPage: true });
      }
      await page.locator('.food-quick-index a').last().click();
      await expect(page.locator('.food-shops article').last()).toBeInViewport();
    }
  });
}
