import { expect, test } from "@playwright/test";
import { getShanghaiFoodStations } from "../../lib/metro";
import { foodShopRows } from "../../lib/metro-logic.mjs";
import { openStation, noHorizontalOverflow } from "./helpers";

for (const width of [320, 390, 1280]) {
  test(`both city cards visibly link to full guides with usable touch targets at ${width}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
    try {
      const page = await context.newPage();
      for (const { city, id, slug, name } of [
        { city: "taipei", id: "arena", slug: "xiaojudan", name: "小巨蛋" },
        { city: "shanghai", id: "shanghai-yuyuan", slug: "shanghai-yuyuan", name: "豫園" },
      ]) {
        await page.goto(`/?city=${city}`);
        await openStation(page, id);
        const link = page.getByTestId(`metro-food-link-${id}`);
        await expect(link).toHaveAccessibleName(`看${name}站完整美食清單`);
        expect(await link.evaluate(el => getComputedStyle(el, "::after").content)).toContain("完整清單");
        await expect.poll(async () => (await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        const target = (await link.boundingBox())!;
        const card = (await page.getByTestId("metro-card").boundingBox())!;
        expect(target.x).toBeGreaterThanOrEqual(card.x);
        expect(target.x + target.width).toBeLessThanOrEqual(card.x + card.width);
        await link.tap();
        await expect(page).toHaveURL(new RegExp(`/metro/${slug}$`));
        await expect(page.locator("h1")).toHaveText(name);
        await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", `https://savvy.jeezlabs.io/metro/${slug}`);
        await noHorizontalOverflow(page);
        if (city === "shanghai") {
          await page.getByRole("link", { name: "← 回到上海地圖" }).click();
          await expect(page.locator("#hero .hero-search-col")).toHaveAttribute("data-city", "shanghai");
        }
      }
    } finally { await context.close(); }
  });
}

test("every published Shanghai guide retains source details and is discoverable", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const station of getShanghaiFoodStations()) {
    const url = `/metro/${station.slug}`;
    expect(sitemap).toContain(`https://savvy.jeezlabs.io${url}`);
    const response = await page.goto(url);
    expect(response!.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText(station.station);
    await expect(page).toHaveTitle(`${station.station}站美食清單｜Savvy`);
    const shops = page.locator(".food-shops article");
    await expect(shops).toHaveCount(station.shops.length);
    for (const [i, shop] of station.shops.entries()) {
      const row = shops.nth(i);
      if (shop.name) await expect(row.locator("h2")).toHaveText(shop.name);
      const expected = foodShopRows(shop, station.city);
      expect(await row.locator("dt").allTextContents()).toEqual(expected.map(([label]) => label));
      expect(await row.locator("dd").allTextContents()).toEqual(expected.map(([, value]) => value));
    }
    expect((await page.locator(".food-posts a").evaluateAll(links => links.map(link => link.getAttribute("href")))).sort())
      .toEqual(Object.values(station.posts).filter(Boolean).sort());
    for (const [path, headers] of [[`${url}.md`, {}], [url, { Accept: "text/markdown" }]] as const) {
      const markdown = await request.get(path, { headers });
      expect(markdown.status()).toBe(200);
      expect(markdown.headers()["content-type"]).toContain("text/markdown");
      const body = await markdown.text();
      expect(body).toContain(`# ${station.station}站美食清單`);
      for (const shop of station.shops) {
        if (shop.name) expect(body).toContain(`## ${shop.name}`);
        for (const [label, value] of foodShopRows(shop, station.city)) expect(body).toContain(`- ${label}: ${value}`);
      }
    }
  }
  expect((await request.get("/metro/shanghai-not-a-published-station")).status()).toBe(404);
});
