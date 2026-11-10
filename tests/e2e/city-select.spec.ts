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

test("homepage shows Taipei and Shanghai side by side and does not pick a city", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/?lang=en");
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByRole("heading", { name: "Pick a city" })).toBeVisible();
    const taipei = page.getByTestId("city-card-taipei");
    const shanghai = page.getByTestId("city-card-shanghai");
    await expect(taipei).toHaveAttribute("href", "/taipei");
    await expect(shanghai).toHaveAttribute("href", "/shanghai");
    await expect(taipei).toContainText("台北");
    await expect(shanghai).toContainText("上海");
    const taipeiBox = (await taipei.boundingBox())!;
    const shanghaiBox = (await shanghai.boundingBox())!;
    expect(taipeiBox.x + taipeiBox.width).toBeLessThanOrEqual(shanghaiBox.x + 1);
    expect(Math.abs(taipeiBox.width - shanghaiBox.width)).toBeLessThan(2);
    expect(Math.abs(taipeiBox.height - shanghaiBox.height)).toBeLessThan(2);
    expect(Math.abs(taipeiBox.y - shanghaiBox.y)).toBeLessThan(2);
    await noHorizontalOverflow(page);
  }
});

test("Accept-Language does not redirect the homepage to a city", async ({ request }) => {
  const response = await request.get("/", {
    headers: { Accept: "text/html", "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
  });
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).pathname).toBe("/");
  const html = await response.text();
  expect(html).toContain('href="/taipei"');
  expect(html).toContain('href="/shanghai"');
  expect(html).not.toContain("geolocation");
});

test("legacy Taipei URLs still serve Taipei, and /taipei keeps the Taipei map", async ({ request }) => {
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

  const city = await request.get("/taipei");
  expect(city.status()).toBe(200);
  const cityHtml = await city.text();
  expect(cityHtml).toContain("小巨蛋");
  expect(cityHtml).toContain("南港");
  expect(cityHtml).toContain('id="poster-mapsvg"');
  expect(cityHtml).not.toContain("豫園");
});

test("Shanghai is Chinese-first, with published addresses and no invented prices", async ({ page }) => {
  const stations = getShanghaiFoodStations();
  expect(stations.map((station) => station.slug)).toEqual([
    "shanghai-yuyuan",
    "shanghai-jingan-temple",
    "shanghai-south-huangpi-road",
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/shanghai");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1:visible")).toHaveText("上海地鐵，一站一站吃");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByTestId("shanghai-pin-shanghai-yuyuan")).toHaveCount(1);
  await expect(page.getByTestId("shanghai-pin-shanghai-jingan-temple")).toHaveCount(1);
  await expect(page.getByTestId("shanghai-pin-shanghai-south-huangpi-road")).toHaveCount(1);
  await expect(page.locator("[data-testid^=shanghai-pin-]")).toHaveCount(stations.length);
  await expect(page.locator(".zh-address")).toHaveCount(stations.reduce((sum, station) => sum + station.shops.length, 0));
  await expect(page.getByText("豫園路87號")).toBeVisible();
  await expect(page.getByText("愚園路140號")).toBeVisible();
  await expect(page.getByText("雁蕩路14號")).toBeVisible();
  await expect(page.getByText("人民幣（¥）")).toBeVisible();
  await expect(page.getByText("南京東路")).toHaveCount(0);
  await expect(page.getByText("價格待確認")).toHaveCount(0);
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/¥\s*\d/);
  await noHorizontalOverflow(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await noHorizontalOverflow(page);
});
