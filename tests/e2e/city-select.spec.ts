import { expect, test, type Page } from "@playwright/test";
import { getFoodStations, getShanghaiFoodStations, type FoodStation } from "../../lib/metro";
import { noHorizontalOverflow } from "./helpers";

const LEGACY_SLUGS = [
  "xiaojudan",
  "raohe-songshan",
  "shuanglian",
  "dongmen",
  "houshanpi",
  "shilin",
  "gongguan",
  "nanjing-fuxing",
  "zhongxiao-fuxing",
  "ximen",
  "daan",
  "guting",
  "zhongshan",
  "daqiaotou",
  "chiang-kai-shek-memorial-hall",
  "taipei-city-hall",
] as const;

test("homepage shows Taipei content and a city switch, defaulting to 台北", async ({ context }) => {
  for (const width of [390, 1280]) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/discover");
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/discover");
    await expect(page.getByRole("heading", { name: "捷運美食地圖", exact: true })).toBeVisible();
    await expect(page.getByText("先選城市")).toHaveCount(0);
    await expect(page.locator(".map-stage")).toBeVisible();
    await expect(page.locator(".map-stage").getByText("小巨蛋").first()).toBeVisible();
    const taipei = page.locator("nav.top").getByTestId("city-switch-taipei");
    const shanghai = page.locator("nav.top").getByTestId("city-switch-shanghai");
    await expect(page.locator("main").getByTestId("city-switch")).toHaveCount(0);
    await expect(taipei).toHaveAttribute("aria-current", "true");
    await expect(taipei).toHaveAttribute("href", "/discover");
    await expect(shanghai).not.toHaveAttribute("aria-current", "true");
    await expect(shanghai).toHaveAttribute("href", "/shanghai");
    await expect(taipei).toContainText("台北");
    await expect(shanghai).toContainText("上海");
    await expect(page.getByTestId("city-switch")).toHaveAttribute("aria-label", "城市");
    const taipeiBox = (await taipei.boundingBox())!;
    const shanghaiBox = (await shanghai.boundingBox())!;
    expect(taipeiBox.height).toBeGreaterThanOrEqual(44);
    expect(shanghaiBox.height).toBeGreaterThanOrEqual(44);
    expect(taipeiBox.width).toBeGreaterThanOrEqual(width === 390 ? 96 : 72);
    expect(Math.abs(taipeiBox.width - shanghaiBox.width)).toBeLessThan(2);
    expect(Math.abs(taipeiBox.y - shanghaiBox.y)).toBeLessThan(2);
    await noHorizontalOverflow(page);
    await page.close();
  }

  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/discover?lang=en");
  await expect(page.getByRole("heading", { name: "Metro food map", exact: true })).toBeVisible();
  await expect(page.getByTestId("city-switch")).toHaveAttribute("aria-label", "City");
  const taipei = page.locator("nav.top").getByTestId("city-switch-taipei");
  const shanghai = page.locator("nav.top").getByTestId("city-switch-shanghai");
  await expect(taipei).toHaveAttribute("aria-current", "true");
  await expect(taipei).toHaveAttribute("href", "/discover?lang=en");
  await expect(shanghai).toHaveAttribute("href", "/shanghai?lang=en");
  await shanghai.focus();
  await expect(shanghai).toBeFocused();
  await page.keyboard.press("Enter");
  expect(new URL(page.url()).pathname).toBe("/discover");
  expect(new URL(page.url()).searchParams.get("city")).toBe("shanghai");
  await expect(page.locator("h1:visible")).toHaveText("Metro food map");
  await expect(page.locator("#hero .hud.cart b").last()).toHaveText("Shanghai");
  await expect(page.getByRole("link", { name: "選城市" })).toHaveCount(0);
  await expect(page.getByTestId("city-switch-shanghai")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("city-switch-taipei")).not.toHaveAttribute("aria-current", "true");
  await page.getByTestId("city-switch-taipei").click();
  await expect(page).toHaveURL(/\/discover\?lang=en$/);
  await expect(page.getByTestId("city-switch-taipei")).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("heading", { name: "Metro food map", exact: true })).toBeVisible();
  await expect(page.locator(".map-stage")).toBeVisible();
  await page.close();
});

test("Accept-Language does not redirect the homepage away from Taipei", async ({ request }) => {
  const response = await request.get("/discover", {
    headers: { Accept: "text/html", "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
  });
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).pathname).toBe("/discover");
  const html = await response.text();
  expect(html).toContain("捷運美食地圖");
  expect(html).toContain('data-testid="city-switch-taipei"');
  expect(html).toContain('href="/shanghai"');
  expect(html).toContain('aria-current="true"');
  expect(html).not.toContain("geolocation");
  expect(html).not.toContain('href="/taipei"');
  expect(html).not.toContain("先選城市");
});

test("/taipei permanently redirects to /discover and keeps the query string", async ({ page, request }) => {
  for (const [from, to] of [
    ["/taipei", "/discover"],
    ["/taipei/", "/discover"],
    ["/taipei?lang=en", "/discover?lang=en"],
    ["/taipei/?lang=en", "/discover?lang=en"],
    ["/taipei?lang=en&reduce=1", "/discover?lang=en&reduce=1"],
    ["/taipei.md", "/discover.md"],
    ["/taipei.md?lang=en", "/discover.md?lang=en"],
  ] as const) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(301);
    const location = new URL(response.headers().location ?? "", response.url());
    const expected = new URL(to, response.url());
    expect(location.pathname, from).toBe(expected.pathname);
    expect(location.search, from).toBe(expected.search);
  }
  const head = await request.head("/taipei?clock=2026-11-13", { maxRedirects: 0 });
  expect(head.status()).toBe(301);
  expect(new URL(head.headers().location ?? "", head.url()).search).toBe("?clock=2026-11-13");

  await page.goto("/taipei?lang=en#x");
  expect(new URL(page.url()).pathname).toBe("/discover");
  expect(new URL(page.url()).searchParams.get("lang")).toBe("en");
  expect(new URL(page.url()).hash).toBe("#x");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/savvy\.jeezlabs\.io\/discover$/);
  await expect(page.locator(".map-stage")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Metro food map", exact: true })).toBeVisible();
});

test("legacy Taipei station URLs stay intact, the guide index covers both cities, and /discover defaults to Taipei", async ({ request }) => {
  const taipei = getFoodStations();
  for (const slug of LEGACY_SLUGS) expect(taipei.some((station) => station.slug === slug)).toBe(true);
  expect(taipei.some((station) => station.slug === "nangang")).toBe(true);
  expect(taipei.some((station) => station.city !== "taipei" || station.slug.startsWith("shanghai-"))).toBe(false);

  const list = await request.get("/metro");
  expect(list.status()).toBe(200);
  const listHtml = await list.text();
  expect(listHtml).toContain("小巨蛋");
  expect(listHtml).toContain("南港");
  expect(listHtml).toContain('href="/metro/shanghai-yuyuan"');

  for (const station of taipei) {
    const response = await request.get(`/metro/${station.slug}`);
    expect(response.status(), station.slug).toBe(200);
    expect(response.headers().location ?? "", station.slug).toBe("");
    const html = await response.text();
    expect(html, station.slug).toContain(station.station);
    expect(html, station.slug).not.toContain("豫園");
  }

  const stationPage = await request.get("/metro/xiaojudan");
  const stationHtml = await stationPage.text();
  expect(stationHtml).toContain("全部捷運美食清單");
  expect(stationHtml).toContain('href="/metro"');

  const city = await request.get("/taipei", { maxRedirects: 0 });
  expect(city.status()).toBe(301);
  expect(new URL(city.headers().location ?? "", city.url()).pathname).toBe("/discover");

  const home = await request.get("/discover");
  expect(home.status()).toBe(200);
  const homeHtml = await home.text();
  expect(homeHtml).toContain("小巨蛋");
  expect(homeHtml).toContain("南港");
  expect(homeHtml).toContain('id="poster-mapsvg"');
  expect(homeHtml).toMatch(/<link rel="canonical" href="https:\/\/savvy\.jeezlabs\.io\/discover"/);
  expect(homeHtml).not.toContain("豫園");
});

const SHANGHAI_WIDTHS = [390, 1280] as const;

test.describe("Shanghai switches inside the same hero with the shared photo map and cards", () => {
  for (const width of SHANGHAI_WIDTHS) {
    test(`keeps the hero and returns to visible Taipei pins at ${width}`, async ({ page }) => {
      await openShanghaiHero(page, width);
      await noHorizontalOverflow(page);
      await page.getByTestId("city-switch-taipei").click();
      await expect(page.locator("#hero .hero-search-col")).toHaveAttribute("data-city", "taipei");
      await expect(page.locator("#hero")).toHaveAttribute("data-preserved", "yes");
      await expect(page.locator(".pin .hit").first()).toBeVisible();
    });

    for (const station of getShanghaiFoodStations()) {
      test(`opens ${station.slug} and every shop thumb at ${width}`, async ({ page }) => {
        await openShanghaiHero(page, width);
        await expectShanghaiStationCard(page, station);
      });
    }
  }
});

async function openShanghaiHero(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/discover?reduce=1");
  // Wait for hydration before checking same-page city switching.
  await expect(page.getByTestId("station-picker-trigger")).toBeVisible();
  await expect(page.getByTestId("city-switch-shanghai")).toBeVisible();
  await page.locator("#hero").evaluate(el => el.setAttribute("data-preserved", "yes"));
  await page.getByTestId("city-switch-shanghai").click();
  expect(new URL(page.url()).pathname).toBe("/discover");
  await expect(page.locator("#hero")).toHaveAttribute("data-preserved", "yes");
  await expect(page.locator("#hero .hero-search-col")).toHaveAttribute("data-city", "shanghai");
  await expect(page.locator("h1:visible")).toContainText("捷運美食地圖");
  await expect(page.locator("#hero .mapcard").last()).toBeVisible();
  await expect(page.locator(".sh-page, .sh-mapcard")).toHaveCount(0);
  // City switch remounts HeroMapLazy. The pin hit exists only after that live map mounts.
  await expect(page.locator(".pin .hit").first()).toBeVisible();
}

async function expectShanghaiStationCard(page: Page, station: FoodStation) {
  const hit = page.getByTestId(`metro-pin-${station.slug}`).locator(".hit");
  await expect(hit).toBeVisible();
  await hit.click();
  const card = page.getByTestId("metro-card");
  await expect(card).toBeVisible();
  await expect(card.locator("h3")).toHaveText(station.station);
  await expect(card).toContainText(station.shops[0].address!);
  await expect(card).not.toContainText("NT$");
  await expect(card.locator("dt").nth(1)).toHaveText("價格（人民幣）");
  for (const [i, shop] of station.shops.entries()) {
    await card.locator(".thumbs button").nth(i).click();
    await expect(card.locator("h4")).toHaveText(shop.name!);
    await expect(card.locator("dd").nth(0)).toHaveText(shop.address?.trim() || "地址待確認");
    await expect(card.locator("dd").nth(1)).toHaveText(shop.price?.trim() || "");
    const photo = station.images.photos.find(path => path.split("/").at(-1)?.replace(/\.[^.]+$/, "") === shop.key);
    if (photo) await expect(card.locator(".fc img")).toHaveAttribute("src", photo);
  }
  await page.getByTestId("metro-close").click();
  await page.getByTestId("metro-reset").click();
}

test("legacy Shanghai entry, deep links, history and no-JS content retain the station map", async ({ page, browser }) => {
  await page.goto("/shanghai?lang=en&reduce=1#shanghai-yuyuan");
  await expect(page.locator("#hero .hero-search-col")).toHaveAttribute("data-city", "shanghai");
  await expect(page.getByTestId("metro-card").locator("h3")).toHaveText("豫園");
  await expect(page.getByRole("link", { name: "← Food guides" })).toHaveAttribute("href", "/metro#shanghai");
  await page.getByTestId("city-switch-taipei").click();
  await expect(page.locator("#hero .hero-search-col")).toHaveAttribute("data-city", "taipei");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.goBack();
  await expect(page.locator("#hero .hero-search-col")).toHaveAttribute("data-city", "shanghai");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJS = await context.newPage();
  await noJS.goto("/shanghai");
  await expect(noJS.locator("#hero")).toBeVisible();
  await expect(noJS.getByText("豫園路87號", { exact: true })).toBeVisible();
  await context.close();
});
