import { expect, test } from "@playwright/test";
import guides from "../../data/guides.json";
import { mkdir } from "node:fs/promises";

const origin = "https://sav-e-landing.vercel.app";
const root = "/zh-tw/guides";
const paths = [root, ...guides.map(({ slug }) => `${root}/${slug}`)];

for (const width of [390, 1280]) {
  test(`guides remain readable without JavaScript at ${width}px`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 844 }, baseURL: "http://127.0.0.1:3000" });
    try {
      const page = await context.newPage();
      for (const [index, path] of paths.entries()) {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await expect(page.locator("main")).toHaveAttribute("lang", "zh-Hant");
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}${path}`);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
        await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
        const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth > innerWidth, elements: [...document.querySelectorAll("main *")].filter(el => {
          const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        }).map(el => el.tagName) }));
        expect(overflow).toEqual({ page: false, elements: [] });
        if (index) {
          const guide = guides[index - 1];
          await expect(page).toHaveTitle(guide.title);
          for (const section of guide.sections) await expect(page.getByRole("heading", { name: section.heading, exact: true })).toBeVisible();
          await expect(page.getByRole("link", { name: "查看 Savvy TestFlight 測試版 ↗" })).toHaveAttribute("href", process.env.NEXT_PUBLIC_TESTFLIGHT_URL || "https://testflight.apple.com/join/aSVm9hRJ");
          await expect(page.locator("article")).toContainText("測試版操作參考");
          await expect(page.locator("article")).toContainText("Map Stamp");
          for (const entry of guides.filter(g => g.slug !== guide.slug)) await expect(page.locator(`a[href="${root}/${entry.slug}"]`)).toBeVisible();
        }
        await mkdir("guide-screenshots", { recursive: true });
        await page.screenshot({ path: `guide-screenshots/${testInfo.project.name}-${index}-${width}.png`, fullPage: true });
      }
    } finally { await context.close(); }
  });
}

test("guide links, keyboard navigation and sitemap use only public canonical pages", async ({ page, request }) => {
  await page.goto(root);
  await page.getByRole("link", { name: /整理 IG 餐廳收藏/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${root}/instagram-restaurants-to-map$`));
  await page.getByRole("link", { name: "從一則分享開始", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#step-1$/);
  await page.goto(`${root}/import-google-maps-saves?lang=en`);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.locator("table")).toContainText("CSV");
  await expect(page.locator("table")).toContainText("目前不支援");
  const home = await request.get("/");
  for (const path of paths) expect(await home.text()).toContain(`href="${path}"`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const urls = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]).sort();
  expect(urls).toEqual([`${origin}/`, ...paths.map(path => origin + path)].sort());
  expect(urls.some(url => /\?|token|\/p\/|\/trip\/|\/list|\/r\/|\/u\/|\/my\//.test(url))).toBe(false);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
  for (const path of [`${root}/not-a-guide`, "/does-not-exist", "/p/private-fixture", "/trip/private-fixture", "/.well-known/apple-app-site-association"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
});
