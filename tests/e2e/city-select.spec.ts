import { expect, test } from "@playwright/test";
import { getFoodStations, getShanghaiFoodStations } from "../../lib/metro";
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

test("homepage shows Taipei content and a city switch, defaulting to 台北", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByText("看到喜歡的存下")).toBeVisible();
    await expect(page.getByText("先選城市")).toHaveCount(0);
    await expect(page.locator(".map-stage")).toBeVisible();
    await expect(page.locator(".map-stage").getByText("小巨蛋").first()).toBeVisible();
    const taipei = page.locator("nav.top").getByTestId("city-switch-taipei");
    const shanghai = page.locator("nav.top").getByTestId("city-switch-shanghai");
    await expect(page.locator("main").getByTestId("city-switch")).toHaveCount(0);
    await expect(taipei).toHaveAttribute("aria-current", "page");
    await expect(taipei).toHaveAttribute("href", "/");
    await expect(shanghai).not.toHaveAttribute("aria-current", "page");
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
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?lang=en");
  await expect(page.getByText("Save what you love")).toBeVisible();
  await expect(page.getByTestId("city-switch")).toHaveAttribute("aria-label", "City");
  const taipei = page.locator("nav.top").getByTestId("city-switch-taipei");
  const shanghai = page.locator("nav.top").getByTestId("city-switch-shanghai");
  await expect(taipei).toHaveAttribute("aria-current", "page");
  await expect(taipei).toHaveAttribute("href", "/?lang=en");
  await expect(shanghai).toHaveAttribute("href", "/shanghai?lang=en");
  await shanghai.focus();
  await expect(shanghai).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/shanghai\?lang=en$/);
  await expect(page.locator("h1:visible")).toHaveText("Shanghai, one stop at a time");
  await expect(page.getByRole("link", { name: "選城市" })).toHaveCount(0);
  await expect(page.getByTestId("city-switch-shanghai")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("city-switch-taipei")).not.toHaveAttribute("aria-current", "page");
  await page.getByTestId("city-switch-taipei").click();
  await expect(page).toHaveURL(/\/\?lang=en$/);
  await expect(page.getByTestId("city-switch-taipei")).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Save what you love")).toBeVisible();
  await expect(page.locator(".map-stage")).toBeVisible();
});

test("Accept-Language does not redirect the homepage away from Taipei", async ({ request }) => {
  const response = await request.get("/", {
    headers: { Accept: "text/html", "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
  });
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).pathname).toBe("/");
  const html = await response.text();
  expect(html).toContain("看到喜歡的存下");
  expect(html).toContain('data-testid="city-switch-taipei"');
  expect(html).toContain('href="/shanghai"');
  expect(html).toContain('aria-current="page"');
  expect(html).not.toContain("geolocation");
  expect(html).not.toContain('href="/taipei"');
  expect(html).not.toContain("先選城市");
});

test("/taipei permanently redirects to / and keeps the query string", async ({ page, request }) => {
  for (const [from, to] of [
    ["/taipei", "/"],
    ["/taipei/", "/"],
    ["/taipei?lang=en", "/?lang=en"],
    ["/taipei/?lang=en", "/?lang=en"],
    ["/taipei?lang=en&reduce=1", "/?lang=en&reduce=1"],
    ["/taipei.md", "/index.md"],
    ["/taipei.md?lang=en", "/index.md?lang=en"],
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
  expect(new URL(page.url()).pathname).toBe("/");
  expect(new URL(page.url()).searchParams.get("lang")).toBe("en");
  expect(new URL(page.url()).hash).toBe("#x");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/savvy\.jeezlabs\.io\/?$/);
  await expect(page.locator(".map-stage")).toBeVisible();
  await expect(page.getByText("Save what you love")).toBeVisible();
});

test("legacy Taipei metro URLs still serve Taipei, and / is the Taipei map", async ({ request }) => {
  const taipei = getFoodStations();
  for (const slug of LEGACY_SLUGS) expect(taipei.some((station) => station.slug === slug)).toBe(true);
  expect(taipei.some((station) => station.slug === "nangang")).toBe(true);
  expect(taipei.some((station) => station.city !== "taipei" || station.slug.startsWith("shanghai-"))).toBe(false);

  const list = await request.get("/metro");
  expect(list.status()).toBe(200);
  const listHtml = await list.text();
  expect(listHtml).toContain("小巨蛋");
  expect(listHtml).toContain("南港");
  expect(listHtml).not.toContain("豫園");

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
  expect(new URL(city.headers().location ?? "", city.url()).pathname).toBe("/");

  const home = await request.get("/");
  expect(home.status()).toBe(200);
  const homeHtml = await home.text();
  expect(homeHtml).toContain("小巨蛋");
  expect(homeHtml).toContain("南港");
  expect(homeHtml).toContain('id="poster-mapsvg"');
  expect(homeHtml).toMatch(/<link rel="canonical" href="https:\/\/savvy\.jeezlabs\.io\/?"/);
  expect(homeHtml).not.toContain("豫園");
});

test("Shanghai is Chinese-first, with published addresses and no invented prices", async ({ page }) => {
  const stations = getShanghaiFoodStations();
  expect(stations.map((station) => station.slug)).toEqual([
    "shanghai-yuyuan",
    "shanghai-jingan-temple",
    "shanghai-south-huangpi-road",
    "shanghai-jiaotong-university",
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/shanghai");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1:visible")).toHaveText("上海地鐵，一站一站吃");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByTestId("shanghai-pin-shanghai-yuyuan")).toHaveCount(1);
  await expect(page.getByTestId("shanghai-pin-shanghai-jingan-temple")).toHaveCount(1);
  await expect(page.getByTestId("shanghai-pin-shanghai-south-huangpi-road")).toHaveCount(1);
  await expect(page.getByTestId("shanghai-pin-shanghai-jiaotong-university")).toHaveCount(1);
  await expect(page.locator("[data-testid^=shanghai-pin-]")).toHaveCount(stations.length);
  await expect(page.locator(".zh-address")).toHaveCount(stations.reduce((sum, station) => sum + station.shops.length, 0));
  await expect(page.getByText("豫園路87號", { exact: true })).toBeVisible();
  await expect(page.getByText("上海市靜安區愚園路140號", { exact: true })).toBeVisible();
  await expect(page.getByText("上海市黃浦區雁蕩路14號（近淮海中路）", { exact: true })).toBeVisible();
  await expect(page.getByText("光明邨大酒家", { exact: true })).toBeVisible();
  await expect(page.getByText("14元人民幣／碗", { exact: true })).toBeVisible();
  await expect(page.getByText("5元人民幣／只", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Instagram ↗" })).toHaveCount(4);
  await expect(page.getByText("人民幣（¥）")).toBeVisible();
  await expect(page.getByText("南京東路")).toHaveCount(0);
  await expect(page.getByText("價格待確認")).toHaveCount(0);
  await noHorizontalOverflow(page);
  for (const [width, height] of [[1280, 800], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await noHorizontalOverflow(page);
    for (const slug of ["shanghai-yuyuan", "shanghai-jingan-temple", "shanghai-south-huangpi-road"]) {
      const box = (await page.getByTestId(`shanghai-pin-${slug}`).boundingBox())!;
      expect(box.y, slug).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, slug).toBeLessThanOrEqual(height);
    }
  }
});
