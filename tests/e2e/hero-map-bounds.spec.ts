import { expect, test, type Page } from "@playwright/test";
import metro from "../../app/metro/metro.public.json";

const sizes = [[1280, 800], [1440, 900], [390, 844], [375, 667]];

async function bounds(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const frame = rect("#vp"), card = rect("#card"), title = rect("#cardTitle");
    const body = document.querySelector("#cbody")!;
    return {
      left: card.left - frame.left, top: card.top - frame.top,
      right: frame.right - card.right, bottom: frame.bottom - card.bottom,
      titleInside: title.top >= card.top && title.bottom <= card.bottom && title.left >= card.left && title.right <= card.right,
      overflow: body.scrollWidth > body.clientWidth,
      stamp: getComputedStyle(document.querySelector("#stamp")!).visibility,
    };
  });
}

for (const [width, height] of sizes) {
  test(`N1/N3 ${width}: poster survives hydration and map loads without input`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    // Freeze automatic triggers to inspect the server poster, then release idle.
    await page.addInitScript(() => {
      window.requestIdleCallback = callback => { (window as any).releaseMap = callback; return 1; };
      window.cancelIdleCallback = () => {};
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
    });
    await page.goto("/?lang=en");
    const poster = page.getByTestId("metro-map-slot");
    await expect(poster).toHaveAttribute("role", "img");
    await expect(poster).toHaveAttribute("aria-label", "Taipei MRT food map");
    await expect(poster.locator("#poster-mapsvg")).toBeVisible();
    const before = await page.locator(".map-stage").boundingBox();
    await page.waitForFunction(() => typeof (window as any).releaseMap === "function");
    await page.evaluate(() => (window as any).releaseMap());
    await page.waitForFunction(() => !!window.__savvyMap);
    await expect(poster).toHaveCount(0);
    const after = await page.locator(".map-stage").boundingBox();
    expect(after).toEqual(before);
    await expect(page.locator("#mapsvg")).toBeVisible();
  });

  test(`N1 ${width}: real automatic triggers need no interaction`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.waitForFunction(() => !!window.__savvyMap);
    await expect(page.locator("#mapsvg")).toBeVisible();
    await expect(page.getByTestId("metro-map-slot")).toHaveCount(0);
  });

  test(`N2 ${width}: every shop stays inside the frame`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?reduce=1&clock=2026-10-26");
    await page.waitForFunction(() => !!window.__savvyMap);
    for (const station of metro.stations) {
      await page.evaluate(id => window.__savvyMap!.select(id), station.id);
      await expect(page.locator("#cardTitle")).toContainText(station.name);
      const stores = metro.stores.filter(store => store.stationId === station.id);
      for (let i = 0; i < Math.max(stores.length, 1); i++) {
        if (i) {
          await page.locator(".thumbs button").nth(i).click();
          await expect(page.locator("#fcslot h4")).toHaveText(stores[i].name);
        }
        await expect.poll(() => bounds(page)).toMatchObject({ titleInside: true, overflow: false, stamp: "hidden" });
        await expect.poll(async () => Math.min(...Object.entries(await bounds(page)).filter(([key]) => ["left", "right", "top", "bottom"].includes(key)).map(([, value]) => Number(value)))).toBeGreaterThanOrEqual(10);
        if (width >= 1280 && stores[i]?.sourcePosts.length === 2) {
          const rows = await page.locator("#fcslot .src").evaluateAll(els => els.map(el => el.getBoundingClientRect().top));
          expect(rows[0]).toBe(rows[1]);
        }
      }
      await page.evaluate(() => window.__savvyMap!.closeCard({focus:false}));
      await expect(page.locator("#stamp")).toHaveCSS("visibility", "visible");
    }
  });
}

test("N2 tall content scrolls inside the card", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/?reduce=1");
  await page.waitForFunction(() => !!window.__savvyMap);
  await page.evaluate(() => window.__savvyMap!.select("arena"));
  await page.addStyleTag({content: ".card .fc { min-height: 600px; }"});
  await page.evaluate(() => window.__savvyMap!.applySize());
  expect((await bounds(page)).top).toBeGreaterThanOrEqual(11);
  expect((await bounds(page)).bottom).toBeGreaterThanOrEqual(11);
  expect(await page.locator("#cbody").evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.locator("#cbody").evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await page.locator("#cbody").evaluate(el => el.scrollTop)).toBeGreaterThan(0);
});
