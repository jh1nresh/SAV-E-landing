import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { waitForMap } from './helpers';
const posts = readdirSync('content/threads').map(name => JSON.parse(readFileSync(`content/threads/${name}`, 'utf8')));
const origin = 'https://savvy.jeezlabs.io';

test('all post aliases redirect directly and canonical documents remain discoverable', async ({ request }) => {
  test.setTimeout(180_000);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const index = await (await request.get('/zh-tw/posts')).text();
  const mdIndex = await (await request.get('/zh-tw/posts.md')).text();
  const library = await (await request.get('/trips/library.json')).json();
  for (const post of posts) {
    const canonical = `/zh-tw/posts/${post.slug}`;
    const old = `/zh-tw/posts/${post.code}`;
    for (const suffix of ['', '/', '.md', '.md/']) {
      const response = await request.get(old + suffix + '?from=threads', { maxRedirects: 0 });
      expect(response.status(), old + suffix).toBe(308);
      const location = new URL(response.headers().location, origin);
      expect(location.pathname).toBe(canonical + (suffix.startsWith('.md') ? '.md' : ''));
      expect(location.searchParams.get('from')).toBe('threads');
    }
    const html = await request.get(canonical);
    expect(html.status(), canonical).toBe(200);
    const markup = await html.text();
    expect(markup).toContain(`rel="canonical" href="${origin}${canonical}"`);
    expect(markup).toContain(`"mainEntityOfPage":"${origin}${canonical}"`);
    expect(markup).toContain(post.url);
    const markdown = await request.get(canonical + '.md');
    expect(markdown.status()).toBe(200);
    expect(await markdown.text()).toContain(post.text);
    expect(sitemap).toContain(`<loc>${origin}${canonical}</loc>`);
    expect(sitemap).not.toContain(`<loc>${origin}${old}</loc>`);
    expect(index).toContain(`href="${canonical}"`);
    expect(mdIndex).toContain(`${origin}${canonical}`);
    expect(library.find((item: { source: string }) => item.source === post.url).href).toBe(canonical);
  }
});

test('legacy clients keep Markdown, HEAD and API access without publishing duplicate URLs', async ({ request }) => {
  const old = '/zh-tw/posts/DfwsAORFaeq';
  const canonical = '/zh-tw/posts/taipei-hot-pot-top-10';
  for (const method of ['GET', 'HEAD']) {
    const response = await request.fetch(old, { method, maxRedirects: 0, headers: { Accept: 'text/markdown' } });
    expect(response.status()).toBe(308);
    expect(new URL(response.headers().location, origin).pathname).toBe(canonical);
  }
  const md = await request.get(canonical, { headers: { Accept: 'text/markdown' } });
  expect(md.headers()['content-type']).toContain('text/markdown');
  expect(await md.text()).toContain('台北｜火鍋必吃榜 10 家');
  for (const path of [old, canonical]) {
    const api = await request.get('/api/public/content', { params: { path } });
    expect(api.status()).toBe(200);
    expect((await api.json()).url).toBe(origin + canonical);
  }
  for (const path of ['/zh-tw/posts/not-a-post', '/zh-tw/posts/not-a-post.md']) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test('discover moves to the single metro entry while keeping query state and guide links', async ({ request, page }) => {
  for (const suffix of ['', '/', '.md', '.md/']) {
    const response = await request.get('/discover' + suffix + '?city=shanghai&lang=en&embed=atlas', { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    const url = new URL(response.headers().location, origin);
    expect(url.pathname).toBe(suffix.startsWith('.md') ? '/metro.md' : '/metro');
    expect(url.searchParams.get('city')).toBe('shanghai');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.searchParams.get('embed')).toBe('atlas');
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain('<loc>' + origin + '/discover</loc>');
  expect(sitemap).toContain('<loc>' + origin + '/metro</loc>');
  await page.goto('/metro');
  await waitForMap(page);
  await expect(page.getByTestId('metro-map')).toBeVisible();
  await expect(page.locator('main h1:visible')).toHaveCount(1);
  await expect(page.locator('.metro-directory')).toBeVisible();
  await expect(page.locator('.metro-directory a[href="/metro/shuanglian"]')).toBeVisible();
  await page.getByRole('combobox', { name: '捷運路線', exact: true }).selectOption({ label: '紅線' });
  await expect(page.locator('.metro-directory .guide-card')).not.toHaveCount(0);
  await page.getByTestId('city-switch-shanghai').click();
  await expect(page).toHaveURL(/\/metro\?city=shanghai$/);
  await expect(page.locator('.hero-search-col')).toHaveAttribute('data-city', 'shanghai');
});


test('switching from standalone Shanghai loads the combined metro page and preserves history', async ({ page }) => {
  await page.goto('/shanghai?lang=en');
  await page.getByTestId('city-switch-taipei').click();
  await expect(page).toHaveURL(/\/metro\?lang=en$/);
  await expect(page.locator('.metro-directory')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', origin + '/metro');
  await expect(page.locator('.hero-search-col')).toHaveAttribute('data-city', 'taipei');
  await page.goBack();
  await expect(page).toHaveURL(/\/shanghai\?lang=en$/);
  await expect(page.locator('.hero-search-col')).toHaveAttribute('data-city', 'shanghai');
});
